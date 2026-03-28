import express from 'express';
import HotelService from '../models/HotelService.js';
import ServiceBooking from '../models/ServiceBooking.js';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Note: Some routes are public or optional auth, middleware applied per-route as needed

/**
 * @swagger
 * /hotel-services:
 *   get:
 *     summary: Get all hotel services
 *     tags: [Hotel Services]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [dining, spa, gym, transport, entertainment, business, wellness, recreation]
 *         description: Filter by service type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search services by name or description
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter featured services only
 *     responses:
 *       200:
 *         description: List of hotel services
 */
router.get('/', catchAsync(async (req, res) => {
  const { type, search, featured, hotelId: queryHotelId, page = '1', limit = '20' } = req.query;
  const user = req.user;

  // Resolve hotelId — require it from either user context or query param
  const resolvedHotelId = user?.hotelId || queryHotelId;
  if (!resolvedHotelId) {
    return res.status(400).json({ status: 'error', message: 'Hotel context is required' });
  }

  const query = { isActive: true, hotelId: resolvedHotelId };

  if (type) {
    query.type = type;
  }

  if (featured === 'true') {
    query.featured = true;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  let services;

  if (search && typeof search === 'string') {
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
    if (safeSearch) {
      const regex = new RegExp(safeSearch, 'i');
      query.$or = [{ name: regex }, { description: regex }, { tags: regex }];
    }
    services = await HotelService.find(query)
      .sort({ featured: -1, 'rating.average': -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('hotelId', 'name')
      .lean();
  } else {
    services = await HotelService.find(query)
      .sort({ featured: -1, 'rating.average': -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('hotelId', 'name')
      .lean();
  }

  res.json({
    status: 'success',
    data: services
  });
}));

/**
 * @swagger
 * /hotel-services/bookings:
 *   get:
 *     summary: Get user's service bookings
 *     tags: [Hotel Services]
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
 *           enum: [pending, confirmed, completed, cancelled]
 *     responses:
 *       200:
 *         description: User's service bookings
 */
router.get('/bookings',
  authenticate,
  authorizePolicy('hotelServices', 'baseAccess'),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    if (status) {
      options.status = status;
    }
    
    const result = await ServiceBooking.getUserBookings(req.user._id, options);

    res.json({
      status: 'success',
      data: result
    });
  })
);

/**
 * @swagger
 * /hotel-services/bookings/{bookingId}:
 *   get:
 *     summary: Get specific service booking details
 *     tags: [Hotel Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service booking details
 *       404:
 *         description: Booking not found
 */
router.get('/bookings/:bookingId',
  authenticate,
  authorizePolicy('hotelServices', 'baseAccess'),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { bookingId } = req.params;
    
    const booking = await ServiceBooking.findById(bookingId)
      .populate('serviceId', 'name type price images description')
      .populate('hotelId', 'name address')
      .populate('userId', 'name email').lean();
      
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }
    
    // Check if user owns this booking
    if (booking.userId._id.toString() !== req.user._id.toString()) {
      throw new ApplicationError('Not authorized to view this booking', 403);
    }

    res.json({
      status: 'success',
      data: booking
    });
  })
);

/**
 * @swagger
 * /hotel-services/types:
 *   get:
 *     summary: Get all service types
 *     tags: [Hotel Services]
 *     responses:
 *       200:
 *         description: List of service types
 */
