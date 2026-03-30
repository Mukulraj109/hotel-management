import express from 'express';
import mongoose from 'mongoose';
import Housekeeping from '../models/Housekeeping.js';
import Room from '../models/Room.js';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import logger from '../utils/logger.js';
import { validateStatusTransition, HOUSEKEEPING_TRANSITIONS } from '../utils/statusTransitions.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { validate } from '../middleware/validation.js';
import websocketService from '../services/websocketService.js';
import Joi from 'joi';

const router = express.Router();

const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  roomId: Joi.string().required(),
  taskType: Joi.string().valid('cleaning', 'maintenance', 'inspection', 'deep_clean', 'checkout_clean').required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  description: Joi.string().max(1000).allow('', null).optional(),
  notes: Joi.string().max(1000).allow('', null).optional(),
  assignedToUserId: Joi.string().allow(null).optional(),
  assignedTo: Joi.string().allow(null).optional(),
  estimatedDuration: Joi.number().integer().min(1).max(480).optional(),
  status: Joi.string().valid('pending', 'assigned', 'in_progress', 'completed', 'inspected', 'cancelled').optional()
}).unknown(true);

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  roomId: Joi.string().optional(),
  taskType: Joi.string().valid('cleaning', 'maintenance', 'inspection', 'deep_clean', 'checkout_clean').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  description: Joi.string().max(1000).allow('', null).optional(),
  notes: Joi.string().max(1000).allow('', null).optional(),
  assignedToUserId: Joi.string().allow(null).optional(),
  assignedTo: Joi.string().allow(null).optional(),
  estimatedDuration: Joi.number().integer().min(1).max(480).optional(),
  status: Joi.string().valid('pending', 'assigned', 'in_progress', 'completed', 'inspected', 'cancelled').optional(),
  startedAt: Joi.date().allow(null).optional(),
  completedAt: Joi.date().allow(null).optional(),
  roomStatus: Joi.string().valid('dirty', 'clean', 'inspected', 'maintenance_required').optional()
}).unknown(true);

