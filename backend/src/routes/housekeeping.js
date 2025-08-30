import express from 'express';
import mongoose from 'mongoose';
import Housekeeping from '../models/Housekeeping.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

const router = express.Router();

// Get housekeeping tasks
router.get('/', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
  const {
    status,
    roomId,
    assignedToUserId,
    taskType,
    page = 1,
    limit = 10
  } = req.query;

  const query = {};
  
  if (req.user.hotelId) {
    query.hotelId = req.user.hotelId;
  }
  
  if (status) query.status = status;
  if (roomId) query.roomId = roomId;
  if (assignedToUserId) {
    // Check both field names for backward compatibility
    query.$or = [
      { assignedToUserId: assignedToUserId },
      { assignedTo: assignedToUserId }
    ];
  }
  if (taskType) query.taskType = taskType;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const tasks = await Housekeeping.find(query)
    .populate('roomId', 'roomNumber type floor')
    .populate('assignedToUserId', 'name')
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Housekeeping.countDocuments(query);

  res.json({
    status: 'success',
    results: tasks.length,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    },
    data: { tasks }
  });
}));

// Create housekeeping task
router.post('/', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
  console.log('Received housekeeping task data:', req.body);
  console.log('User hotelId:', req.user.hotelId);
  
  const taskData = {
    ...req.body,
    hotelId: req.user.hotelId
  };

  console.log('Final task data:', taskData);

  // Validate required fields
  if (!taskData.title) {
    throw new AppError('Task title is required', 400);
  }
  if (!taskData.roomId) {
    throw new AppError('Room ID is required', 400);
  }
  if (!taskData.taskType) {
    throw new AppError('Task type is required', 400);
  }

  const task = await Housekeeping.create(taskData);
  
  await task.populate('roomId', 'roomNumber type');

  console.log('Created task:', task);

  res.status(201).json({
    status: 'success',
    data: { task }
  });
}));

// Update housekeeping task
router.patch('/:id', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  console.log('Updating housekeeping task:', { id, updateData });

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log('Invalid ObjectId format:', id);
    throw new AppError('Invalid task ID format', 400);
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
    console.log('Task not found with ID:', id);
    throw new AppError('Housekeeping task not found', 404);
  }

  console.log('Updated task:', task);

  res.json({
    status: 'success',
    data: { task }
  });
}));

// Get task statistics
router.get('/stats', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
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

export default router;