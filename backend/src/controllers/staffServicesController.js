import mongoose from 'mongoose';
import HotelService from '../models/HotelService.js';
import GuestService from '../models/GuestService.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { serviceNotificationService } from '../services/serviceNotificationService.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';

/**
 * @swagger
 * /staff/services/my-services:
 *   get:
 *     summary: Get services assigned to current staff member
 *     tags: [Staff - Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned services
 */
export const getMyAssignedServices = catchAsync(async (req, res) => {
  const staffId = req.user._id;
  const hotelId = req.user.hotelId;

  const assignedServices = await HotelService.getServicesForStaff(staffId, hotelId);

  res.json({
    status: 'success',
    data: {
      services: assignedServices,
      totalCount: assignedServices.length
    }
  });
});

/**
 * @swagger
 * /staff/services/my-requests:
 *   get:
 *     summary: Get service requests assigned to current staff member
 *     tags: [Staff - Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, in_progress, completed, cancelled]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [now, later, low, medium, high, urgent]
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
 *     responses:
 *       200:
 *         description: List of assigned service requests
 */
export const getMyServiceRequests = catchAsync(async (req, res) => {
  const staffId = req.user._id;
  const {
    status,
    priority,
    page = 1,
    limit = 20
  } = req.query;

  const query = { assignedTo: staffId };

  if (status) query.status = status;
  if (priority) query.priority = priority;

  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    GuestService.find(query)
      .populate('hotelId', 'name')
      .populate('userId', 'name email')
      .populate('bookingId', 'bookingNumber roomNumber')
      .populate('relatedHotelService', 'name type')
      .sort({ createdAt: -1, priority: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    GuestService.countDocuments(query)
  ]);

  // Get statistics for the staff member
  const stats = await GuestService.aggregate([
    { $match: { assignedTo: new mongoose.Types.ObjectId(staffId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const statusStats = {};
  stats.forEach(stat => {
    statusStats[stat._id] = stat.count;
  });

  res.json({
    status: 'success',
    data: {
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      statistics: statusStats
    }
  });
});

/**
 * @swagger
 * /staff/services/requests/{id}:
 *   get:
 *     summary: Get specific service request details (Staff only)
 *     tags: [Staff - Services]
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
 *         description: Service request details
 */
export const getServiceRequestDetails = catchAsync(async (req, res) => {
  const requestId = req.params.id;
  const staffId = req.user._id;

  const request = await GuestService.findOne({
    _id: requestId,
    assignedTo: staffId
  }).populate([
    { path: 'hotelId', select: 'name address' },
    { path: 'userId', select: 'name email phone' },
    { path: 'bookingId', select: 'bookingNumber roomNumber checkIn checkOut' },
    { path: 'relatedHotelService', select: 'name type description contactInfo' }
  ]).lean();

  if (!request) {
    throw new ApplicationError('Service request not found or not assigned to you', 404);
  }

  res.json({
    status: 'success',
    data: request
  });
});

/**
 * @swagger
 * /staff/services/requests/{id}/update-status:
 *   patch:
 *     summary: Update service request status (Staff only)
 *     tags: [Staff - Services]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [in_progress, completed]
 *               notes:
 *                 type: string
 *               actualCost:
 *                 type: number
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
export const updateServiceRequestStatus = catchAsync(async (req, res) => {
  const requestId = req.params.id;
  const staffId = req.user._id;
  const { status, notes, actualCost } = req.body;

  // Validate status transitions using the current status
  const validTransitions = {
    'assigned': ['in_progress'],
    'in_progress': ['completed'],
    'pending': ['in_progress']
  };

  // Build the query to atomically match valid current statuses
  const validFromStatuses = Object.keys(validTransitions).filter(
    fromStatus => validTransitions[fromStatus]?.includes(status)
  );

  if (validFromStatuses.length === 0) {
    throw new ApplicationError(`Invalid target status: ${status}`, 400);
  }

  const updateFields = {
    status,
    statusUpdatedAt: new Date()
  };
  if (notes) updateFields.notes = notes;
  if (actualCost !== undefined) updateFields.actualCost = actualCost;
  if (status === 'completed') updateFields.completedAt = new Date();

  const request = await GuestService.findOneAndUpdate(
    {
      _id: requestId,
      assignedTo: staffId,
      status: { $in: validFromStatuses }
    },
    { $set: updateFields },
    { new: true, runValidators: true }
  ).populate([
    { path: 'hotelId', select: 'name' },
    { path: 'userId', select: 'name email' },
    { path: 'bookingId', select: 'bookingNumber roomNumber' }
  ]);

  if (!request) {
    // Determine if request doesn't exist or transition is invalid
    const exists = await GuestService.findOne({ _id: requestId, assignedTo: staffId }).lean();
    if (!exists) {
      throw new ApplicationError('Service request not found or not assigned to you', 404);
    }
    throw new ApplicationError(`Cannot change status from ${exists.status} to ${status}`, 400);
  }

  // Send notifications about status change
  try {
    const oldStatus = validFromStatuses.find(s => validTransitions[s]?.includes(status));
    await serviceNotificationService.notifyStatusChange(request, oldStatus, status, staffId);
  } catch (error) {
    console.error('Failed to send status change notification:', error);
  }

  res.json({
    status: 'success',
    message: 'Status updated successfully',
    data: request
  });
});

/**
 * @swagger
 * /staff/services/requests/{id}/add-notes:
 *   patch:
 *     summary: Add notes to service request (Staff only)
 *     tags: [Staff - Services]
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
 *               - notes
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notes added successfully
 */
export const addNotesToRequest = catchAsync(async (req, res) => {
  const requestId = req.params.id;
  const staffId = req.user._id;
  const { notes } = req.body;

  const request = await GuestService.findOneAndUpdate(
    { _id: requestId, assignedTo: staffId },
    { $set: { notes } },
    { new: true, runValidators: true }
  );

  if (!request) {
    throw new ApplicationError('Service request not found or not assigned to you', 404);
  }

  res.json({
    status: 'success',
    message: 'Notes added successfully',
    data: request
  });
});

/**
 * @swagger
 * /staff/services/dashboard:
 *   get:
 *     summary: Get staff service management dashboard data
 *     tags: [Staff - Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data for staff
 */
export const getStaffServiceDashboard = catchAsync(async (req, res) => {
  const staffId = req.user._id;
  const hotelId = req.user.hotelId;

  // Get assigned services count
  const assignedServices = await HotelService.countDocuments({
    hotelId,
    'assignedStaff.staffId': staffId,
    'assignedStaff.isActive': true,
    isActive: true
  });

  // Get service request statistics
  const requestStats = await GuestService.aggregate([
    { $match: { assignedTo: new mongoose.Types.ObjectId(staffId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const statusCounts = {};
  requestStats.forEach(stat => {
    statusCounts[stat._id] = stat.count;
  });

  // Get overdue requests
  const overdueRequests = await GuestService.countDocuments({
    assignedTo: staffId,
    scheduledTime: { $lt: new Date() },
    status: { $in: ['assigned', 'in_progress'] }
  });

  // Get today's requests
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayRequests = await GuestService.countDocuments({
    assignedTo: staffId,
    createdAt: { $gte: today, $lt: tomorrow }
  });

  // Get upcoming scheduled requests
  const upcomingRequests = await GuestService.find({
    assignedTo: staffId,
    scheduledTime: { $gte: new Date() },
    status: { $in: ['assigned', 'in_progress'] }
  }).sort({ scheduledTime: 1 })
    .limit(5)
    .populate('userId', 'name')
    .populate('bookingId', 'roomNumber').lean();

  res.json({
    status: 'success',
    data: {
      summary: {
        assignedServices,
        totalRequests: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
        pendingRequests: statusCounts.assigned || 0,
        inProgressRequests: statusCounts.in_progress || 0,
        completedRequests: statusCounts.completed || 0,
        overdueRequests,
        todayRequests
      },
      statusBreakdown: statusCounts,
      upcomingRequests
    }
  });
});
