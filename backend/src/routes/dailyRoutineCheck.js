import express from 'express';
import mongoose from 'mongoose';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import DailyRoutineCheck from '../models/DailyRoutineCheck.js';
import Room from '../models/Room.js';
import InventoryItem from '../models/InventoryItem.js';
import RoomInventory from '../models/RoomInventory.js';
import DailyRoutineCheckTemplate from '../models/DailyRoutineCheckTemplate.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All routes require authentication and property access
router.use(authenticate);
router.use(ensurePropertyAccess);

/**
 * @swagger
 * /api/v1/daily-routine-check/rooms:
 *   get:
 *     summary: Get rooms that need daily routine check
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, pending, completed, overdue]
 *         description: Filter rooms by check status
 *       - in: query
 *         name: floor
 *         schema:
 *           type: string
 *         description: Filter by floor
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by room type
 *     responses:
 *       200:
 *         description: List of rooms for daily check
 */
router.get('/rooms', authorize('staff', 'admin', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId } = req.user;
  const { filter, floor, type, page = 1, limit = 50 } = req.query;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  logger.debug('Daily Routine Check - Getting rooms', { hotelId, date: today });

  // Build base query for rooms
  let roomQuery = { hotelId: new mongoose.Types.ObjectId(hotelId), isActive: true };
  if (floor) roomQuery.floor = floor;
  if (type) roomQuery.type = type;

  // Get all rooms for the hotel
  const rooms = await Room.find(roomQuery).select('roomNumber type floor status').lean().limit(1000);
  
  // Get today's checks for these rooms
  const todayChecks = await DailyRoutineCheck.find({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    checkDate: { $gte: today, $lt: tomorrow }
  }).select('roomId status checkedAt').lean().limit(1000);

  // Create a map of room checks
  const roomCheckMap = new Map();
  todayChecks.forEach(check => {
    roomCheckMap.set(check.roomId.toString(), check);
  });

  // Prepare room data with check status
  const roomsWithStatus = rooms.map(room => {
    const check = roomCheckMap.get(room._id.toString());
    let checkStatus = 'pending';
    let lastChecked = null;

    if (check) {
      checkStatus = check.status;
      lastChecked = check.checkedAt;
    }

    // Determine if overdue (no check for more than 1 day)
    if (!check) {
      const lastCheck = roomCheckMap.get(room._id.toString());
      if (!lastCheck) {
        checkStatus = 'overdue';
      }
    }

    return {
      _id: room._id,
      roomNumber: room.roomNumber,
      type: room.type,
      floor: room.floor,
      checkStatus,
      lastChecked,
      estimatedDuration: 15 // Default 15 minutes per room
    };
  });

  // Apply filter
  let filteredRooms = roomsWithStatus;
  if (filter && filter !== 'all') {
    filteredRooms = roomsWithStatus.filter(room => room.checkStatus === filter);
  }

  // Apply pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const paginatedRooms = filteredRooms.slice(skip, skip + parseInt(limit));

  // Batch-fetch all templates and inventories to avoid N+1 queries
  const uniqueRoomTypes = [...new Set(paginatedRooms.map(r => r.type).filter(Boolean))];
  const roomIdsForInventory = paginatedRooms.map(r => r._id).filter(Boolean);

  const [allTemplates, allInventories] = await Promise.all([
    DailyRoutineCheckTemplate.find({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      roomType: { $in: uniqueRoomTypes }
    }).lean().limit(1000),
    RoomInventory.find({
      roomId: { $in: roomIdsForInventory },
      isActive: true
    }).lean().limit(1000)
  ]);

  const templatesByType = new Map(allTemplates.map(t => [t.roomType, t]));
  const inventoryByRoomId = new Map(allInventories.map(inv => [inv.roomId.toString(), inv]));

  // Build inventory data for each room using pre-fetched data
  const roomsWithInventory = paginatedRooms.map((room) => {
    try {
      const template = templatesByType.get(room.type);

      if (!template) {
        logger.debug('No template found for room', { roomNumber: room.roomNumber, type: room.type });
        return {
          ...room,
          fixedInventory: [],
          dailyInventory: []
        };
      }

      logger.debug('Found template for room', { roomNumber: room.roomNumber, fixedItems: template.fixedInventory.length, dailyItems: template.dailyInventory.length });

      const currentInventory = room._id ? inventoryByRoomId.get(room._id.toString()) : null;

      // Prepare fixed inventory (permanent items)
      const fixedInventory = template.fixedInventory.map(item => ({
        _id: item._id,
        name: item.name,
        category: item.category,
        description: item.description || `${item.name} for ${room.type} room`,
        unitPrice: item.unitPrice || 0,
        quantity: 1,
        status: 'working' // Default status
      }));

      // Prepare daily inventory (consumable items)
      const dailyInventory = template.dailyInventory.map(item => ({
        _id: item._id,
        name: item.name,
        category: item.category,
        description: item.description || `${item.name} for daily use`,
        unitPrice: item.unitPrice || 0,
        quantity: item.standardQuantity || 1,
        status: 'available' // Default status
      }));

      return {
        ...room,
        fixedInventory,
        dailyInventory
      };
    } catch (error) {
      logger.error('Error getting inventory for room', { roomNumber: room.roomNumber, type: room.type, hotelId, error: error.message });
      return {
          ...room,
          fixedInventory: [],
          dailyInventory: []
        };
      }
    });

  res.status(200).json({
    status: 'success',
    data: {
      rooms: roomsWithInventory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredRooms.length,
        pages: Math.ceil(filteredRooms.length / parseInt(limit))
      }
    }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/rooms/{roomId}/inventory:
 *   get:
 *     summary: Get detailed inventory for a specific room
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room inventory details
 */
router.get('/rooms/:roomId/inventory', authorize('staff', 'admin', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId } = req.user;
  const { roomId } = req.params;

  // Verify room exists and belongs to hotel
  const room = await Room.findOne({
    _id: roomId,
    hotelId: new mongoose.Types.ObjectId(hotelId)
  }).lean();

  if (!room) {
    throw new ApplicationError('Room not found', 404);
  }

  // Get room inventory template
  const template = await DailyRoutineCheckTemplate.findOne({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    roomType: room.type
  }).lean();

  if (!template) {
    throw new ApplicationError('No inventory template found for this room type', 404);
  }

  // Get current room inventory status
  const currentInventory = await RoomInventory.findOne({
    roomId: new mongoose.Types.ObjectId(roomId),
    isActive: true
  }).lean();

  // Prepare inventory data
  const fixedInventory = template.fixedInventory.map(item => ({
    _id: item._id,
    name: item.name,
    category: item.category,
    description: item.description || `${item.name} for ${room.type} room`,
    unitPrice: item.unitPrice || 0,
    quantity: 1,
    status: 'working'
  }));

  const dailyInventory = template.dailyInventory.map(item => ({
    _id: item._id,
    name: item.name,
    category: item.category,
    description: item.description || `${item.name} for daily use`,
    unitPrice: item.unitPrice || 0,
    quantity: item.standardQuantity || 1,
    status: 'available'
  }));

  res.status(200).json({
    status: 'success',
    data: {
      _id: room._id,
      roomNumber: room.roomNumber,
      type: room.type,
      floor: room.floor,
      checkStatus: 'pending',
      lastChecked: null,
      fixedInventory,
      dailyInventory,
      estimatedDuration: 15
    }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/rooms/{roomId}/complete:
 *   post:
 *     summary: Complete daily routine check for a room
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cart:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     action:
 *                       type: string
 *                       enum: [replace, add, laundry, reuse]
 *                     quantity:
 *                       type: number
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Daily check completed successfully
 */
router.post('/rooms/:roomId/complete', authorize('staff', 'admin', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId, _id: checkedBy } = req.user;
  const { roomId } = req.params;
  const { cart, notes } = req.body;

  logger.debug('Completing daily check for room', { roomId, checkedBy });

  // Verify room exists and belongs to hotel
  const room = await Room.findOne({
    _id: roomId,
    hotelId: new mongoose.Types.ObjectId(hotelId)
  }).lean();

  if (!room) {
    throw new ApplicationError('Room not found', 404);
  }

  // Check if already completed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Validate category-action combinations before processing
  const validateCategoryActionCombination = (category, action) => {
    // All items can be added or reused
    if (action === 'add' || action === 'reuse' || action === 'replace') {
      return true;
    }

    // Only bedroom and bathroom items can go to laundry
    if (action === 'laundry') {
      const laundryCategories = ['bedroom', 'bathroom'];
      return laundryCategories.includes(category.toLowerCase());
    }

    return false;
  };

  // Process cart items with validation
  let processedItems = [];
  if (cart && cart.length > 0) {
    // Validate all items first
    const invalidItems = cart.filter(cartItem =>
      !validateCategoryActionCombination(cartItem.category, cartItem.action)
    );

    if (invalidItems.length > 0) {
      const invalidItemsDetails = invalidItems.map(item =>
        `${item.itemName} (${item.category}) cannot have action: ${item.action}`
      ).join(', ');
      throw new ApplicationError(`Invalid category-action combinations: ${invalidItemsDetails}`, 400);
    }

    processedItems = cart.map(cartItem => ({
      itemId: new mongoose.Types.ObjectId(cartItem.itemId),
      itemName: cartItem.itemName,
      category: cartItem.category,
      inventoryType: cartItem.inventoryType || 'daily',
      action: cartItem.action,
      quantity: cartItem.quantity || 1,
      unitPrice: cartItem.unitPrice || 0,
      totalPrice: (cartItem.unitPrice || 0) * (cartItem.quantity || 1),
      notes: cartItem.notes,
      status: cartItem.action === 'reuse' ? 'working' : 'needs_cleaning'
    }));
  }

  const completionData = {
    status: 'completed',
    completedAt: new Date(),
    notes,
    items: processedItems
  };

  // Atomically upsert: update existing non-completed check or create new one
  const dailyCheck = await DailyRoutineCheck.findOneAndUpdate(
    {
      roomId: new mongoose.Types.ObjectId(roomId),
      hotelId: new mongoose.Types.ObjectId(hotelId),
      checkDate: { $gte: today, $lt: tomorrow },
      status: { $ne: 'completed' }
    },
    { $set: completionData },
    { new: true }
  );

  let resultCheck;
  if (dailyCheck) {
    resultCheck = dailyCheck;
  } else {
    // Check if already completed
    const alreadyCompleted = await DailyRoutineCheck.findOne({
      roomId: new mongoose.Types.ObjectId(roomId),
      hotelId: new mongoose.Types.ObjectId(hotelId),
      checkDate: { $gte: today, $lt: tomorrow },
      status: 'completed'
    }).lean();

    if (alreadyCompleted) {
      throw new ApplicationError('Daily check already completed for this room today', 400);
    }

    // No existing check -- create a new one
    const newCheck = new DailyRoutineCheck({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      roomId: new mongoose.Types.ObjectId(roomId),
      checkedBy: new mongoose.Types.ObjectId(checkedBy),
      checkDate: today,
      ...completionData
    });
    await newCheck.save();
    resultCheck = newCheck;
  }

  // Calculate quality score
  await resultCheck.calculateQualityScore();

  // Update Room status to 'vacant' (clean) after daily check completion
  try {
    const Room = (await import('../models/Room.js')).default;
    await Room.findByIdAndUpdate(roomId, { status: 'vacant', lastCleaned: new Date() }, { new: true });
    logger.debug('Room status updated to vacant after daily check', { roomId });
  } catch (roomErr) {
    logger.warn('Failed to update room status after daily check', { roomId, error: roomErr.message });
  }

  // Create follow-up tasks if needed
  if (cart && cart.some(item => item.action === 'replace' || item.action === 'add')) {
    // Create maintenance or inventory tasks as needed
    logger.debug('Creating follow-up tasks for room', { roomId });
  }

  res.status(200).json({
    status: 'success',
    data: {
      roomId: resultCheck.roomId,
      checkedBy: resultCheck.checkedBy,
      checkedAt: resultCheck.checkedAt,
      items: resultCheck.items,
      totalCost: resultCheck.totalCost,
      status: resultCheck.status,
      qualityScore: resultCheck.qualityScore
    }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/summary:
 *   get:
 *     summary: Get daily check summary for staff dashboard
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily check summary
 */
router.get('/summary', authorize('staff', 'admin', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId } = req.user;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get total rooms
  const totalRooms = await Room.countDocuments({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    isActive: true
  });

  // Get today's checks
  const todayChecks = await DailyRoutineCheck.find({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    checkDate: { $gte: today, $lt: tomorrow }
  }).lean().limit(1000);

  const pendingChecks = totalRooms - todayChecks.length;
  const completedToday = todayChecks.filter(check => check.status === 'completed').length;
  const overdueChecks = 0; // Calculate based on rooms not checked for multiple days

  // Estimate time remaining (15 minutes per room)
  const estimatedTimeRemaining = pendingChecks * 15;

  res.status(200).json({
    status: 'success',
    data: {
      totalRooms,
      pendingChecks,
      completedToday,
      overdueChecks,
      estimatedTimeRemaining
    }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/my-assignments:
 *   get:
 *     summary: Get staff member's assigned rooms for today
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assigned rooms for today
 */
router.get('/my-assignments', authorize('staff', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId, _id: staffId } = req.user;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get rooms assigned to this staff member today
  const assignedChecks = await DailyRoutineCheck.find({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    checkedBy: new mongoose.Types.ObjectId(staffId),
    checkDate: { $gte: today, $lt: tomorrow }
  }).populate('roomId', 'roomNumber type floor').lean().limit(1000);

  const rooms = assignedChecks.map(check => ({
    _id: check.roomId._id,
    roomNumber: check.roomId.roomNumber,
    type: check.roomId.type,
    floor: check.roomId.floor,
    checkStatus: check.status,
    lastChecked: check.checkedAt,
    estimatedDuration: check.estimatedDuration || 15
  }));

  res.status(200).json({
    status: 'success',
    data: { rooms }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/rooms/{roomId}/mark-checked:
 *   post:
 *     summary: Mark room as checked without detailed inventory
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional notes about the check
 *     responses:
 *       200:
 *         description: Room marked as checked
 */
router.post('/rooms/:roomId/mark-checked', authorize('staff', 'admin', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId, _id: checkedBy } = req.user;
  const { roomId } = req.params;
  const { notes } = req.body;

  // Verify room exists and belongs to hotel
  const room = await Room.findOne({
    _id: roomId,
    hotelId: new mongoose.Types.ObjectId(hotelId)
  }).lean();

  if (!room) {
    throw new ApplicationError('Room not found', 404);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedAt = new Date();

  // Atomically upsert daily check
  const dailyCheck = await DailyRoutineCheck.findOneAndUpdate(
    {
      roomId: new mongoose.Types.ObjectId(roomId),
      hotelId: new mongoose.Types.ObjectId(hotelId),
      checkDate: today
    },
    {
      $set: {
        status: 'completed',
        completedAt,
        notes: notes || 'Quick check completed',
        checkedBy: new mongoose.Types.ObjectId(checkedBy)
      },
      $setOnInsert: {
        hotelId: new mongoose.Types.ObjectId(hotelId),
        roomId: new mongoose.Types.ObjectId(roomId),
        checkDate: today
      }
    },
    { new: true, upsert: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      message: `Room ${room.roomNumber} marked as checked`,
      roomId: dailyCheck.roomId,
      checkedAt: dailyCheck.checkedAt || completedAt
    }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/assign:
 *   post:
 *     summary: Assign daily checks to staff members
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     roomId:
 *                       type: string
 *                     staffId:
 *                       type: string
 *     responses:
 *       200:
 *         description: Assignments created successfully
 */
router.post('/assign', authorize('admin', 'manager', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId } = req.user;
  const { assignments } = req.body;

  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    throw new ApplicationError('Assignments array is required', 400);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  logger.debug('Creating daily check assignments', { count: assignments.length });

  const createdAssignments = [];
  const errors = [];

  // Batch-fetch all rooms and existing checks upfront to avoid N+1 queries
  const assignmentRoomIds = assignments.map(a => a.roomId).filter(Boolean);
  const [batchRooms, batchExistingChecks] = await Promise.all([
    Room.find({
      _id: { $in: assignmentRoomIds },
      hotelId: new mongoose.Types.ObjectId(hotelId)
    }).lean().limit(1000),
    DailyRoutineCheck.find({
      roomId: { $in: assignmentRoomIds.map(id => new mongoose.Types.ObjectId(id)) },
      hotelId: new mongoose.Types.ObjectId(hotelId),
      checkDate: { $gte: today, $lt: tomorrow }
    }).limit(1000)
  ]);
  const roomsMap = new Map(batchRooms.map(r => [r._id.toString(), r]));
  const existingChecksMap = new Map(batchExistingChecks.map(c => [c.roomId.toString(), c]));

  for (const assignment of assignments) {
    try {
      const { roomId, staffId } = assignment;

      // Verify room exists and belongs to hotel (using pre-fetched map)
      const room = roomsMap.get(roomId.toString ? roomId.toString() : roomId);

      if (!room) {
        errors.push(`Room ${roomId} not found`);
        continue;
      }

      // Check if assignment already exists for today (using pre-fetched map)
      const existingCheck = existingChecksMap.get(roomId.toString ? roomId.toString() : roomId);

      if (existingCheck) {
        // Update existing assignment atomically
        const updated = await DailyRoutineCheck.findByIdAndUpdate(
          existingCheck._id,
          { $set: { checkedBy: new mongoose.Types.ObjectId(staffId) } },
          { new: true }
        );
        createdAssignments.push(updated);
        logger.debug('Updated existing assignment for room', { roomNumber: room.roomNumber });
      } else {
        // Create new assignment
        const newCheck = new DailyRoutineCheck({
          hotelId: new mongoose.Types.ObjectId(hotelId),
          roomId: new mongoose.Types.ObjectId(roomId),
          checkedBy: new mongoose.Types.ObjectId(staffId),
          checkDate: today,
          status: 'pending'
        });

        await newCheck.save();
        createdAssignments.push(newCheck);
        logger.debug('Created new assignment for room', { roomNumber: room.roomNumber });
      }
    } catch (error) {
      logger.error('Error assigning room', { roomId: assignment.roomId, error: error.message });
      errors.push(`Failed to assign room ${assignment.roomId}: ${error.message}`);
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      message: `Successfully assigned ${createdAssignments.length} rooms`,
      assignmentsCreated: createdAssignments.length,
      errors: errors.length > 0 ? errors : undefined
    }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/templates:
 *   get:
 *     summary: Get all inventory templates for room types
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of inventory templates
 */
router.get('/templates', authorize('admin', 'manager', 'staff', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId } = req.user;

  const templates = await DailyRoutineCheckTemplate.find({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    isActive: true
  }).sort({ roomType: 1 }).lean().limit(1000);

  res.status(200).json({
    status: 'success',
    data: {
      templates: templates.map(template => ({
        roomType: template.roomType,
        fixedInventory: template.fixedInventory,
        dailyInventory: template.dailyInventory,
        estimatedCheckDuration: template.estimatedCheckDuration
      }))
    }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/templates:
 *   post:
 *     summary: Create new inventory template for a room type
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomType
 *               - fixedInventory
 *               - dailyInventory
 *             properties:
 *               roomType:
 *                 type: string
 *                 enum: [single, double, suite, deluxe]
 *               fixedInventory:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     category:
 *                       type: string
 *                       enum: [electronics, furniture, appliances, fixtures, other]
 *                     description:
 *                       type: string
 *                     unitPrice:
 *                       type: number
 *                     standardQuantity:
 *                       type: number
 *                     checkInstructions:
 *                       type: string
 *                     expectedCondition:
 *                       type: string
 *                       enum: [working, clean, undamaged, functional]
 *               dailyInventory:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     category:
 *                       type: string
 *                       enum: [bathroom, bedroom, kitchen, amenities, other]
 *                     description:
 *                       type: string
 *                     unitPrice:
 *                       type: number
 *                     standardQuantity:
 *                       type: number
 *                     checkInstructions:
 *                       type: string
 *                     expectedCondition:
 *                       type: string
 *                       enum: [clean, fresh, undamaged, adequate]
 *               estimatedCheckDuration:
 *                 type: number
 *                 default: 15
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Template already exists for this room type
 */
router.post('/templates', authorize('admin', 'manager', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId, _id: createdBy } = req.user;
  const { roomType, fixedInventory, dailyInventory, estimatedCheckDuration } = req.body;

  // Validate required fields
  if (!roomType || !fixedInventory || !dailyInventory) {
    throw new ApplicationError('Room type, fixed inventory, and daily inventory are required', 400);
  }

  // Check if template already exists
  const existingTemplate = await DailyRoutineCheckTemplate.findOne({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    roomType: roomType,
    isActive: true
  }).lean();

  if (existingTemplate) {
    throw new ApplicationError(`Template already exists for ${roomType} rooms`, 400);
  }

  // Validate inventory items
  const validateInventoryItem = (item, type) => {
    if (!item.name || !item.category) {
      throw new ApplicationError(`${type} inventory item must have name and category`, 400);
    }
  };

  fixedInventory.forEach(item => validateInventoryItem(item, 'Fixed'));
  dailyInventory.forEach(item => validateInventoryItem(item, 'Daily'));

  // Create new template
  const newTemplate = new DailyRoutineCheckTemplate({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    roomType: roomType,
    fixedInventory: fixedInventory.map(item => ({
      name: item.name,
      category: item.category,
      description: item.description || '',
      unitPrice: item.unitPrice || 0,
      standardQuantity: item.standardQuantity || 1,
      checkInstructions: item.checkInstructions || '',
      expectedCondition: item.expectedCondition || 'working'
    })),
    dailyInventory: dailyInventory.map(item => ({
      name: item.name,
      category: item.category,
      description: item.description || '',
      unitPrice: item.unitPrice || 0,
      standardQuantity: item.standardQuantity || 1,
      checkInstructions: item.checkInstructions || '',
      expectedCondition: item.expectedCondition || 'clean'
    })),
    estimatedCheckDuration: estimatedCheckDuration || 15,
    createdBy: new mongoose.Types.ObjectId(createdBy),
    lastUpdatedBy: new mongoose.Types.ObjectId(createdBy),
    isActive: true
  });

  await newTemplate.save();

  res.status(201).json({
    status: 'success',
    data: {
      message: `Template for ${roomType} rooms created successfully`,
      template: newTemplate
    }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/templates/{roomType}:
 *   put:
 *     summary: Update inventory template for a room type
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomType
 *         required: true
 *         schema:
 *           type: string
 *         description: Room type to update template for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fixedInventory:
 *                 type: array
 *               dailyInventory:
 *                 type: array
 *               estimatedCheckDuration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Template updated successfully
 */
router.put('/templates/:roomType', authorize('admin', 'manager', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId, _id: updatedBy } = req.user;
  const { roomType } = req.params;
  const { fixedInventory, dailyInventory, estimatedCheckDuration } = req.body;

  // Validate inventory items if provided
  if (fixedInventory) {
    fixedInventory.forEach(item => {
      if (!item.name || !item.category) {
        throw new ApplicationError('Fixed inventory item must have name and category', 400);
      }
    });
  }

  if (dailyInventory) {
    dailyInventory.forEach(item => {
      if (!item.name || !item.category) {
        throw new ApplicationError('Daily inventory item must have name and category', 400);
      }
    });
  }

  const updateData = {
    lastUpdatedBy: new mongoose.Types.ObjectId(updatedBy)
  };

  if (fixedInventory) updateData.fixedInventory = fixedInventory;
  if (dailyInventory) updateData.dailyInventory = dailyInventory;
  if (estimatedCheckDuration) updateData.estimatedCheckDuration = estimatedCheckDuration;

  const template = await DailyRoutineCheckTemplate.findOneAndUpdate(
    {
      hotelId: new mongoose.Types.ObjectId(hotelId),
      roomType: roomType,
      isActive: true
    },
    updateData,
    { new: true }
  );

  if (!template) {
    throw new ApplicationError('Template not found for this room type', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      message: `Template for ${roomType} rooms updated successfully`,
      template
    }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/templates/{roomType}:
 *   delete:
 *     summary: Delete inventory template for a room type
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomType
 *         required: true
 *         schema:
 *           type: string
 *         description: Room type to delete template for
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       404:
 *         description: Template not found
 */
router.delete('/templates/:roomType', authorize('admin', 'manager', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId, _id: updatedBy } = req.user;
  const { roomType } = req.params;

  const template = await DailyRoutineCheckTemplate.findOneAndUpdate(
    {
      hotelId: new mongoose.Types.ObjectId(hotelId),
      roomType: roomType,
      isActive: true
    },
    {
      isActive: false,
      lastUpdatedBy: new mongoose.Types.ObjectId(updatedBy)
    },
    { new: true }
  );

  if (!template) {
    throw new ApplicationError('Template not found for this room type', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      message: `Template for ${roomType} rooms deleted successfully`
    }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/admin/overview:
 *   get:
 *     summary: Get admin overview of daily checks
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin overview data
 */
router.get('/admin/overview', authorize('admin', 'manager', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId } = req.user;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get total rooms
  const totalRooms = await Room.countDocuments({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    isActive: true
  });

  // Get today's checks with staff details
  const todayChecks = await DailyRoutineCheck.find({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    checkDate: { $gte: today, $lt: tomorrow }
  }).populate('checkedBy', 'name email')
    .populate('roomId', 'roomNumber type floor').lean().limit(1000);

  // Get staff assignment summary
  const assignmentSummary = {};
  todayChecks.forEach(check => {
    const staffId = check.checkedBy._id.toString();
    if (!assignmentSummary[staffId]) {
      assignmentSummary[staffId] = {
        staff: check.checkedBy,
        totalAssigned: 0,
        completed: 0,
        pending: 0,
        rooms: []
      };
    }
    assignmentSummary[staffId].totalAssigned++;
    if (check.status === 'completed') {
      assignmentSummary[staffId].completed++;
    } else {
      assignmentSummary[staffId].pending++;
    }
    assignmentSummary[staffId].rooms.push({
      roomNumber: check.roomId.roomNumber,
      type: check.roomId.type,
      status: check.status,
      checkedAt: check.checkedAt
    });
  });

  const pendingChecks = totalRooms - todayChecks.length;
  const completedToday = todayChecks.filter(check => check.status === 'completed').length;
  const overdueChecks = todayChecks.filter(check => check.status === 'overdue').length;

  res.status(200).json({
    status: 'success',
    data: {
      totalRooms,
      assignedRooms: todayChecks.length,
      pendingChecks,
      completedToday,
      overdueChecks,
      assignmentSummary: Object.values(assignmentSummary),
      unassignedRooms: pendingChecks
    }
  });
}));

/**
 * @swagger
 * /api/v1/daily-routine-check/admin/unassigned-rooms:
 *   get:
 *     summary: Get unassigned rooms for today
 *     tags: [Daily Routine Check]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unassigned rooms
 */
router.get('/admin/unassigned-rooms', authorize('admin', 'manager', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId } = req.user;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get all active rooms
  const allRooms = await Room.find({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    isActive: true
  }).lean().limit(1000);

  // Get rooms that have daily check assignments for today
  const assignedRoomIds = await DailyRoutineCheck.find({
    hotelId: new mongoose.Types.ObjectId(hotelId),
    checkDate: { $gte: today, $lt: tomorrow }
  }).distinct('roomId').lean().limit(1000);

  // Filter out assigned rooms to get unassigned ones
  const unassignedRooms = allRooms.filter(room =>
    !assignedRoomIds.some(assignedId => assignedId.equals(room._id))
  );

  res.status(200).json({
    status: 'success',
    data: {
      rooms: unassignedRooms,
      count: unassignedRooms.length
    }
  });
}));

export default router;
