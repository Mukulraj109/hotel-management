import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import GuestService from '../models/GuestService.js';
import Booking from '../models/Booking.js';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess, refToHotelIdString } from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
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

// All routes require authentication, tenant isolation, and property access
router.use(authenticate);
router.use(ensureTenantContext);
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

  // Verify booking exists and belongs to user — include hotelId tenant check for non-guest roles
  const bookingQuery = { _id: bookingId };
  if (req.user.role !== 'guest' && req.user.hotelId) {
    bookingQuery.hotelId = req.user.hotelId;
  }
  const booking = await Booking.findOne(bookingQuery).lean();
  if (!booking) {
    throw new ApplicationError('Booking not found', 404);
  }

  // Guests can only create requests for their own bookings
  if (req.user.role === 'guest' && booking.userId.toString() !== req.user._id.toString()) {
    throw new ApplicationError('You can only create requests for your own bookings', 403);
  }

  // Validate items: quantity must be >= 1, names must be non-empty
  if (items && Array.isArray(items)) {
    for (const item of items) {
      if (item.name && typeof item.name === 'string' && item.name.trim()) {
        if (typeof item.quantity !== 'number' || item.quantity < 1) {
          throw new ApplicationError(`Item "${item.name}" must have a quantity of at least 1`, 400);
        }
      }
    }
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
    items: (items || []).filter(i => i.name && i.name.trim()),
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

  // Role-based filtering with mandatory tenant isolation
  if (req.user.role === 'guest') {
    query.userId = req.user._id;
  } else {
    const hotelId = refToHotelIdString(req.query.hotelId || req.body.hotelId || req.user?.hotelId);
    if (!hotelId) {
      return res.status(400).json({ status: 'error', message: 'Hotel context required' });
    }
    query.hotelId = hotelId;
  }

  // Apply filters
  if (status) query.status = status;
  if (serviceType) query.serviceType = serviceType;
  if (priority) query.priority = priority;
  if (assignedTo) query.assignedTo = assignedTo;

  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const skip = (parsedPage - 1) * parsedLimit;

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
      .populate('assignedTo', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    GuestService.countDocuments(query)
  ]);

  res.json({
    status: 'success',
    data: {
      serviceRequests,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: parsedLimit > 0 ? Math.ceil(total / parsedLimit) : 1
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
  if (['staff', 'frontdesk', 'manager'].includes(req.user.role)) {
    hotelId = refToHotelIdString(req.query.hotelId || req.user.hotelId);
  } else if (req.user.role === 'admin') {
    hotelId = refToHotelIdString(req.query.hotelId || req.user.hotelId);
  }

  if (!hotelId) {
    throw new ApplicationError('Hotel ID is required. Admin users should provide hotelId as query parameter.', 400);
  }

  const stats = await GuestService.getServiceStats(hotelId, startDate, endDate);

  // Get overall stats
  const overallStats = await GuestService.aggregate([
    { 
      $match: {
        hotelId: mongoose.Types.ObjectId.isValid(hotelId) ? new mongoose.Types.ObjectId(hotelId) : hotelId,
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
        assignedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] }
        },
        inProgressCount: {
          $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
        },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledCount: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalResponseTime: {
          $avg: {
            $cond: [
              { $and: [{ $ne: ['$scheduledTime', null] }, { $ne: ['$createdAt', null] }] },
              { $subtract: ['$scheduledTime', '$createdAt'] },
              null
            ]
          }
        },
        totalCompletionTime: {
          $avg: {
            $cond: [
              { $and: [{ $ne: ['$completedTime', null] }, { $ne: ['$createdAt', null] }] },
              { $subtract: ['$completedTime', '$createdAt'] },
              null
            ]
          }
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
  if (['staff', 'frontdesk', 'manager'].includes(req.user.role)) {
    hotelId = refToHotelIdString(req.query.hotelId || req.user.hotelId);
  } else if (req.user.role === 'admin') {
    hotelId = refToHotelIdString(req.query.hotelId || req.user.hotelId);
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
// Bulk assign services to staff (MUST be before /:id routes)
router.patch('/bulk/assign', authenticate, authorizePolicy('guestServices', 'staffAccess'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { serviceIds, assignedTo } = req.body;
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw new ApplicationError('serviceIds array is required', 400);
  }
  if (!assignedTo) {
    throw new ApplicationError('assignedTo is required', 400);
  }
  const hotelId = refToHotelIdString(req.query.hotelId || req.body.hotelId || req.user.hotelId);
  if (!hotelId) {
    throw new ApplicationError('Hotel ID is required', 400);
  }
  const result = await GuestService.updateMany(
    { _id: { $in: serviceIds }, hotelId },
    { $set: { assignedTo, status: 'assigned', updatedAt: new Date() } }
  );
  res.json({ status: 'success', data: { updated: result.modifiedCount } });
}));

// Bulk update status
router.patch('/bulk/status', authenticate, authorizePolicy('guestServices', 'staffAccess'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { serviceIds, status } = req.body;
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw new ApplicationError('serviceIds array is required', 400);
  }
  const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ApplicationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }
  const updateData = { status, updatedAt: new Date() };
  if (status === 'completed') updateData.completedTime = new Date();
  const bulkHotelId = refToHotelIdString(req.query.hotelId || req.body.hotelId || req.user.hotelId);
  if (!bulkHotelId) {
    throw new ApplicationError('Hotel ID is required', 400);
  }
  const result = await GuestService.updateMany(
    { _id: { $in: serviceIds }, hotelId: bulkHotelId },
    { $set: updateData }
  );
  res.json({ status: 'success', data: { updated: result.modifiedCount } });
}));

// Export services as CSV
router.get('/export', authenticate, authorizePolicy('guestServices', 'staffAccess'), catchAsync(async (req, res) => {
  const { format = 'csv', status: statusFilter, serviceType, priority } = req.query;
  const hotelId = refToHotelIdString(req.query.hotelId || req.user?.hotelId);
  if (!hotelId) {
    throw new ApplicationError('Hotel ID is required for export', 400);
  }
  const filter = { hotelId };
  if (statusFilter) filter.status = statusFilter;
  if (serviceType) filter.serviceType = serviceType;
  if (priority) filter.priority = priority;

  const services = await GuestService.find(filter)
    .populate('userId', 'name email')
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 }).lean().limit(5000);

  if (format === 'csv') {
    const headers = ['ID', 'Service Type', 'Guest', 'Priority', 'Status', 'Assigned To', 'Cost', 'Created', 'Completed'];
    const rows = services.map(s => [
      s._id, s.serviceType || '', s.userId?.name || '', s.priority || '',
      s.status || '', s.assignedTo?.name || '', s.cost || 0,
      s.createdAt ? new Date(s.createdAt).toISOString() : '',
      s.completedTime ? new Date(s.completedTime).toISOString() : ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=guest-services-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  }
  res.json({ status: 'success', data: { services } });
}));

// Delete a service request (only pending/cancelled)
router.delete('/:id', authenticate, authorizePolicy('guestServices', 'staffAccess'), catchAsync(async (req, res) => {
  const service = await GuestService.findById(req.params.id).lean();
  if (!service) throw new ApplicationError('Service request not found', 404);

  // Tenant isolation: ensure the service belongs to the user's hotel
  const deleteHotelId = refToHotelIdString(req.query.hotelId || req.user?.hotelId);
  if (deleteHotelId && service.hotelId.toString() !== deleteHotelId.toString()) {
    throw new ApplicationError('You can only delete service requests for your hotel', 403);
  }

  if (!['pending', 'cancelled'].includes(service.status)) {
    throw new ApplicationError('Only pending or cancelled service requests can be deleted', 400);
  }
  await GuestService.findByIdAndDelete(req.params.id);
  res.json({ status: 'success', message: 'Service request deleted successfully' });
}));

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
    completedServiceVariations,
    cancellationReason,
    rating,
    feedback
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

  // Guests can only cancel their own requests or add feedback to completed ones
  if (req.user.role === 'guest') {
    // Allow guests to add rating/feedback to completed requests
    if (currentRequest.status === 'completed' && (rating !== undefined || feedback !== undefined)) {
      if (rating !== undefined) {
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
          throw new ApplicationError('Rating must be a number between 1 and 5', 400);
        }
        setFields.rating = rating;
      }
      if (feedback !== undefined) setFields.feedback = feedback;
    } else if (status && status !== 'cancelled') {
      throw new ApplicationError('Guests can only cancel their requests', 403);
    } else if (status === 'cancelled') {
      const guestTransition = validateStatusTransition(GUEST_SERVICE_TRANSITIONS, currentRequest.status, 'cancelled');
      if (!guestTransition.valid) {
        throw new ApplicationError(guestTransition.error, 400);
      }
      setFields.status = 'cancelled';
      if (cancellationReason) setFields.cancellationReason = cancellationReason;
    }
  } else {
    // Staff/admin updates - validate transition if status is changing
    if (status !== undefined) {
      const staffTransition = validateStatusTransition(GUEST_SERVICE_TRANSITIONS, currentRequest.status, status);
      if (!staffTransition.valid) {
        throw new ApplicationError(staffTransition.error, 400);
      }
      setFields.status = status;
      if (status === 'completed') setFields.completedTime = new Date();
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