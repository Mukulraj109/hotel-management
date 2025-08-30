import express from 'express';
import MaintenanceTask from '../models/MaintenanceTask.js';
import Room from '../models/Room.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /maintenance:
 *   post:
 *     summary: Create a new maintenance task
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - priority
 *             properties:
 *               roomId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [plumbing, electrical, hvac, cleaning, carpentry, painting, appliance, safety, other]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent, emergency]
 *               category:
 *                 type: string
 *                 enum: [preventive, corrective, emergency, inspection]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               estimatedDuration:
 *                 type: number
 *               estimatedCost:
 *                 type: number
 *               materials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unitCost:
 *                       type: number
 *               roomOutOfOrder:
 *                 type: boolean
 *               isRecurring:
 *                 type: boolean
 *               recurringSchedule:
 *                 type: object
 *                 properties:
 *                   frequency:
 *                     type: string
 *                     enum: [daily, weekly, monthly, quarterly, yearly]
 *                   interval:
 *                     type: number
 *     responses:
 *       201:
 *         description: Maintenance task created successfully
 */
router.post('/', authorize('staff', 'admin'), catchAsync(async (req, res) => {
  const taskData = {
    ...req.body,
    hotelId: req.user.role === 'staff' ? req.user.hotelId : req.body.hotelId,
    reportedBy: req.user._id
  };

  // Validate hotel access for admin users
  if (req.user.role === 'admin' && !req.body.hotelId) {
    throw new AppError('Hotel ID is required', 400);
  }

  // If roomId provided, verify it belongs to the hotel
  if (taskData.roomId) {
    const room = await Room.findById(taskData.roomId);
    if (!room || room.hotelId.toString() !== taskData.hotelId.toString()) {
      throw new AppError('Invalid room for this hotel', 400);
    }

    // Update room status if out of order
    if (taskData.roomOutOfOrder) {
      room.status = 'maintenance';
      await room.save();
    }
  }

  const task = await MaintenanceTask.create(taskData);
  
  await task.populate([
    { path: 'hotelId', select: 'name' },
    { path: 'roomId', select: 'number type' },
    { path: 'reportedBy', select: 'name' }
  ]);

  res.status(201).json({
    status: 'success',
    data: { task }
  });
}));

/**
 * @swagger
 * /maintenance:
 *   get:
 *     summary: Get maintenance tasks
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of maintenance tasks
 */