const inspectTaskSchema = Joi.object({
  passed: Joi.boolean().required(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  notes: Joi.string().max(1000).allow('', null).optional(),
  failureReasons: Joi.array().items(Joi.object({
    category: Joi.string().valid('cleanliness', 'amenities', 'damage', 'safety', 'other').optional(),
    description: Joi.string().optional(),
    severity: Joi.string().valid('minor', 'major', 'critical').optional()
  })).optional(),
  qaChecklist: Joi.array().items(Joi.object({
    item: Joi.string().optional(),
    passed: Joi.boolean().optional(),
    notes: Joi.string().allow('', null).optional()
  })).optional()
}).unknown(true);

// Get housekeeping tasks
router.get('/', authenticate, ensureTenantContext, authorizePolicy('housekeeping', 'staffAccess'), ensurePropertyAccess, catchAsync(async (req, res) => {
  const {
    status,
    roomId,
    assignedToUserId,
    taskType,
    priority,
    search,
    createdDateFrom,
    createdDateTo,
    completedDateFrom,
    completedDateTo,
    estimatedDurationMin,
    estimatedDurationMax,
    page = 1,
    limit = 10
  } = req.query;

  const hotelId = req.user.hotelId;
  if (!hotelId) {
    throw new ApplicationError('Hotel context is required', 403);
  }

  const query = { hotelId };

  if (status) query.status = status;
  if (roomId) query.roomId = roomId;
  if (taskType) query.taskType = taskType;
  if (priority) query.priority = priority;

  // Build $and conditions to safely combine $or clauses
  const andConditions = [];

  if (assignedToUserId) {
    if (assignedToUserId === 'unassigned') {
      andConditions.push({
        $or: [
          { assignedToUserId: { $exists: false } },
          { assignedToUserId: null },
          { assignedTo: { $exists: false } },
          { assignedTo: null }
        ]
      });
    } else {
      // Check both field names for backward compatibility
      andConditions.push({
        $or: [
          { assignedToUserId: assignedToUserId },
          { assignedTo: assignedToUserId }
        ]
      });
    }
  }

  if (search) {
    const escapedSearch = escapeRegex(search);
    andConditions.push({
      $or: [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { notes: { $regex: escapedSearch, $options: 'i' } }
      ]
    });
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }
  
  // Date range filters
  if (createdDateFrom || createdDateTo) {
    query.createdAt = {};
    if (createdDateFrom) {
      query.createdAt.$gte = new Date(createdDateFrom);
    }
    if (createdDateTo) {
      query.createdAt.$lte = new Date(createdDateTo + 'T23:59:59.999Z');
    }
  }
  
  if (completedDateFrom || completedDateTo) {
    query.completedAt = {};
    if (completedDateFrom) {
      query.completedAt.$gte = new Date(completedDateFrom);
    }
    if (completedDateTo) {
      query.completedAt.$lte = new Date(completedDateTo + 'T23:59:59.999Z');
    }
  }
  
  // Duration range filters
  if (estimatedDurationMin || estimatedDurationMax) {
    query.estimatedDuration = {};
    if (estimatedDurationMin) {
      query.estimatedDuration.$gte = parseInt(estimatedDurationMin);
    }
    if (estimatedDurationMax) {
      query.estimatedDuration.$lte = parseInt(estimatedDurationMax);
    }
  }

  const safePage = Math.max(1, parseInt(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const skip = (safePage - 1) * safeLimit;

  const [tasks, total] = await Promise.all([
    Housekeeping.find(query)
      .populate('roomId', 'roomNumber type floor')
      .populate('assignedToUserId', 'name')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Housekeeping.countDocuments(query)
  ]);

  res.json({
    status: 'success',
    results: tasks.length,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit)
    },
    data: { tasks }
  });
}));

// Create housekeeping task
router.post('/', authenticate, ensureTenantContext, authorizePolicy('housekeeping', 'staffAccess'), ensurePropertyAccess, validate(createTaskSchema), catchAsync(async (req, res) => {
  const hotelId = req.user.hotelId;
  if (!hotelId) {
    throw new ApplicationError('Hotel context is required', 403);
  }

  logger.debug('Received housekeeping task creation request', { hotelId });

  const taskData = {
    ...req.body,
    hotelId
  };

  logger.debug('Final housekeeping task data prepared', { title: taskData.title, roomId: taskData.roomId });

  const task = await Housekeeping.create(taskData);

  await task.populate('roomId', 'roomNumber type');

  logger.debug('Housekeeping task created', { taskId: task._id });

  // Real-time WebSocket notification for new housekeeping task
  try {
    await websocketService.broadcastToHotel(hotelId, 'housekeeping:task_created', {
      task,
      createdBy: req.user?._id
    });
    // Notify assigned staff member if one was specified
    if (taskData.assignedToUserId || taskData.assignedTo) {
      const assigneeId = taskData.assignedToUserId || taskData.assignedTo;
      await websocketService.sendToUser(assigneeId.toString(), 'housekeeping:task_assigned', {
        task,
        assignedToName: req.user?.name
      });
    }
  } catch (wsError) {
    logger.warn('Failed to send housekeeping WebSocket notification', { error: wsError.message });
  }

  res.status(201).json({
    status: 'success',
    data: { task }
  });
}));

// --- Literal routes BEFORE /:id catch-all ---

// Get task statistics
router.get('/stats', authenticate, ensureTenantContext, authorizePolicy('housekeeping', 'staffAccess'), ensurePropertyAccess, catchAsync(async (req, res) => {
  const hotelId = req.user.hotelId;
  if (!hotelId) {
    throw new ApplicationError('Hotel context is required', 403);
  }

  const stats = await Housekeeping.aggregate([
    { $match: { hotelId: new mongoose.Types.ObjectId(hotelId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: {
          $avg: {
            $cond: [
              { $and: ['$startedAt', '$completedAt'] },
              { $subtract: ['$completedAt', '$startedAt'] },
              null
            ]
          }
        }
      }
    }
  ]);

  // Format average duration from milliseconds to minutes
  const formattedStats = stats.map(stat => ({
    ...stat,
    avgDuration: stat.avgDuration ? Math.round(stat.avgDuration / (1000 * 60)) : null
  }));

  res.json({
    status: 'success',
    data: { stats: formattedStats }
  });
}));

// --- Parameterised routes ---

// Get single housekeeping task
router.get('/:id', authenticate, ensureTenantContext, authorizePolicy('housekeeping', 'staffAccess'), ensurePropertyAccess, catchAsync(async (req, res) => {
  const { id } = req.params;
  const hotelId = req.user.hotelId;
  if (!hotelId) {
    throw new ApplicationError('Hotel context is required', 403);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApplicationError('Invalid task ID format', 400);
  }

  const task = await Housekeeping.findOne({ _id: id, hotelId })
    .populate('roomId', 'roomNumber type floor')
    .populate('assignedToUserId', 'name')
    .populate('assignedTo', 'name')
    .lean();

  if (!task) {
    throw new ApplicationError('Housekeeping task not found', 404);
  }

  res.json({
    status: 'success',
    data: { task }
  });
}));

// Update housekeeping task
router.patch('/:id', authenticate, ensureTenantContext, authorizePolicy('housekeeping', 'staffAccess'), ensurePropertyAccess, validate(updateTaskSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const hotelId = req.user.hotelId;
  if (!hotelId) {
    throw new ApplicationError('Hotel context is required', 403);
  }

  const updateData = req.body;

  logger.debug('Updating housekeeping task', { id });

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    logger.debug('Invalid ObjectId format for housekeeping task', { id });
    throw new ApplicationError('Invalid task ID format', 400);
  }

  // If task is being started, set startedAt
  if (updateData.status === 'in_progress' && !updateData.startedAt) {
    updateData.startedAt = new Date();
  }

  // If task is being completed, set completedAt
  if (updateData.status === 'completed' && !updateData.completedAt) {
    updateData.completedAt = new Date();
  }

  const task = await Housekeeping.findOneAndUpdate(
    { _id: id, hotelId },
    updateData,
    { new: true, runValidators: true }
  ).populate('roomId assignedToUserId assignedTo');

  if (!task) {
    logger.debug('Housekeeping task not found', { id });
    throw new ApplicationError('Housekeeping task not found', 404);
  }

  // When task is completed, update room status to vacant (clean)
  if (updateData.status === 'completed' && task.roomId) {
    const roomId = task.roomId._id || task.roomId;
    await Room.findByIdAndUpdate(roomId, {
      $set: { status: 'vacant', lastCleaned: new Date() }
    });
    logger.info('Room status updated to vacant after cleaning completed', {
      taskId: task._id,
      roomId: roomId.toString()
    });
  }

  logger.debug('Housekeeping task updated', { taskId: task._id });

  // Real-time WebSocket notification for housekeeping task update
  try {
    const eventName = updateData.status
      ? 'housekeeping:status_changed'
      : 'housekeeping:task_updated';
    await websocketService.broadcastToHotel(hotelId, eventName, {
      task,
      status: updateData.status,
      updatedBy: req.user?._id
    });

    // If task is completed, also broadcast room status change
    if (updateData.status === 'completed' && task.roomId) {
      await websocketService.broadcastToHotel(hotelId, 'room_status_changed', {
        roomId: task.roomId._id || task.roomId,
        status: 'vacant',
        taskId: task._id,
        event: 'housekeeping_completed'
      });
    }

    // Notify assigned staff member if assignment changed
    if (updateData.assignedToUserId || updateData.assignedTo) {
      const assigneeId = updateData.assignedToUserId || updateData.assignedTo;
      await websocketService.sendToUser(assigneeId.toString(), 'housekeeping:task_assigned', {
        task,
        assignedToName: req.user?.name
      });
    }
  } catch (wsError) {
    logger.warn('Failed to send housekeeping update WebSocket notification', { error: wsError.message });
  }

  res.json({
    status: 'success',
    data: { task }
  });
}));

