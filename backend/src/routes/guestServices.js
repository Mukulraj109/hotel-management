import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import GuestService from '../models/GuestService.js';
import Booking from '../models/Booking.js';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { serviceNotificationService } from '../services/serviceNotificationService.js';
import { validate, schemas } from '../middleware/validation.js';
import websocketService from '../services/websocketService.js';
import guestServicePOSIntegration from '../services/guestServicePOSIntegration.js';
import logger from '../utils/logger.js';
import { validateStatusTransition, GUEST_SERVICE_TRANSITIONS } from '../utils/statusTransitions.js';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

// All routes require authentication and property access
router.use(authenticate);
router.use(ensurePropertyAccess);
router.use(authorizePolicy('guestServices', 'baseAccess'));

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
 *               - serviceVariation
 *             properties:
 *               bookingId:
 *                 type: string
 *               serviceType:
 *                 type: string
 *                 enum: [room_service, housekeeping, maintenance, concierge, transport, spa, laundry, other]
 *               serviceVariation:
 *                 type: string
 *               serviceVariations:
 *                 type: array
 *                 items:
 *                   type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [now, later, low, medium, high, urgent]
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
router.post('/', authenticate, validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const {
    bookingId,
    serviceType,
    serviceVariation,
    serviceVariations,
    title,
    description,
    priority,
    scheduledTime,
    items,
    specialInstructions
  } = req.body;

  // Verify booking exists and belongs to user
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) {
    throw new ApplicationError('Booking not found', 404);
  }

  // Intelligent automatic staff assignment based on hotel services
  let assignedTo = null;
  let status = 'pending';
  let relatedHotelService = null;

  // Guests can only create requests for their own bookings
  if (req.user.role === 'guest' && booking.userId.toString() !== req.user._id.toString()) {
    throw new ApplicationError('You can only create requests for your own bookings', 403);
  }

  // Handle multiple service variations
  const finalServiceVariations = serviceVariations && serviceVariations.length > 0 ? serviceVariations : [];
  const primaryVariation = serviceVariation || (finalServiceVariations.length > 0 ? finalServiceVariations[0] : '');

  // Create initial service request
  let serviceRequest = new GuestService({
    hotelId: booking.hotelId,
    userId: booking.userId,
    bookingId,
    serviceType,
    serviceVariation: primaryVariation,
    serviceVariations: finalServiceVariations,
    title: title || (finalServiceVariations.length > 1 ? `${finalServiceVariations.length} ${serviceType.replace('_', ' ')} services` : primaryVariation),
    description,
    priority: priority || 'now',
    scheduledTime,
    items: items || [],
    specialInstructions,
    status: 'pending'
  });

  // Apply intelligent staff assignment
  serviceRequest = await GuestService.autoAssignToStaff(serviceRequest, booking.hotelId);

  // Save the service request
  await serviceRequest.save();

  await serviceRequest.populate([
    { path: 'hotelId', select: 'name' },
    { path: 'userId', select: 'name email' },
    { path: 'bookingId', select: 'bookingNumber' },
    { path: 'assignedTo', select: 'name email role' },
    { path: 'relatedHotelService', select: 'name type' }
  ]);

  // Send notification to assigned staff member
  if (serviceRequest.assignedTo) {
    try {
      await serviceNotificationService.notifyStaffAssignment(serviceRequest, serviceRequest.assignedTo);
    } catch (error) {
      logger.error('Failed to send staff assignment notification', { error: error.message });
    }
  }

  // Attempt to create POS order for food-related service requests
  let posOrder = null;
  try {
    posOrder = await guestServicePOSIntegration.createPOSOrderFromServiceRequest(serviceRequest);
    if (posOrder) {
      logger.debug('POS order created for service request', { orderNumber: posOrder.orderNumber, serviceRequestId: serviceRequest._id });

      // Link the service request to the POS order
      await guestServicePOSIntegration.linkServiceRequestToPOSOrder(serviceRequest, posOrder);

      // Re-populate the updated service request
      await serviceRequest.populate([
        { path: 'hotelId', select: 'name' },
        { path: 'userId', select: 'name email' },
        { path: 'bookingId', select: 'bookingNumber' },
        { path: 'assignedTo', select: 'name email role' },
        { path: 'relatedHotelService', select: 'name type' }
      ]);
    }
  } catch (posError) {
    // Log POS integration errors but don't fail the service request creation
    logger.error('Failed to create POS order for service request', { error: posError.message });
  }

  // Real-time WebSocket notifications for guest service request
  try {
    // Notify hotel staff and admins of new guest service request
    await websocketService.broadcastToHotel(booking.hotelId, 'guest-service:created', {
      serviceRequest,
      booking,
      guest: serviceRequest.userId
    });

    // Notify the assigned staff member specifically
    if (assignedTo) {
      await websocketService.sendToUser(assignedTo.toString(), 'guest-service:assigned', {
        serviceRequest,
        booking
      });
    }

    // Notify all staff roles
    await websocketService.broadcastToRole('staff', 'guest-service:created', serviceRequest);
    await websocketService.broadcastToRole('admin', 'guest-service:created', serviceRequest);
    await websocketService.broadcastToRole('manager', 'guest-service:created', serviceRequest);

    // Notify the guest who created the request
    await websocketService.sendToUser(serviceRequest.userId.toString(), 'guest-service:created', {
      serviceRequest,
      status: 'confirmed'
    });
  } catch (wsError) {
    // Log WebSocket errors but don't fail the service request creation
    logger.warn('Failed to send real-time guest service notification', { error: wsError.message });
  }

  res.status(201).json({
    status: 'success',
    data: {
      serviceRequest,
      ...(posOrder && { posOrder: {
        _id: posOrder._id,
        orderNumber: posOrder.orderNumber,
        totalAmount: posOrder.totalAmount,
        status: posOrder.status
      }})
    }
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
  } else if ((req.user.role === 'staff' || req.user.role === 'frontdesk') && req.user.hotelId) {
    query.hotelId = req.user.hotelId;
  } else if (req.user.role === 'admin') {
    // Admin users can filter by hotelId from query parameter
    const hotelId = req.query.hotelId;
    if (hotelId) {
      query.hotelId = hotelId;
    }
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
      .populate({
        path: 'bookingId',
        select: 'bookingNumber rooms',
        populate: {
          path: 'rooms.roomId',
          select: 'roomNumber'
        }
      })
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
router.get('/stats', authenticate, authorizePolicy('guestServices', 'staffAccess'), catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  let hotelId;
  if (req.user.role === 'staff' || req.user.role === 'frontdesk') {
    hotelId = req.user.hotelId;
  } else if (req.user.role === 'admin') {
    hotelId = req.query.hotelId || req.user.hotelId;
  }
  
  if (!hotelId) {
    throw new ApplicationError('Hotel ID is required. Admin users should provide hotelId as query parameter.', 400);
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

/**
 * @swagger
 * /guest-services/available-staff:
 *   get:
 *     summary: Get available staff for guest services (staff/admin only)
 *     tags: [Guest Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available staff list
 */
router.get('/available-staff', authenticate, authorizePolicy('guestServices', 'staffAccess'), catchAsync(async (req, res) => {
  let hotelId;
  if (req.user.role === 'staff' || req.user.role === 'frontdesk') {
    hotelId = req.user.hotelId;
  } else if (req.user.role === 'admin') {
    hotelId = req.query.hotelId || req.user.hotelId;
  }
  
  if (!hotelId) { 
    throw new ApplicationError('Hotel ID is required. Admin users should provide hotelId as query parameter.', 400); 
  }
  
  const User = mongoose.model('User');
  const staffMembers = await User.find({
    hotelId: hotelId,
    role: 'staff',
    isActive: true
  }).select('_id name email department').lean().limit(1000);
  
  res.json({ status: 'success', data: staffMembers });
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
    .populate({
      path: 'bookingId',
      select: 'bookingNumber rooms checkIn checkOut',
      populate: {
        path: 'rooms.roomId',
        select: 'roomNumber'
      }
    })
    .populate('assignedTo', 'name email').lean();

  if (!serviceRequest) {
    throw new ApplicationError('Service request not found', 404);
  }

  // Check access permissions
  if (req.user.role === 'guest' && serviceRequest.userId._id.toString() !== req.user._id.toString()) {
    throw new ApplicationError('You can only view your own service requests', 403);
  }

  if ((req.user.role === 'staff' || req.user.role === 'frontdesk') && serviceRequest.hotelId._id.toString() !== req.user.hotelId.toString()) {
    throw new ApplicationError('You can only view requests for your hotel', 403);
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
router.patch('/:id', authenticate, validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  // First fetch current state to validate permissions and transitions
  const currentRequest = await GuestService.findById(req.params.id).lean();

  if (!currentRequest) {
    throw new ApplicationError('Service request not found', 404);
  }

  const {
    status,
    assignedTo,
    notes,
    actualCost,
    scheduledTime,
    priority,
    completedServiceVariations
  } = req.body;

  // Permission checks
  const canUpdate =
    req.user.role === 'admin' ||
    ((req.user.role === 'staff' || req.user.role === 'frontdesk') && currentRequest.hotelId.toString() === req.user.hotelId.toString()) ||
    (req.user.role === 'guest' && currentRequest.userId.toString() === req.user._id.toString());

  if (!canUpdate) {
    throw new ApplicationError('You do not have permission to update this request', 403);
  }

  const setFields = {};

  // Guests can only cancel their own requests
  if (req.user.role === 'guest') {
    if (status && status !== 'cancelled') {
      throw new ApplicationError('Guests can only cancel their requests', 403);
    }
    const guestTransition = validateStatusTransition(GUEST_SERVICE_TRANSITIONS, currentRequest.status, 'cancelled');
    if (!guestTransition.valid) {
      throw new ApplicationError(guestTransition.error, 400);
    }
    setFields.status = 'cancelled';
  } else {
    // Staff/admin updates - validate transition if status is changing
    if (status !== undefined) {
      const staffTransition = validateStatusTransition(GUEST_SERVICE_TRANSITIONS, currentRequest.status, status);
      if (!staffTransition.valid) {
        throw new ApplicationError(staffTransition.error, 400);
      }
      setFields.status = status;
      if (status === 'completed') setFields.completedAt = new Date();
      setFields.statusUpdatedAt = new Date();
    }
    if (assignedTo !== undefined) setFields.assignedTo = assignedTo;
    if (notes !== undefined) setFields.notes = notes;
    if (actualCost !== undefined) setFields.actualCost = actualCost;
    if (scheduledTime !== undefined) setFields.scheduledTime = scheduledTime;
    if (priority !== undefined) setFields.priority = priority;
    if (completedServiceVariations !== undefined) setFields.completedServiceVariations = completedServiceVariations;
  }

  // Atomic update with status guard to prevent concurrent transition conflicts
  const matchQuery = { _id: req.params.id };
  if (status !== undefined) {
    matchQuery.status = currentRequest.status; // Ensure status hasn't changed since read
  }

  const serviceRequest = await GuestService.findOneAndUpdate(
    matchQuery,
    { $set: setFields },
    { new: true, runValidators: true }
  ).populate([
    { path: 'hotelId', select: 'name' },
    { path: 'userId', select: 'name email' },
    { path: 'assignedTo', select: 'name' }
  ]);

  if (!serviceRequest) {
    throw new ApplicationError('Service request was modified concurrently. Please retry.', 409);
  }

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
router.post('/:id/feedback', authenticate, authorizePolicy('guestServices', 'guestAccess'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { rating, feedback } = req.body;

  const serviceRequest = await GuestService.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.user._id,
      status: 'completed'
    },
    { $set: { rating, feedback } },
    { new: true, runValidators: true }
  );

  if (!serviceRequest) {
    // Determine specific error
    const exists = await GuestService.findById(req.params.id).lean();
    if (!exists) {
      throw new ApplicationError('Service request not found', 404);
    }
    if (exists.userId.toString() !== req.user._id.toString()) {
      throw new ApplicationError('You can only rate your own service requests', 403);
    }
    throw new ApplicationError('You can only rate completed services', 400);
  }

  res.json({
    status: 'success',
    message: 'Feedback added successfully',
    data: { serviceRequest }
  });
}));



export default router;