router.get('/', catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    type,
    priority,
    assignedTo,
    roomId,
    overdue
  } = req.query;

  const query = {};

  // Role-based filtering
  if (req.user.role === 'staff') {
    query.hotelId = req.user.hotelId;
  } else if (req.user.role === 'admin' && req.query.hotelId) {
    query.hotelId = req.query.hotelId;
  }

  // Apply filters
  if (status) query.status = status;
  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (assignedTo) query.assignedTo = assignedTo;
  if (roomId) query.roomId = roomId;

  // Filter overdue tasks
  if (overdue === 'true') {
    query.dueDate = { $lt: new Date() };
    query.status = { $in: ['pending', 'assigned', 'in_progress'] };
  }

  const skip = (page - 1) * limit;
  
  const [tasks, total] = await Promise.all([
    MaintenanceTask.find(query)
      .populate('hotelId', 'name')
      .populate('roomId', 'number type floor')
      .populate('assignedTo', 'name')
      .populate('reportedBy', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    MaintenanceTask.countDocuments(query)
  ]);

  res.json({
    status: 'success',
    data: {
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

/**
 * @swagger
 * /maintenance/{id}:
 *   get:
 *     summary: Get specific maintenance task
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Maintenance task details
 */
router.get('/:id', catchAsync(async (req, res) => {
  const task = await MaintenanceTask.findById(req.params.id)
    .populate('hotelId', 'name contact')
    .populate('roomId', 'number type floor amenities')
    .populate('assignedTo', 'name email phone')
    .populate('reportedBy', 'name email');

  if (!task) {
    throw new AppError('Maintenance task not found', 404);
  }

  // Check access permissions
  if (req.user.role === 'staff' && task.hotelId._id.toString() !== req.user.hotelId.toString()) {
    throw new AppError('You can only view tasks for your hotel', 403);
  }

  res.json({
    status: 'success',
    data: { task }
  });
}));

/**
 * @swagger
 * /maintenance/{id}:
 *   patch:
 *     summary: Update maintenance task
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *               actualDuration:
 *                 type: number
 *               actualCost:
 *                 type: number
 *               completionNotes:
 *                 type: string
 *               materials:
 *                 type: array
 *               images:
 *                 type: array
 *     responses:
 *       200:
 *         description: Task updated successfully
 */
router.patch('/:id', authorize('staff', 'admin'), catchAsync(async (req, res) => {
  const task = await MaintenanceTask.findById(req.params.id);
  
  if (!task) {
    throw new AppError('Maintenance task not found', 404);
  }

  // Check access permissions
  if (req.user.role === 'staff' && task.hotelId.toString() !== req.user.hotelId.toString()) {
    throw new AppError('You can only update tasks for your hotel', 403);
  }

  const allowedUpdates = [
    'status', 'assignedTo', 'scheduledDate', 'actualDuration', 'actualCost',
    'completionNotes', 'materials', 'images', 'notes', 'dueDate', 'priority',
    'vendor', 'vendorRequired'
  ];

  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  Object.assign(task, updates);
  await task.save();

  // Handle room status updates
  if (updates.status === 'completed' && task.roomId && task.roomOutOfOrder) {
    const room = await Room.findById(task.roomId);
    if (room && room.status === 'maintenance') {
      room.status = 'vacant_dirty'; // Room needs cleaning after maintenance
      await room.save();
    }
  }

  await task.populate([
    { path: 'hotelId', select: 'name' },
    { path: 'roomId', select: 'number type' },
    { path: 'assignedTo', select: 'name' }
  ]);

  res.json({
    status: 'success',
    data: { task }
  });
}));

/**
 * @swagger
 * /maintenance/{id}/assign:
 *   post:
 *     summary: Assign maintenance task to staff member
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTo
 *             properties:
 *               assignedTo:
 *                 type: string
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task assigned successfully
 */
router.post('/:id/assign', authorize('staff', 'admin'), catchAsync(async (req, res) => {
  const { assignedTo, scheduledDate, notes } = req.body;
  
  const task = await MaintenanceTask.findById(req.params.id);
  
  if (!task) {
    throw new AppError('Maintenance task not found', 404);
  }

  // Check access permissions
  if (req.user.role === 'staff' && task.hotelId.toString() !== req.user.hotelId.toString()) {
    throw new AppError('You can only assign tasks for your hotel', 403);
  }

  await task.assignTask(assignedTo, scheduledDate);
  
  if (notes) {
    task.notes = notes;
    await task.save();
  }

  await task.populate([
    { path: 'assignedTo', select: 'name email' }
  ]);

  res.json({
    status: 'success',
    message: 'Task assigned successfully',
    data: { task }
  });
}));

/**
 * @swagger
 * /maintenance/stats:
 *   get:
 *     summary: Get maintenance statistics
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Maintenance statistics
 */
router.get('/stats', authorize('staff', 'admin'), catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const hotelId = req.user.role === 'staff' ? req.user.hotelId : req.query.hotelId;
  
  if (!hotelId) {
    throw new AppError('Hotel ID is required', 400);
  }

  const [stats, overdueTasks, upcomingRecurring] = await Promise.all([
    MaintenanceTask.getMaintenanceStats(hotelId, startDate, endDate),
    MaintenanceTask.getOverdueTasks(hotelId),
    MaintenanceTask.getUpcomingRecurringTasks(hotelId, 30)
  ]);

  // Get overall summary
  const matchQuery = {
    hotelId: new mongoose.Types.ObjectId(hotelId),
    ...(startDate && endDate ? {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    } : {})
  };

  const overallStats = await MaintenanceTask.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        averageDuration: { $avg: '$actualDuration' },
        totalCost: { $sum: '$actualCost' },
        pendingTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        inProgressTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
        },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        emergencyTasks: {
          $sum: { $cond: [{ $eq: ['$priority', 'emergency'] }, 1, 0] }
        }
      }
    }
  ]);

  res.json({
    status: 'success',
    data: {
      overall: overallStats[0] || {},
      byType: stats,
      overdueTasks: overdueTasks.length,
      upcomingRecurring: upcomingRecurring.length,
      overdueDetails: overdueTasks.slice(0, 10), // First 10 overdue tasks
      upcomingDetails: upcomingRecurring.slice(0, 10) // First 10 upcoming tasks
    }
  });
}));

/**
 * @swagger
 * /maintenance/overdue:
 *   get:
 *     summary: Get overdue maintenance tasks
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Overdue maintenance tasks
 */
router.get('/overdue', authorize('staff', 'admin'), catchAsync(async (req, res) => {
  const hotelId = req.user.role === 'staff' ? req.user.hotelId : req.query.hotelId;
  
  if (!hotelId) {
    throw new AppError('Hotel ID is required', 400);
  }

  const overdueTasks = await MaintenanceTask.getOverdueTasks(hotelId);

  res.json({
    status: 'success',
    data: {
      tasks: overdueTasks,
      count: overdueTasks.length
    }
  });
}));

/**
 * @swagger
 * /maintenance/recurring/upcoming:
 *   get:
 *     summary: Get upcoming recurring maintenance tasks
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Upcoming recurring maintenance tasks
 */
router.get('/recurring/upcoming', authorize('staff', 'admin'), catchAsync(async (req, res) => {
  const { days = 30 } = req.query;
  const hotelId = req.user.role === 'staff' ? req.user.hotelId : req.query.hotelId;
  
  if (!hotelId) {
    throw new AppError('Hotel ID is required', 400);
  }

  const upcomingTasks = await MaintenanceTask.getUpcomingRecurringTasks(hotelId, parseInt(days));

  res.json({
    status: 'success',
    data: {
      tasks: upcomingTasks,
      count: upcomingTasks.length
    }
  });
}));

export default router;