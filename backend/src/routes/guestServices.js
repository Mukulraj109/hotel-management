import express from 'express';
import GuestService from '../models/GuestService.js';
import Booking from '../models/Booking.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * /guest-services:
 *   post:
 *     summary: Create a new guest service request
 *     tags: [Guest Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - serviceType
 *               - title
 *             properties:
 *               bookingId:
 *                 type: string
 *               serviceType:
 *                 type: string
 *                 enum: [room_service, housekeeping, maintenance, concierge, transport, spa, laundry, other]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     price:
 *                       type: number
 *               specialInstructions:
 *                 type: string
 *     responses:
 *       201:
 *         description: Service request created successfully
 */
router.post('/', authenticate, catchAsync(async (req, res) => {
  const {
    bookingId,
    serviceType,
    title,
    description,
    priority,
    scheduledTime,
    items,
    specialInstructions
  } = req.body;

  // Verify booking exists and belongs to user
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  // Guests can only create requests for their own bookings
  if (req.user.role === 'guest' && booking.userId.toString() !== req.user._id.toString()) {
    throw new AppError('You can only create requests for your own bookings', 403);
  }

  const serviceRequest = await GuestService.create({
    hotelId: booking.hotelId,
    userId: booking.userId,
    bookingId,
    serviceType,
    title,
    description,
    priority: priority || 'medium',
    scheduledTime,
    items: items || [],
    specialInstructions
  });

  await serviceRequest.populate([
    { path: 'hotelId', select: 'name' },
    { path: 'userId', select: 'name email' },
    { path: 'bookingId', select: 'bookingNumber' }
  ]);

  res.status(201).json({
    status: 'success',
    data: { serviceRequest }
  });
}));

/**
 * @swagger
 * /guest-services:
 *   get:
 *     summary: Get guest service requests
 *     tags: [Guest Services]
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
 *         name: serviceType
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of service requests
 */
router.get('/', authenticate, catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    serviceType,
    priority,
    assignedTo
  } = req.query;

  const query = {};

  // Role-based filtering
  if (req.user.role === 'guest') {
    query.userId = req.user._id;
  } else if (req.user.role === 'staff' && req.user.hotelId) {
    query.hotelId = req.user.hotelId;
  }

  // Apply filters
  if (status) query.status = status;
  if (serviceType) query.serviceType = serviceType;
  if (priority) query.priority = priority;
  if (assignedTo) query.assignedTo = assignedTo;

  const skip = (page - 1) * limit;
  
  const [serviceRequests, total] = await Promise.all([
    GuestService.find(query)
      .populate('hotelId', 'name')
      .populate('userId', 'name email')
      .populate('bookingId', 'bookingNumber rooms')
      .populate('assignedTo', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    GuestService.countDocuments(query)
  ]);

  res.json({
    status: 'success',
    data: {
      serviceRequests,
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
 * /guest-services/{id}:
 *   get:
 *     summary: Get specific service request
 *     tags: [Guest Services]
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
router.get('/:id', authenticate, catchAsync(async (req, res) => {
  const serviceRequest = await GuestService.findById(req.params.id)
    .populate('hotelId', 'name contact')
    .populate('userId', 'name email phone')
    .populate('bookingId', 'bookingNumber rooms checkIn checkOut')
    .populate('assignedTo', 'name email');

  if (!serviceRequest) {
    throw new AppError('Service request not found', 404);
  }

  // Check access permissions
  if (req.user.role === 'guest' && serviceRequest.userId._id.toString() !== req.user._id.toString()) {
    throw new AppError('You can only view your own service requests', 403);
  }

  if (req.user.role === 'staff' && serviceRequest.hotelId._id.toString() !== req.user.hotelId.toString()) {
    throw new AppError('You can only view requests for your hotel', 403);
  }

  res.json({
    status: 'success',
    data: { serviceRequest }
  });
}));

/**
 * @swagger
 * /guest-services/{id}:
 *   patch:
 *     summary: Update service request
 *     tags: [Guest Services]
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
 *                 enum: [pending, assigned, in_progress, completed, cancelled]
 *               assignedTo:
 *                 type: string
 *               notes:
 *                 type: string
 *               actualCost:
 *                 type: number
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Service request updated successfully
 */
router.patch('/:id', authenticate, catchAsync(async (req, res) => {
  const serviceRequest = await GuestService.findById(req.params.id);
  
  if (!serviceRequest) {
    throw new AppError('Service request not found', 404);
  }

  const {
    status,
    assignedTo,
    notes,
    actualCost,
    scheduledTime,
    priority
  } = req.body;

  // Permission checks
  const canUpdate = 
    req.user.role === 'admin' ||
    (req.user.role === 'staff' && serviceRequest.hotelId.toString() === req.user.hotelId.toString()) ||
    (req.user.role === 'guest' && serviceRequest.userId.toString() === req.user._id.toString() && serviceRequest.canCancel());

  if (!canUpdate) {
    throw new AppError('You do not have permission to update this request', 403);
  }

  // Guests can only cancel their own requests
  if (req.user.role === 'guest') {
    if (status && status !== 'cancelled') {
      throw new AppError('Guests can only cancel their requests', 403);
    }
    serviceRequest.status = 'cancelled';
  } else {
    // Staff/admin updates
    if (status !== undefined) serviceRequest.updateStatus(status);
    if (assignedTo !== undefined) serviceRequest.assignedTo = assignedTo;
    if (notes !== undefined) serviceRequest.notes = notes;
    if (actualCost !== undefined) serviceRequest.actualCost = actualCost;
    if (scheduledTime !== undefined) serviceRequest.scheduledTime = scheduledTime;
    if (priority !== undefined) serviceRequest.priority = priority;
  }

  await serviceRequest.save();
  
  await serviceRequest.populate([
    { path: 'hotelId', select: 'name' },
    { path: 'userId', select: 'name email' },
    { path: 'assignedTo', select: 'name' }
  ]);

  res.json({
    status: 'success',
    data: { serviceRequest }
  });
}));

/**
 * @swagger
 * /guest-services/{id}/feedback:
 *   post:
 *     summary: Add feedback to completed service
 *     tags: [Guest Services]
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
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Feedback added successfully
 */
router.post('/:id/feedback', authenticate, authorize('guest'), catchAsync(async (req, res) => {
  const { rating, feedback } = req.body;
  
  const serviceRequest = await GuestService.findById(req.params.id);
  
  if (!serviceRequest) {
    throw new AppError('Service request not found', 404);
  }

  if (serviceRequest.userId.toString() !== req.user._id.toString()) {
    throw new AppError('You can only rate your own service requests', 403);
  }

  if (serviceRequest.status !== 'completed') {
    throw new AppError('You can only rate completed services', 400);
  }

  serviceRequest.rating = rating;
  serviceRequest.feedback = feedback;
  await serviceRequest.save();

  res.json({
    status: 'success',
    message: 'Feedback added successfully',
    data: { serviceRequest }
  });
}));

/**
 * @swagger
 * /guest-services/stats:
 *   get:
 *     summary: Get service statistics (staff/admin only)
 *     tags: [Guest Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Service statistics
 */
router.get('/stats', authenticate, authorize('staff', 'admin'), catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const hotelId = req.user.role === 'staff' ? req.user.hotelId : req.query.hotelId;
  
  if (!hotelId) {
    throw new AppError('Hotel ID is required', 400);
  }

  const stats = await GuestService.getServiceStats(hotelId, startDate, endDate);

  // Get overall stats
  const overallStats = await GuestService.aggregate([
    { 
      $match: {
        hotelId: new mongoose.Types.ObjectId(hotelId),
        ...(startDate && endDate ? {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        } : {})
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        avgRating: { $avg: '$rating' },
        totalRevenue: { $sum: '$actualCost' },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    }
  ]);

  res.json({
    status: 'success',
    data: {
      overall: overallStats[0] || {},
      byServiceType: stats
    }
  });
}));

export default router;