// Delete housekeeping task
router.delete('/:id', authenticate, ensureTenantContext, authorizePolicy('housekeeping', 'staffAccess'), ensurePropertyAccess, catchAsync(async (req, res) => {
  const { id } = req.params;
  const hotelId = req.user.hotelId;
  if (!hotelId) {
    throw new ApplicationError('Hotel context is required', 403);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApplicationError('Invalid task ID format', 400);
  }

  const task = await Housekeeping.findOneAndDelete({ _id: id, hotelId });

  if (!task) {
    throw new ApplicationError('Housekeeping task not found', 404);
  }

  logger.debug('Housekeeping task deleted', { taskId: id });

  res.json({
    status: 'success',
    data: null
  });
}));

// Inspect a completed housekeeping task (QA workflow)
router.post('/:id/inspect', authenticate, ensureTenantContext, authorizePolicy('housekeeping', 'inspectAccess'), ensurePropertyAccess, validate(inspectTaskSchema), catchAsync(async (req, res) => {
  const hotelId = req.user.hotelId;
  if (!hotelId) {
    throw new ApplicationError('Hotel context is required', 403);
  }

  const task = await Housekeeping.findOne({ _id: req.params.id, hotelId });

  if (!task) {
    throw new ApplicationError('Housekeeping task not found', 404);
  }

  const { passed, rating, notes, failureReasons, qaChecklist } = req.body;

  // Determine target status based on inspection result
  const targetStatus = passed ? 'inspected' : 'assigned';
  const transition = validateStatusTransition(HOUSEKEEPING_TRANSITIONS, task.status, targetStatus);
  if (!transition.valid) {
    throw new ApplicationError(transition.error, 400);
  }

  task.inspection = {
    inspectedBy: req.user._id,
    inspectedAt: new Date(),
    passed,
    rating,
    notes,
    failureReasons: failureReasons || [],
    qaChecklist: qaChecklist || []
  };

  if (passed) {
    // Inspection passed -- room is clean and ready
    task.status = 'inspected';
    task.roomStatus = 'clean';
  } else {
    // Inspection failed -- reassign for re-cleaning
    task.status = 'assigned';
    task.roomStatus = 'dirty';
    task.reinspectionCount = (task.reinspectionCount || 0) + 1;
  }

  await task.save();

  await task.populate([
    { path: 'roomId', select: 'roomNumber type' },
    { path: 'inspection.inspectedBy', select: 'name' }
  ]);

  // Real-time WebSocket notification for inspection result
  try {
    await websocketService.broadcastToHotel(hotelId, 'housekeeping:status_changed', {
      task,
      status: task.status,
      inspectionPassed: passed,
      inspectedBy: req.user?._id
    });

    // Notify assigned staff member about inspection result
    const assigneeId = task.assignedToUserId || task.assignedTo;
    if (assigneeId) {
      await websocketService.sendToUser(assigneeId.toString(), 'housekeeping:task_updated', {
        task,
        inspectionPassed: passed,
        message: passed ? 'Room inspection passed' : 'Room inspection failed - re-cleaning required'
      });
    }

    // If inspection passed, broadcast room status change
    if (passed && task.roomId) {
      await websocketService.broadcastToHotel(hotelId, 'room_status_changed', {
        roomId: task.roomId._id || task.roomId,
        status: 'clean',
        taskId: task._id,
        event: 'inspection_passed'
      });
    }
  } catch (wsError) {
    logger.warn('Failed to send housekeeping inspection WebSocket notification', { error: wsError.message });
  }

  res.json({
    status: 'success',
    data: { task }
  });
}));

export default router;