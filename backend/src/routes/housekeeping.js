import express from 'express';
import mongoose from 'mongoose';
import Housekeeping from '../models/Housekeeping.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import logger from '../utils/logger.js';
import { validateStatusTransition, HOUSEKEEPING_TRANSITIONS } from '../utils/statusTransitions.js';

const router = express.Router();

// Get housekeeping tasks
router.get('/', authenticate, ensureTenantContext, authorize('admin', 'staff', 'frontdesk'), ensurePropertyAccess, catchAsync(async (req, res) => {
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

  const query = {};
  
  if (req.user.hotelId) {
    query.hotelId = req.user.hotelId;
  }
  
  if (status) query.status = status;
  if (roomId) query.roomId = roomId;
  if (taskType) query.taskType = taskType;
  if (priority) query.priority = priority;
  
  // Handle assignedToUserId and search with proper $or logic
  const orConditions = [];
  
  if (assignedToUserId) {
    if (assignedToUserId === 'unassigned') {
      query.$or = [
        { assignedToUserId: { $exists: false } },
        { assignedToUserId: null },
        { assignedTo: { $exists: false } },
        { assignedTo: null }
      ];
    } else {
      // Check both field names for backward compatibility
      orConditions.push(
        { assignedToUserId: assignedToUserId },
        { assignedTo: assignedToUserId }
      );
    }
  }
  
  if (search) {
    const escapedSearch = escapeRegex(search);
    orConditions.push(
      { title: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
      { notes: { $regex: escapedSearch, $options: 'i' } }
    );
  }
  
  if (orConditions.length > 0) {
    query.$or = orConditions;
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

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const tasks = await Housekeeping.find(query)
    .populate('roomId', 'roomNumber type floor')
    .populate('assignedToUserId', 'name')
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit)).lean();

  const total = await Housekeeping.countDocuments(query);

  res.json({
    status: 'success',
    results: tasks.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { tasks }
  });
}));

// Create housekeeping task
router.post('/', authenticate, ensureTenantContext, authorize('admin', 'staff', 'frontdesk'), ensurePropertyAccess, catchAsync(async (req, res) => {
  logger.debug('Received housekeeping task creation request', { hotelId: req.user.hotelId });
  
  const taskData = {
    ...req.body,
    hotelId: req.user.hotelId
  };

  logger.debug('Final housekeeping task data prepared', { title: taskData.title, roomId: taskData.roomId });

  // Validate required fields
  if (!taskData.title) {
    throw new ApplicationError('Task title is required', 400);
  }
  if (!taskData.roomId) {
    throw new ApplicationError('Room ID is required', 400);
  }
  if (!taskData.taskType) {
    throw new ApplicationError('Task type is required', 400);
  }

  const task = await Housekeeping.create(taskData);
  
  await task.populate('roomId', 'roomNumber type');

  logger.debug('Housekeeping task created', { taskId: task._id });

  res.status(201).json({
    status: 'success',
    data: { task }
  });
}));

// Update housekeeping task
router.patch('/:id', authenticate, ensureTenantContext, authorize('admin', 'staff', 'frontdesk'), ensurePropertyAccess, catchAsync(async (req, res) => {
  const { id } = req.params;
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

  const task = await Housekeeping.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  ).populate('roomId assignedToUserId assignedTo');

  if (!task) {
    logger.debug('Housekeeping task not found', { id });
    throw new ApplicationError('Housekeeping task not found', 404);
  }

  logger.debug('Housekeeping task updated', { taskId: task._id });

  res.json({
    status: 'success',
    data: { task }
  });
}));

// Get task statistics
router.get('/stats', authenticate, ensureTenantContext, authorize('admin', 'staff', 'frontdesk'), ensurePropertyAccess, catchAsync(async (req, res) => {
  const query = req.user.hotelId ? { hotelId: req.user.hotelId } : {};

  const stats = await Housekeeping.aggregate([
    { $match: query },
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

// Inspect a completed housekeeping task (QA workflow)
router.post('/:id/inspect', authenticate, authorize('admin', 'frontdesk'), ensurePropertyAccess, catchAsync(async (req, res) => {
  const task = await Housekeeping.findById(req.params.id);

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

  res.json({
    status: 'success',
    data: { task }
  });
}));

export default router;