router.get('/types', catchAsync(async (req, res) => {
  const types = [
    { value: 'dining', label: 'Dining & Restaurants', icon: '🍽️' },
    { value: 'spa', label: 'Spa & Wellness', icon: '💆' },
    { value: 'gym', label: 'Fitness & Gym', icon: '💪' },
    { value: 'transport', label: 'Transportation', icon: '🚗' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎭' },
    { value: 'business', label: 'Business Services', icon: '💼' },
    { value: 'wellness', label: 'Wellness & Health', icon: '🧘' },
    { value: 'recreation', label: 'Recreation', icon: '🏊' }
  ];

  res.json({
    status: 'success',
    data: types
  });
}));

/**
 * @swagger
 * /hotel-services/featured:
 *   get:
 *     summary: Get featured hotel services
 *     tags: [Hotel Services]
 *     responses:
 *       200:
 *         description: List of featured services
 */
router.get('/featured', catchAsync(async (req, res) => {
  const user = req.user;
  const hotelId = user?.hotelId || req.query.hotelId;

  if (!hotelId) {
    return res.status(400).json({ status: 'error', message: 'Hotel context is required' });
  }

  const featuredServices = await HotelService.getFeaturedServices(hotelId);

  res.json({
    status: 'success',
    data: featuredServices
  });
}));

/**
 * @swagger
 * /hotel-services/{serviceId}:
 *   get:
 *     summary: Get specific hotel service details
 *     tags: [Hotel Services]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotel service details
 *       404:
 *         description: Service not found
 */
router.get('/:serviceId', catchAsync(async (req, res) => {
  const { serviceId } = req.params;
  
  const service = await HotelService.findById(serviceId)
    .populate('hotelId', 'name address').lean();
    
  if (!service) {
    throw new ApplicationError('Service not found', 404);
  }

  res.json({
    status: 'success',
    data: service
  });
}));

/**
 * @swagger
 * /hotel-services/{serviceId}/availability:
 *   get:
 *     summary: Check service availability
 *     tags: [Hotel Services]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability
 *       - in: query
 *         name: people
 *         required: true
 *         schema:
 *           type: integer
 *         description: Number of people
 *     responses:
 *       200:
 *         description: Availability status
 */
router.get('/:serviceId/availability', catchAsync(async (req, res) => {
  const { serviceId } = req.params;
  const { date, people } = req.query;
  
  if (!date || !people) {
    throw new ApplicationError('Date and number of people are required', 400);
  }
  
  const availability = await ServiceBooking.checkAvailability(
    serviceId,
    new Date(date),
    parseInt(people)
  );

  res.json({
    status: 'success',
    data: availability
  });
}));

/**
 * @swagger
 * /hotel-services/{serviceId}/bookings:
 *   post:
 *     summary: Book a hotel service
 *     tags: [Hotel Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
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
 *               - bookingDate
 *               - numberOfPeople
 *             properties:
 *               bookingDate:
 *                 type: string
 *                 format: date-time
 *               numberOfPeople:
 *                 type: integer
 *                 minimum: 1
 *               specialRequests:
 *                 type: string
 *     responses:
 *       201:
 *         description: Service booked successfully
 *       400:
 *         description: Invalid booking request
 */
router.post('/:serviceId/bookings',
  authenticate,
  authorizePolicy('hotelServices', 'baseAccess'),
  ensurePropertyAccess,
  validate(schemas.createServiceBooking),
  catchAsync(async (req, res) => {
    const { serviceId } = req.params;
    const { bookingDate, numberOfPeople, specialRequests } = req.body;
    
    // Get the service
    const service = await HotelService.findById(serviceId).lean();
    if (!service) {
      throw new ApplicationError('Service not found', 404);
    }
    
    // Check availability
    const availability = await ServiceBooking.checkAvailability(
      serviceId,
      new Date(bookingDate),
      numberOfPeople
    );
    
    if (!availability.available) {
      throw new ApplicationError(availability.reason, 400);
    }
    
    // Calculate total amount
    const totalAmount = service.price * numberOfPeople;
    
    // Create booking
    const booking = await ServiceBooking.create({
      userId: req.user._id,
      serviceId,
      hotelId: service.hotelId,
      bookingDate: new Date(bookingDate),
      numberOfPeople,
      totalAmount,
      currency: service.currency,
      specialRequests
    });
    
    // Populate booking data
    await booking.populate([
      { path: 'serviceId', select: 'name type price images' },
      { path: 'hotelId', select: 'name' }
    ]);

    res.status(201).json({
      status: 'success',
      data: {
        message: 'Service booked successfully',
        booking
      }
    });
  })
);

/**
 * @swagger
 * /hotel-services/bookings/{bookingId}/cancel:
 *   post:
 *     summary: Cancel a service booking
 *     tags: [Hotel Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Cannot cancel booking
 */
router.post('/bookings/:bookingId/cancel',
  authenticate,
  authorizePolicy('hotelServices', 'baseAccess'),
  ensurePropertyAccess,
  validate(schemas.cancelServiceBooking),
  catchAsync(async (req, res) => {
    const { bookingId } = req.params;
    const { reason } = req.body;
    
    // Do NOT use .lean() — we need the cancelBooking instance method
    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      throw new ApplicationError('Not authorized to cancel this booking', 403);
    }

    if (typeof booking.cancelBooking === 'function') {
      await booking.cancelBooking(reason, req.user._id);
    } else {
      // Fallback: update directly if instance method is not available
      booking.status = 'cancelled';
      booking.cancellationReason = reason;
      booking.cancelledBy = req.user._id;
      booking.cancelledAt = new Date();
      await booking.save();
    }

    res.json({
      status: 'success',
      data: {
        message: 'Booking cancelled successfully',
        booking
      }
    });
  })
);

export default router;
