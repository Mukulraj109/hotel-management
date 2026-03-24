import express from 'express';
import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext, requireTenantInBulkOps } from '../middleware/tenantIsolation.js';
import { validate, schemas } from '../middleware/validation.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: Get rooms with availability
 *     tags: [Rooms]
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         schema:
 *           type: string
 *         description: Hotel ID
 *       - in: query
 *         name: checkIn
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-in date (YYYY-MM-DD)
 *       - in: query
 *         name: checkOut
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-out date (YYYY-MM-DD)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [single, double, suite, deluxe]
 *         description: Room type filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of rooms
 */
router.get('/', authenticate, ensureTenantContext, ensurePropertyAccess, catchAsync(async (req, res) => {
  const {
    hotelId,
    checkIn,
    checkOut,
    type,
    page = 1,
    limit = 10,
    minPrice,
    maxPrice
  } = req.query;

  // Build query - hotelId is now required by ensurePropertyAccess middleware
  const query = { isActive: true };

  if (hotelId) {
    query.hotelId = hotelId;
  } else {
    throw new ApplicationError('Hotel ID is required', 400);
  }
  
  if (type) {
    query.type = type;
  }

  if (minPrice || maxPrice) {
    query.currentRate = {};
    if (minPrice) query.currentRate.$gte = parseFloat(minPrice);
    if (maxPrice) query.currentRate.$lte = parseFloat(maxPrice);
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let rooms;
  let total;
  
  // If dates provided, check availability
  if (checkIn && checkOut) {
    const checkInDate = new Date(checkIn + 'T00:00:00.000Z');
    const checkOutDate = new Date(checkOut + 'T00:00:00.000Z');
    
    if (checkInDate > checkOutDate) {
      throw new ApplicationError('Check-out date must be after check-in date', 400);
    }

    // If no hotelId provided, get the first available hotel
    let targetHotelId = hotelId;
    if (!targetHotelId) {
      const firstRoom = await Room.findOne({ isActive: true }).select('hotelId');
      if (firstRoom) {
        targetHotelId = firstRoom.hotelId;
      } else {
        throw new ApplicationError('No hotels available', 404);
      }
    }

    // For admin requests, show all rooms but mark availability
    if (req.headers['x-admin-request'] || req.user?.role === 'admin') {
      logger.debug('Admin request - showing all rooms with availability status', { targetHotelId });

      // Get all rooms for the hotel
      const allRooms = await Room.find({
        hotelId: targetHotelId,
        isActive: true,
        ...(type && { type })
      }).sort({ roomNumber: 1 });

      logger.debug('Total rooms found for hotel', { count: allRooms.length, hotelId: targetHotelId });

      // Get conflicting bookings for the date range with proper date overlap logic
      const conflictingBookings = await Booking.find({
        hotelId: targetHotelId,
        status: { $in: ['confirmed', 'checked_in'] },
        $and: [
          { checkIn: { $lt: checkOutDate } },
          { checkOut: { $gt: checkInDate } }
        ]
      }).populate('rooms.roomId');

      logger.debug('Conflicting bookings found', { count: conflictingBookings.length });

      // Extract occupied room IDs with better logging
      const occupiedRoomIds = [];
      conflictingBookings.forEach(booking => {
        booking.rooms.forEach(room => {
          if (room.roomId && room.roomId._id) {
            occupiedRoomIds.push(room.roomId._id.toString());
          }
        });
      });

      logger.debug('Occupied room IDs identified', { count: occupiedRoomIds.length });

      // For admin requests, show all rooms but mark availability based on booking conflicts only
      // For walk-in bookings, only check booking conflicts, not room status
      rooms = allRooms.map(room => {
        const isOccupied = occupiedRoomIds.includes(room._id.toString());
        const isAvailable = !isOccupied && (room.status === 'vacant' || room.status === 'dirty');

        return {
          ...room.toObject(),
          isAvailable,
          currentStatus: room.status,
          isOccupiedByBooking: isOccupied
        };
      });

      logger.debug('Rooms processed', { total: rooms.length, available: rooms.filter(r => r.isAvailable).length });
      total = rooms.length;
      
      // Apply pagination
      const startIndex = skip;
      const endIndex = skip + parseInt(limit);
      rooms = rooms.slice(startIndex, endIndex);
      
      // Populate hotel info if rooms exist
      if (rooms.length > 0) {
        rooms = await Room.populate(rooms, { path: 'hotelId', select: 'name address' });
      }
    } else {
      // For regular users, use strict availability filtering
      const availableRooms = await Room.findAvailable(targetHotelId, checkInDate, checkOutDate, type);
      
      logger.debug('Available rooms found', { count: availableRooms.length, hotelId: targetHotelId });
      
      // Apply pagination manually since findAvailable returns results, not a query
      const startIndex = skip;
      const endIndex = skip + parseInt(limit);
      rooms = availableRooms.slice(startIndex, endIndex);
      
      // Set total count
      total = availableRooms.length;
      
      // Populate hotel info if rooms exist
      if (rooms.length > 0) {
        rooms = await Room.populate(rooms, { path: 'hotelId', select: 'name address' });
      }
    }
  } else {
    // For admin requests without dates, use real-time status
    if (hotelId && (req.headers['x-admin-request'] || req.user?.role === 'admin')) {
      const result = await Room.getRoomsWithRealTimeStatus(hotelId, {
        type,
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      rooms = result.rooms;
      total = result.total;
      
      // Populate hotel info
      if (rooms.length > 0) {
        rooms = await Room.populate(rooms, { path: 'hotelId', select: 'name address' });
      }
    } else {
      // Regular query for non-admin requests
      rooms = await Room.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('hotelId', 'name address')
        .sort({ roomNumber: 1 });
        
      total = await Room.countDocuments(query);
    }
  }

  res.json({
    status: 'success',
    results: rooms.length,
    data: {
      rooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// Temporary debug endpoint
router.get('/debug', async (req, res) => {
  try {
    const { hotelId } = req.query;

    // Convert hotelId to ObjectId if provided
    const hotelQuery = hotelId ? { hotelId: new mongoose.Types.ObjectId(hotelId) } : {};
    const baseQuery = { isActive: true, ...hotelQuery };

    // Get total rooms
    const totalRooms = await Room.countDocuments(baseQuery);

    // Get rooms with different statuses
    const statusCounts = await Room.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get all bookings
    const allBookings = await Booking.find({
      ...hotelQuery,
      status: { $in: ['confirmed', 'checked_in'] }
    }).select('status checkIn checkOut rooms.roomId hotelId');

    // Get current date info
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Get current bookings
    const currentBookings = await Booking.find({
      ...hotelQuery,
      status: { $in: ['confirmed', 'checked_in'] },
      checkOut: { $gte: today },
      checkIn: { $lte: tomorrow }
    }).select('status checkIn checkOut rooms.roomId hotelId');
    
    res.json({
      totalRooms,
      statusCounts,
      allBookings: allBookings.length,
      currentBookings: currentBookings.length,
      currentBookingsDetails: currentBookings.map(b => ({
        id: b._id,
        status: b.status,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        roomIds: b.rooms.map(r => r.roomId.toString())
      })),
      today: today.toISOString(),
      tomorrow: tomorrow.toISOString(),
      hotelId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get room metrics for admin dashboard
router.get('/metrics', authenticate, ensureTenantContext, ensurePropertyAccess, catchAsync(async (req, res) => {
  const { hotelId } = req.query;

  if (!hotelId) {
    throw new ApplicationError('Hotel ID is required', 400);
  }

  // Use real-time status calculation instead of static status
  const result = await Room.getRoomsWithRealTimeStatus(hotelId, { limit: 1000 });
  const rooms = result.rooms;

  const totalRooms = rooms.length;
  
  // Count rooms based on computed status (real-time)
  const occupiedRooms = rooms.filter(r => r.computedStatus === 'occupied').length;
  const availableRooms = rooms.filter(r => r.computedStatus === 'vacant').length;
  const maintenanceRooms = rooms.filter(r => r.computedStatus === 'maintenance').length;
  const outOfOrderRooms = rooms.filter(r => r.computedStatus === 'out_of_order').length;
  const dirtyRooms = rooms.filter(r => r.computedStatus === 'dirty').length;

  const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
  const availabilityRate = totalRooms > 0 ? (availableRooms / totalRooms) * 100 : 0;

  res.json({
    status: 'success',
    data: {
      totalRooms,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      outOfOrderRooms,
      dirtyRooms,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      availabilityRate: Math.round(availabilityRate * 100) / 100,
    }
  });
}));

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: Get room by ID
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room details
 */
router.get('/:id', authenticate, ensureTenantContext, ensurePropertyAccess, catchAsync(async (req, res) => {
  const room = await Room.findById(req.params.id)
    .populate('hotelId', 'name address contact policies');

  if (!room || !room.isActive) {
    throw new ApplicationError('Room not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      room
    }
  });
}));

/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       201:
 *         description: Room created successfully
 */
router.post('/',
  authenticate,
  ensureTenantContext,
  authorize('admin', 'staff'),
  ensurePropertyAccess,
  validate(schemas.createRoom),
  catchAsync(async (req, res) => {
    // Mass assignment protection: only allow expected fields
    const { roomNumber, roomName, type, roomType, floor, status, amenities, description, maxOccupancy, baseRate, images, isActive, features } = req.body;
    const hotelId = req.user.hotelId || req.user.hotel;

    const room = await Room.create({
      roomNumber, roomName, type, roomType, floor, status, amenities,
      description, maxOccupancy, baseRate, images, isActive, features,
      hotelId, // Always scope to authenticated user's hotel
    });

    res.status(201).json({
      success: true,
      status: 'success',
      data: {
        room
      }
    });
  })
);

/**
 * @swagger
 * /rooms/{id}:
 *   patch:
 *     summary: Update room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room updated successfully
 */
router.patch('/:id',
  authenticate,
  ensureTenantContext,
  authorize('admin', 'staff'),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!room) {
      throw new ApplicationError('Room not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        room
      }
    });
  })
);

/**
 * @swagger
 * /rooms/{id}:
 *   delete:
 *     summary: Delete room (soft delete)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       204:
 *         description: Room deleted successfully
 */
router.delete('/:id',
  authenticate,
  ensureTenantContext,
  authorize('admin'),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!room) {
      throw new ApplicationError('Room not found', 404);
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  })
);

/**
 * @swagger
 * /rooms/{id}/pricing:
 *   put:
 *     summary: Update room pricing
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               baseRate:
 *                 type: number
 *               currentRate:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Room pricing updated successfully
 */
router.put('/:id/pricing',
  authenticate,
  ensureTenantContext,
  ensurePropertyAccess,
  authorize(['admin', 'manager']),
  catchAsync(async (req, res) => {
    const { baseRate, currentRate, reason } = req.body;
    const roomId = req.params.id;

    const room = await Room.findById(roomId);
    if (!room) {
      throw new ApplicationError('Room not found', 404);
    }

    // Property access already validated by ensurePropertyAccess middleware

    const oldBaseRate = room.baseRate;
    const oldCurrentRate = room.currentRate;

    // Update room rates
    if (baseRate !== undefined) room.baseRate = baseRate;
    if (currentRate !== undefined) room.currentRate = currentRate;

    await room.save();

    // Log the change (you could create a PriceHistory model if needed)
    logger.info('Room pricing updated', { roomNumber: room.roomNumber, oldBaseRate, newBaseRate: room.baseRate, oldCurrentRate, newCurrentRate: room.currentRate, reason });

    res.json({
      status: 'success',
      data: {
        room: {
          _id: room._id,
          roomNumber: room.roomNumber,
          baseRate: room.baseRate,
          currentRate: room.currentRate
        },
        message: 'Room pricing updated successfully'
      }
    });
  })
);

/**
 * @swagger
 * /rooms/{id}/price-history:
 *   get:
 *     summary: Get room price history
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room price history retrieved successfully
 */
router.get('/:id/price-history',
  authenticate,
  ensureTenantContext,
  ensurePropertyAccess,
  authorize(['admin', 'manager', 'staff']),
  catchAsync(async (req, res) => {
    const roomId = req.params.id;

    const room = await Room.findById(roomId);
    if (!room) {
      throw new ApplicationError('Room not found', 404);
    }

    // Property access already validated by ensurePropertyAccess middleware

    // For now, return empty history as we don't have a price history model yet
    // In a full implementation, you'd query a PriceHistory collection
    const mockHistory = [
      {
        date: new Date().toISOString(),
        oldPrice: room.baseRate,
        newPrice: room.currentRate,
        changedBy: 'System',
        reason: 'Initial rate'
      }
    ];

    res.json({
      status: 'success',
      data: mockHistory
    });
  })
);

/**
 * @swagger
 * /rooms/bulk-price-update:
 *   post:
 *     summary: Bulk update room prices
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     roomId:
 *                       type: string
 *                     baseRate:
 *                       type: number
 *                     currentRate:
 *                       type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bulk price update completed
 */
router.post('/bulk-price-update',
  authenticate,
  ensureTenantContext,
  ensurePropertyAccess,
  authorize(['admin', 'manager']),
  requireTenantInBulkOps,
  catchAsync(async (req, res) => {
    const { updates, reason } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ApplicationError('Updates array is required', 400);
    }

    const results = {
      updated: 0,
      errors: []
    };

    for (const update of updates) {
      try {
        const { roomId, baseRate, currentRate } = update;

        const room = await Room.findById(roomId);
        if (!room) {
          results.errors.push({ roomId, error: 'Room not found' });
          continue;
        }

        // Property access already validated by ensurePropertyAccess middleware

        if (baseRate !== undefined) room.baseRate = baseRate;
        if (currentRate !== undefined) room.currentRate = currentRate;

        await room.save();
        results.updated++;

      } catch (error) {
        results.errors.push({ roomId: update.roomId, error: error.message });
      }
    }

    res.json({
      status: 'success',
      data: {
        ...results,
        message: `Updated ${results.updated} rooms successfully`
      }
    });
  })
);

export default router;