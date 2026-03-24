import express from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
import { validate, schemas } from '../middleware/validation.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { dashboardUpdateService } from '../services/dashboardUpdateService.js';
import websocketService from '../services/websocketService.js';
import { marketingSyncMiddleware } from '../middleware/marketingSyncMiddleware.js';
import { bookingCompletionMiddleware } from '../middleware/crmTrackingMiddleware.js';
import logger from '../utils/logger.js';
import cancellationService from '../services/cancellationService.js';

const router = express.Router();

/**
 * @swagger
 * /bookings/current-hotel:
 *   get:
 *     summary: Get current user's hotel ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user's hotel ID
 */
router.get('/current-hotel', authenticate, ensureTenantContext, ensurePropertyAccess, catchAsync(async (req, res) => {
  res.json({
    status: 'success',
    data: {
      hotelId: req.user.hotelId
    }
  });
}));

/**
 * @swagger
 * /bookings/upcoming:
 *   get:
 *     summary: Get upcoming bookings (arrivals within next 7-30 days)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to look ahead for upcoming arrivals
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of upcoming bookings
 */
router.get('/upcoming', authenticate, ensureTenantContext, ensurePropertyAccess, catchAsync(async (req, res) => {
  const {
    days = 7,
    page = 1,
    limit = 50
  } = req.query;

  // Build query based on user role
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const futureDate = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000);

  // Query for upcoming bookings:
  // - confirmed/pending: checkIn is today or in the future (within specified days)
  // - checked_in: checkOut is in the future (guest is still in hotel)
  const query = {
    $or: [
      {
        // Future arrivals (confirmed or pending)
        status: { $in: ['confirmed', 'pending'] },
        checkIn: {
          $gte: today,
          $lte: futureDate
        }
      },
      {
        // Currently checked-in guests (not yet checked out)
        status: 'checked_in',
        checkOut: { $gt: today } // Checkout is in the future
      }
    ]
  };

  // Role-based filtering - wrap $or query with additional conditions
  const finalQuery = { ...query };

  if (req.user.role === 'guest') {
    finalQuery.userId = req.user._id;
  } else if ((req.user.role === 'staff' || req.user.role === 'frontdesk') && req.user.hotelId) {
    finalQuery.hotelId = req.user.hotelId;
  } else if (req.user.role === 'admin' && req.user.hotelId) {
    finalQuery.hotelId = req.user.hotelId;
  }
  // Admin sees bookings for their hotel, or all if no hotelId

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const bookings = await Booking.find(finalQuery)
    .populate('userId', 'name email phone')
    .populate('rooms.roomId', 'roomNumber type baseRate currentRate')
    .populate('hotelId', 'name address contact')
    .populate('corporateBooking.corporateCompanyId', 'name gstNumber')
    .sort({ checkIn: 1 }) // Sort by check-in date (ascending)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(finalQuery);

  // Get quick stats for today and tomorrow arrivals
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  // Count arrivals for today (confirmed or pending bookings checking in today)
  const todayQuery = {
    status: { $in: ['confirmed', 'pending'] },
    checkIn: { $gte: today, $lt: tomorrow }
  };

  // Count arrivals for tomorrow (confirmed or pending bookings checking in tomorrow)
  const tomorrowQuery = {
    status: { $in: ['confirmed', 'pending'] },
    checkIn: { $gte: tomorrow, $lt: dayAfterTomorrow }
  };

  // Add role-based filtering to stats queries
  if (req.user.role === 'guest') {
    todayQuery.userId = req.user._id;
    tomorrowQuery.userId = req.user._id;
  } else if ((req.user.role === 'staff' || req.user.role === 'admin' || req.user.role === 'frontdesk') && req.user.hotelId) {
    todayQuery.hotelId = req.user.hotelId;
    tomorrowQuery.hotelId = req.user.hotelId;
  }

  const [todayCount, tomorrowCount] = await Promise.all([
    Booking.countDocuments(todayQuery),
    Booking.countDocuments(tomorrowQuery)
  ]);

  res.json({
    status: 'success',
    results: bookings.length,
    stats: {
      todayArrivals: todayCount,
      tomorrowArrivals: tomorrowCount,
      totalUpcoming: total
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: bookings
  });
}));

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, checked_in, checked_out, cancelled, no_show]
 *       - in: query
 *         name: checkIn
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: checkOut
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [corporate, individual]
 *         description: Filter by booking type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of bookings
 */
router.get('/', authenticate, ensureTenantContext, ensurePropertyAccess, catchAsync(async (req, res) => {
  const {
    status,
    checkIn,
    checkOut,
    type,
    page = 1,
    limit = 10
  } = req.query;

  // Build query based on user role
  const query = {};

  if (req.user.role === 'guest') {
    query.userId = req.user._id;
  } else if ((req.user.role === 'staff' || req.user.role === 'frontdesk') && req.user.hotelId) {
    query.hotelId = req.user.hotelId;
  }
  // Admin sees all bookings

  if (status) {
    // Support comma-separated status values (e.g., "confirmed,pending,checked_in")
    if (status.includes(',')) {
      query.status = { $in: status.split(',').map(s => s.trim()) };
    } else {
      query.status = status;
    }
  }

  // Filter by booking type (corporate, individual)
  if (type === 'corporate') {
    query['corporateBooking.corporateCompanyId'] = { $exists: true, $ne: null };
  } else if (type === 'individual') {
    query.$or = [
      { 'corporateBooking.corporateCompanyId': { $exists: false } },
      { 'corporateBooking.corporateCompanyId': null }
    ];
  }

  if (checkIn) {
    query.checkIn = { $gte: new Date(checkIn) };
  }

  if (checkOut) {
    query.checkOut = { $lte: new Date(checkOut) };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const bookings = await Booking.find(query)
    .populate('userId', 'name email phone')
    .populate('rooms.roomId', 'roomNumber type baseRate currentRate')
    .populate('hotelId', 'name address contact')
    .populate('corporateBooking.corporateCompanyId', 'name gstNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(query);

  // Calculate stats for the current query
  const baseQuery = { ...query };
  delete baseQuery.status; // Remove status filter for overall counts

  const [
    totalBookings,
    pendingCount,
    allBookingsForStats
  ] = await Promise.all([
    Booking.countDocuments(baseQuery),
    Booking.countDocuments({ ...baseQuery, status: 'pending' }),
    Booking.find(baseQuery).select('totalAmount')
  ]);

  // Calculate average booking value
  const totalRevenue = allBookingsForStats.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  res.json({
    status: 'success',
    results: bookings.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    stats: {
      total: totalBookings,
      totalBookings,
      pending: pendingCount,
      pendingBookings: pendingCount,
      averageBookingValue,
      totalRevenue
    },
    data: bookings
  });
}));

/**
 * @swagger
 * /bookings/room/{roomId}:
 *   get:
 *     summary: Get bookings for a specific room
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, checked_in, checked_out, cancelled, no_show]
 *       - in: query
 *         name: timeFilter
 *         schema:
 *           type: string
 *           enum: [past, future, current, all]
 *         default: all
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of bookings for the room
 */
router.get('/room/:roomId', authenticate, ensureTenantContext, authorize('admin', 'staff', 'frontdesk'), ensurePropertyAccess, catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const { 
    status,
    timeFilter = 'all',
    page = 1,
    limit = 10
  } = req.query;
  
  // Validate room exists and user has access
  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApplicationError('Room not found', 404);
  }
  
  // Check if user has access to this hotel
  if ((req.user.role === 'staff' || req.user.role === 'frontdesk') && req.user.hotelId.toString() !== room.hotelId.toString()) {
    throw new ApplicationError('You do not have access to this room', 403);
  }
  
  // Build query
  const query = {
    'rooms.roomId': roomId
  };
  
  if (status) {
    query.status = status;
  }
  
  // Add time-based filters
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (timeFilter) {
    case 'past':
      query.checkOut = { $lt: today };
      break;
    case 'future':
      query.checkIn = { $gt: today };
      break;
    case 'current':
      query.$and = [
        { checkIn: { $lte: today } },
        { checkOut: { $gte: today } }
      ];
      break;
    // 'all' case - no additional filter needed
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const bookings = await Booking.find(query)
    .populate('userId', 'name email phone')
    .populate('rooms.roomId', 'roomNumber type baseRate currentRate')
    .populate('hotelId', 'name')
    .sort({ checkIn: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Booking.countDocuments(query);
  
  res.json({
    status: 'success',
    data: {
      bookings,
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
 * /bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details
 */
router.get('/:id', authenticate, ensureTenantContext, ensurePropertyAccess, catchAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('userId', 'name email phone')
    .populate('rooms.roomId', 'roomNumber type baseRate currentRate')
    .populate('hotelId', 'name address contact policies');

  if (!booking) {
    throw new ApplicationError('Booking not found', 404);
  }

  // Check access permissions
  if (req.user.role === 'guest' && booking.userId._id.toString() !== req.user._id.toString()) {
    throw new ApplicationError('You do not have permission to view this booking', 403);
  }

  if ((req.user.role === 'staff' || req.user.role === 'frontdesk') && booking.hotelId.toString() !== req.user.hotelId.toString()) {
    throw new ApplicationError('You do not have permission to view this booking', 403);
  }

  res.json({
    status: 'success',
    data: {
      booking
    }
  });
}));

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hotelId
 *               - roomIds
 *               - checkIn
 *               - checkOut
 *               - idempotencyKey
 *             properties:
 *               hotelId:
 *                 type: string
 *               roomIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               checkIn:
 *                 type: string
 *                 format: date
 *               checkOut:
 *                 type: string
 *                 format: date
 *               guestDetails:
 *                 type: object
 *               idempotencyKey:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 */
router.post('/',
  authenticate,
  ensureTenantContext,
  ensurePropertyAccess,
  bookingCompletionMiddleware,
  validate(schemas.createBooking),
  marketingSyncMiddleware('booking_created'),
  catchAsync(async (req, res) => {
    logger.debug('Create booking request received', { hotelId: req.body.hotelId, userId: req.body.userId });

    const {
      hotelId,
      userId,
      roomIds,
      checkIn,
      checkOut,
      guestDetails,
      totalAmount,
      currency,
      paymentStatus,
      status,
      idempotencyKey,
      roomType, // Add roomType field for room-type bookings
      // Payment information for walk-in bookings
      paymentMethod,
      advanceAmount,
      paymentReference,
      paymentNotes,
      // Walk-in guest details for auto-registration
      guestName,
      guestEmail,
      guestPhone
    } = req.body;

    logger.debug('Booking payment fields', { paymentMethod, hasAdvanceAmount: !!advanceAmount });

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Check for duplicate booking with same idempotency key (with intelligent expiration)
        const existingBooking = await Booking.findOne({ idempotencyKey });
        if (existingBooking) {
          // Allow reuse of idempotency key if:
          // 1. The existing booking is from the same user AND
          // 2. Either the existing booking is old (>1 hour) OR it's in a final state
          const isOldBooking = (Date.now() - existingBooking.createdAt.getTime()) > (60 * 60 * 1000); // 1 hour
          const isFinalState = ['checked_out', 'cancelled', 'no_show'].includes(existingBooking.status);
          const isSameUser = existingBooking.userId.toString() === (userId || req.user._id).toString();
          
          if (!isSameUser) {
            throw new ApplicationError(
              `Booking conflict detected. This booking reference is already in use by another user. ` +
              `Please refresh the page and try again.`, 
              409
            );
          }
          
          if (!isOldBooking && !isFinalState) {
            // Recent booking by same user that's still active
            const timeSinceCreated = Math.round((Date.now() - existingBooking.createdAt.getTime()) / (1000 * 60)); // minutes
            throw new ApplicationError(
              `Duplicate booking detected. You already have booking ${existingBooking.bookingNumber} created ${timeSinceCreated} minutes ago. ` +
              `If you want to make a different booking, please wait a few minutes or contact support.`, 
              409
            );
          }
          
          // Old booking or final state - allow new booking but log it
          logger.info('Reusing idempotency key', { bookingNumber: existingBooking.bookingNumber, reason: isFinalState ? 'completed' : 'old' });
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        let rooms = [];
        let roomsWithRates = [];

        // Only validate rooms if roomIds are provided
        if (roomIds && roomIds.length > 0) {
          // Get rooms and check availability
          rooms = await Room.find({
            _id: { $in: roomIds },
            hotelId,
            isActive: true
          });

          if (rooms.length !== roomIds.length) {
            throw new ApplicationError('One or more rooms not found or not available', 404);
          }

          // Check for overlapping bookings
          const overlappingBookings = await Booking.findOverlapping(
            roomIds,
            checkInDate,
            checkOutDate
          );

          if (overlappingBookings.length > 0) {
            const conflictingRooms = overlappingBookings.map(booking => {
              const conflictedRoom = rooms.find(room => 
                booking.rooms.some(bookingRoom => bookingRoom.roomId.toString() === room._id.toString())
              );
              return {
                roomNumber: conflictedRoom?.roomNumber || 'Unknown',
                conflictingBooking: booking.bookingNumber,
                conflictDates: `${booking.checkIn.toDateString()} - ${booking.checkOut.toDateString()}`,
                status: booking.status
              };
            });
            
            const roomDetails = conflictingRooms.map(room => 
              `Room ${room.roomNumber} (conflicting with booking ${room.conflictingBooking}, ${room.conflictDates}, status: ${room.status})`
            ).join('; ');
            
            throw new ApplicationError(
              `Room availability conflict detected. The following rooms are already booked for overlapping dates: ${roomDetails}. ` +
              `Please select different dates or contact support if you believe this is an error.`,
              409
            );
          }

          // Calculate rates from actual rooms
          roomsWithRates = rooms.map(room => ({
            roomId: room._id,
            rate: room.currentRate
          }));
        }
        // For bookings without room allocation, use empty rooms array

        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const calculatedTotal = roomsWithRates.length > 0 
          ? roomsWithRates.reduce((total, room) => total + room.rate, 0) * nights
          : 0; // No calculated total for bookings without room allocation

        // Create booking - use admin-provided values when available
        // Prepare payment details if payment information is provided
        logger.debug('Payment processing check', { paymentMethod, hasAdvanceAmount: !!advanceAmount });

        const paymentDetails = {};
        const numericAdvanceAmount = Number(advanceAmount);

        if (paymentMethod && numericAdvanceAmount > 0) {
          paymentDetails.paymentMethods = [{
            method: paymentMethod,
            amount: numericAdvanceAmount,
            reference: paymentReference || '',
            processedBy: req.user._id,
            processedAt: new Date(),
            notes: paymentNotes || 'Walk-in booking payment'
          }];
          paymentDetails.totalPaid = numericAdvanceAmount;
          paymentDetails.remainingAmount = Math.max(0, (totalAmount || calculatedTotal) - numericAdvanceAmount);
          paymentDetails.collectedAt = new Date();
          paymentDetails.collectedBy = req.user._id;
          logger.debug('Payment details created for booking');
        } else {
          logger.debug('Payment skipped - conditions not met');
        }

        // Look up rate plan for cancellation policy snapshot
        let ratePlanSnapshot = { cancellationPolicy: { type: 'flexible', hoursBeforeCheckIn: 24, penaltyPercentage: 0 } };
        if (req.body.ratePlanId) {
          try {
            const { RatePlan } = await import('../models/RateManagement.js');
            const ratePlan = await RatePlan.findOne({ planId: req.body.ratePlanId });
            if (ratePlan?.cancellationPolicy) {
              ratePlanSnapshot = { cancellationPolicy: ratePlan.cancellationPolicy };
            }
          } catch (e) { /* Use default policy */ }
        }

        // Auto-create guest for walk-in bookings if no userId provided
        let resolvedUserId = userId;
        if (!resolvedUserId && guestName) {
          try {
            // Check if guest exists by phone or email
            let guestUser = null;
            if (guestEmail) {
              guestUser = await User.findOne({ email: guestEmail });
            }
            if (!guestUser && guestPhone) {
              guestUser = await User.findOne({ phone: guestPhone });
            }

            if (!guestUser) {
              const crypto = await import('crypto');
              guestUser = await User.create({
                name: guestName,
                email: guestEmail || `walkin_${Date.now()}@placeholder.local`,
                phone: guestPhone || '',
                role: 'guest',
                password: crypto.randomBytes(16).toString('hex'),
                hotelId: hotelId,
                isActive: true
              });
              logger.info('Auto-created guest for walk-in booking', { userId: guestUser._id });
            }

            resolvedUserId = guestUser._id;
          } catch (guestError) {
            logger.warn('Failed to auto-create guest for walk-in', { error: guestError.message });
          }
        }

        const booking = await Booking.create([{
          hotelId,
          userId: resolvedUserId || req.user._id, // Use provided userId for admin bookings, fallback to current user
          rooms: roomsWithRates,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights,
          guestDetails,
          totalAmount: totalAmount || calculatedTotal, // Use provided total or calculated total (required for non-room bookings)
          currency: currency || 'INR',
          idempotencyKey,
          status: status || 'pending',
          paymentStatus: paymentStatus || 'pending',
          roomType, // Add roomType for room-type preference bookings
          ratePlanSnapshot,
          ...paymentDetails // Spread payment details if provided
        }], { session });

        // Create corresponding invoice for billing history
        const finalAmount = totalAmount || calculatedTotal;
        const bookingCurrency = currency || 'INR';
        
        // Calculate due date (typically 30 days from issue date)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        
        // Create invoice items from room charges
        const invoiceItems = roomsWithRates.length > 0 
          ? roomsWithRates.map(room => {
              const roomDetails = rooms.find(r => r._id.toString() === room.roomId.toString());
              return {
                description: `Room ${roomDetails?.roomNumber || 'N/A'} - ${roomDetails?.type || 'Standard'} (${nights} nights)`,
                category: 'accommodation',
                quantity: nights,
                unitPrice: room.rate,
                totalPrice: room.rate * nights,
                taxRate: 10, // Standard 10% tax rate
                taxAmount: (room.rate * nights * 10) / 100
              };
            })
          : [{
              description: `Accommodation Booking (${nights} nights) - Room allocation pending`,
              category: 'accommodation',
              quantity: nights,
              unitPrice: Math.round(finalAmount / nights),
              totalPrice: finalAmount,
              taxRate: 18, // 18% GST for Indian bookings
              taxAmount: 0 // Tax already included in finalAmount from frontend
            }];
        
        // Calculate subtotal and tax
        const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const taxAmount = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
        const totalWithTax = subtotal + taxAmount;
        
        const invoice = await Invoice.create([{
          hotelId,
          bookingId: booking[0]._id,
          guestId: resolvedUserId || req.user._id,
          type: 'accommodation',
          status: paymentStatus === 'paid' ? 'paid' : 'issued',
          items: invoiceItems,
          subtotal,
          taxAmount,
          totalAmount: totalWithTax,
          currency: bookingCurrency,
          dueDate,
          paidDate: paymentStatus === 'paid' ? new Date() : null,
          payments: paymentStatus === 'paid' ? [{
            amount: totalWithTax,
            method: 'credit_card', // Default method, can be updated later
            paidBy: resolvedUserId || req.user._id,
            paidAt: new Date(),
            notes: 'Booking payment'
          }] : []
        }], { session });

        // Notify admin dashboard of new booking
        await dashboardUpdateService.notifyNewBooking(booking[0], req.user);
        await dashboardUpdateService.triggerDashboardRefresh(hotelId, 'bookings');

        // Real-time WebSocket notifications
        try {
          // Notify hotel staff and admins of new booking
          await websocketService.broadcastToHotel(hotelId, 'booking:created', {
            booking: booking[0],
            invoice: invoice[0],
            user: req.user
          });

          // Notify the guest who created the booking
          if (booking[0].userId) {
            await websocketService.sendToUser(booking[0].userId.toString(), 'booking:created', {
              booking: booking[0],
              invoice: invoice[0]
            });
          }

          // Notify staff roles specifically
          await websocketService.broadcastToRole('staff', 'booking:created', booking[0]);
          await websocketService.broadcastToRole('admin', 'booking:created', booking[0]);
          await websocketService.broadcastToRole('manager', 'booking:created', booking[0]);
        } catch (wsError) {
          // Log WebSocket errors but don't fail the booking creation
          logger.warn('Failed to send real-time booking notification', { error: wsError.message });
        }

        res.status(201).json({
          status: 'success',
          data: {
            booking: booking[0],
            invoice: invoice[0]
          }
        });
      });
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }
  })
);

/**
 * @swagger
 * /bookings/{id}:
 *   patch:
 *     summary: Update booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking updated successfully
 */
router.patch('/:id',
  authenticate,
  ensureTenantContext,
  ensurePropertyAccess,
  marketingSyncMiddleware('booking_updated'),
  catchAsync(async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check permissions
    if (req.user.role === 'guest' && booking.userId.toString() !== req.user._id.toString()) {
      throw new ApplicationError('You do not have permission to modify this booking', 403);
    }

    if ((req.user.role === 'staff' || req.user.role === 'frontdesk') && booking.hotelId.toString() !== req.user.hotelId.toString()) {
      throw new ApplicationError('You do not have permission to modify this booking', 403);
    }

    // Restrict certain fields for guests
    const allowedFields = req.user.role === 'guest' 
      ? ['guestDetails'] 
      : Object.keys(req.body);

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const originalBooking = await Booking.findById(req.params.id);
    const oldPaymentStatus = originalBooking?.paymentStatus;

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'rooms.roomId', select: 'roomNumber type baseRate currentRate' },
      { path: 'userId', select: 'name email phone' },
      { path: 'hotelId', select: 'name address contact' }
    ]);

    // Update corresponding invoice if payment status changed
    if (updateData.paymentStatus && ['admin', 'staff'].includes(req.user.role)) {
      const invoice = await Invoice.findOne({ bookingId: req.params.id });
      if (invoice) {
        if (updateData.paymentStatus === 'paid' && invoice.status !== 'paid') {
          // Mark invoice as paid
          invoice.status = 'paid';
          invoice.paidDate = new Date();
          
          // Add payment record if not exists
          const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
          if (totalPaid < invoice.totalAmount) {
            invoice.payments.push({
              amount: invoice.totalAmount - totalPaid,
              method: 'credit_card', // Default method
              paidBy: updatedBooking.userId,
              paidAt: new Date(),
              notes: 'Payment status updated via booking'
            });
          }
        } else if (updateData.paymentStatus === 'pending' && invoice.status === 'paid') {
          // Revert invoice to issued status
          invoice.status = 'issued';
          invoice.paidDate = null;
          invoice.payments = []; // Clear payments
        }
        
        await invoice.save();
      }

      // Notify admin dashboard if payment status changed
      if (oldPaymentStatus !== updateData.paymentStatus) {
        await dashboardUpdateService.notifyPaymentUpdate(updatedBooking, oldPaymentStatus, updateData.paymentStatus, updatedBooking.userId);
        await dashboardUpdateService.triggerDashboardRefresh(updatedBooking.hotelId, 'payments');
      }
    }

    // Real-time WebSocket notifications for booking update
    try {
      // Notify hotel staff and admins of booking update
      await websocketService.broadcastToHotel(updatedBooking.hotelId, 'booking:updated', {
        booking: updatedBooking,
        updateData,
        updatedBy: req.user
      });

      // Notify the guest who owns the booking
      if (updatedBooking.userId) {
        await websocketService.sendToUser(updatedBooking.userId.toString(), 'booking:updated', {
          booking: updatedBooking,
          updateData
        });
      }

      // Notify staff roles specifically if payment status changed
      if (oldPaymentStatus !== updateData.paymentStatus) {
        await websocketService.broadcastToRole('staff', 'booking:payment_updated', {
          booking: updatedBooking,
          oldPaymentStatus,
          newPaymentStatus: updateData.paymentStatus
        });
        await websocketService.broadcastToRole('admin', 'booking:payment_updated', {
          booking: updatedBooking,
          oldPaymentStatus,
          newPaymentStatus: updateData.paymentStatus
        });
      }
    } catch (wsError) {
      // Log WebSocket errors but don't fail the booking update
      logger.warn('Failed to send real-time booking update notification', { error: wsError.message });
    }

    res.json({
      status: 'success',
      data: {
        booking: updatedBooking
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 */
router.patch('/:id/cancel',
  authenticate,
  ensureTenantContext,
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check permissions
    if (req.user.role === 'guest' && booking.userId.toString() !== req.user._id.toString()) {
      throw new ApplicationError('You do not have permission to cancel this booking', 403);
    }

    if (!booking.canCancel()) {
      throw new ApplicationError('This booking cannot be cancelled', 400);
    }

    // Calculate refund based on cancellation policy
    const refundCalc = cancellationService.calculateRefund(booking);

    // Store refund details on booking
    booking.settlementTracking = booking.settlementTracking || {};
    booking.settlementTracking.refundAmount = refundCalc.refundAmount;
    booking.settlementTracking.penaltyAmount = refundCalc.penaltyAmount;

    // Process Stripe refund if applicable
    if (refundCalc.refundAmount > 0) {
      try {
        await cancellationService.processStripeRefund(booking, refundCalc.refundAmount);
      } catch (refundError) {
        logger.warn('Stripe refund failed, manual processing needed', {
          bookingId: booking._id, error: refundError.message
        });
      }
    }

    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason || 'Cancelled by user';
    await booking.save();

    // Release room availability for cancelled dates
    if (booking.rooms && booking.rooms.length > 0) {
      const RoomAvailability = (await import('../models/RoomAvailability.js')).default;
      if (RoomAvailability) {
        await RoomAvailability.updateMany(
          { bookingId: booking._id },
          { $set: { status: 'available', bookingId: null } }
        ).catch(err => logger.warn('Failed to release room inventory', { error: err.message }));
      }
    }

    // Notify admin dashboard of booking cancellation
    await dashboardUpdateService.notifyBookingCancellation(booking, req.user, req.body.reason);
    await dashboardUpdateService.triggerDashboardRefresh(booking.hotelId, 'bookings');

    // Broadcast booking cancellation via WebSocket
    try {
      websocketService.broadcastToHotel(booking.hotelId?.toString() || booking.hotelId, 'booking_cancelled', {
        bookingId: booking._id,
        rooms: booking.rooms
      });
    } catch (e) { /* WebSocket is non-critical */ }

    res.json({
      status: 'success',
      data: {
        booking,
        refund: refundCalc
      }
    });
  })
);

// Change room for a booking (for drag & drop in tape chart)
router.post('/change-room',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { bookingId, newRoomId, newRoomNumber, reason, changeDate } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Find the room in the booking's rooms array and update it
    if (booking.rooms && booking.rooms.length > 0) {
      booking.rooms[0].roomId = new mongoose.Types.ObjectId(newRoomId);
      // Add a note about the room change
      if (!booking.notes) booking.notes = [];
      booking.notes.push(`Room changed to ${newRoomNumber} on ${new Date().toISOString()} by ${req.user.name}. Reason: ${reason}`);
      
      await booking.save();
      
      res.json({
        success: true,
        data: {
          booking,
          message: `Room changed to ${newRoomNumber} successfully`
        }
      });
    } else {
      throw new ApplicationError('Booking has no rooms to change', 400);
    }
  })
);

// Change room by finding booking via guest details or booking ID (for drag & drop in tape chart)
router.post('/change-room-by-guest',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    logger.debug('Change room by guest request', { bookingId: req.body.bookingId, newRoomId: req.body.newRoomId });

    const { bookingId, guestName, checkIn, checkOut, newRoomId, newRoomNumber, reason } = req.body;

    let booking;

    // First try to find by bookingId if provided
    if (bookingId) {
      logger.debug('Searching by booking ID', { bookingId });
      booking = await Booking.findById(bookingId);
    }

    // If not found by ID, search by guest name and dates
    if (!booking && guestName) {
      logger.debug('Searching by guest name and dates');

      // Find the user by name
      const user = await User.findOne({
        name: { $regex: new RegExp(guestName, 'i') }
      });

      if (user) {
        logger.debug('Found user for room change', { userId: user._id });

        // Create flexible date range to handle timezone issues
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        checkInDate.setHours(0, 0, 0, 0);
        checkOutDate.setHours(23, 59, 59, 999);

        // Search with date range
        const searchQuery = {
          userId: user._id,
          checkIn: {
            $gte: new Date(checkInDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
            $lte: new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000)  // 1 day after
          },
          checkOut: {
            $gte: new Date(checkOutDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
            $lte: new Date(checkOutDate.getTime() + 24 * 60 * 60 * 1000)  // 1 day after
          }
        };

        logger.debug('Booking search query constructed');
        booking = await Booking.findOne(searchQuery);
      } else {
        logger.debug('No user found for room change lookup');
      }
    }

    if (!booking) {
      logger.debug('No booking found for room change');
      throw new ApplicationError(`Booking not found for ${guestName || bookingId}`, 404);
    }

    logger.debug('Found booking for room change', { bookingId: booking._id, status: booking.status });

    // Ensure rooms array exists
    if (!booking.rooms) {
      booking.rooms = [];
    }

    // Check if booking is cancelled and reactivate it if needed
    if (booking.status === 'cancelled') {
      logger.info('Reactivating cancelled booking for room assignment', { bookingId: booking._id });
      booking.status = 'confirmed';
      booking.lastStatusChange = {
        from: 'cancelled',
        to: 'confirmed',
        timestamp: new Date(),
        reason: 'Reactivated for room assignment'
      };
    }

    // Find the room to get its rate and validate room type
    const Room = mongoose.model('Room');
    const room = await Room.findById(newRoomId);

    if (!room) {
      throw new ApplicationError(`Room not found: ${newRoomNumber}`, 404);
    }

    logger.debug('Room details for assignment', { roomNumber: room.roomNumber, roomType: room.roomType, isActive: room.isActive });

    // Validate room type compatibility
    if (booking.roomType && room.roomType) {
      const bookingRoomType = booking.roomType.toLowerCase();
      const actualRoomType = room.roomType.toLowerCase();

      // Check if room types match (allow some flexibility for similar types)
      const isCompatible =
        bookingRoomType === actualRoomType ||
        (bookingRoomType === 'deluxe' && actualRoomType === 'deluxe') ||
        (bookingRoomType === 'suite' && actualRoomType === 'suite') ||
        (bookingRoomType === 'single' && actualRoomType === 'single') ||
        (bookingRoomType === 'double' && actualRoomType === 'double');

      if (!isCompatible) {
        logger.debug('Room type mismatch detected', { bookingType: booking.roomType, roomType: room.roomType });
        throw new ApplicationError(
          `Room type mismatch: Booking requires ${booking.roomType} but room ${newRoomNumber} is ${room.roomType}`,
          400
        );
      }
    }

    // Validate that the target date is within the booking's check-in/check-out period
    const { newCheckInDate } = req.body;
    if (newCheckInDate) {
      const targetDate = new Date(newCheckInDate);
      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);

      // Normalize dates to compare only the date part
      targetDate.setHours(0, 0, 0, 0);
      bookingCheckIn.setHours(0, 0, 0, 0);
      bookingCheckOut.setHours(0, 0, 0, 0);

      logger.debug('Date validation for room change', { bookingId: booking._id });

      // Check if target date is within the booking period (inclusive of check-in, exclusive of check-out)
      if (targetDate < bookingCheckIn || targetDate >= bookingCheckOut) {
        throw new ApplicationError(
          `Date mismatch: Cannot assign guest to ${targetDate.toDateString()}. Booking is only valid from ${bookingCheckIn.toDateString()} to ${new Date(bookingCheckOut.getTime() - 1).toDateString()}`,
          400
        );
      }
    }

    // Check if room is active and available
    if (!room.isActive) {
      throw new ApplicationError(`Room ${newRoomNumber} is not active`, 400);
    }

    const roomRate = room.price || booking.totalAmount / booking.nights || 100;

    // Handle bookings without rooms (new bookings) or with existing rooms
    if (booking.rooms.length > 0) {
      // Update existing room
      logger.debug('Updating existing room assignment', { bookingId: booking._id, newRoomId });
      booking.rooms[0].roomId = new mongoose.Types.ObjectId(newRoomId);
      booking.rooms[0].rate = roomRate;
    } else {
      // Add new room to booking
      logger.debug('Adding new room to booking', { bookingId: booking._id, newRoomId });
      booking.rooms.push({
        roomId: new mongoose.Types.ObjectId(newRoomId),
        rate: roomRate
      });
    }

    // Add a note about the room assignment/change
    if (!booking.notes) booking.notes = [];
    booking.notes.push(`Room assigned/changed to ${newRoomNumber} on ${new Date().toISOString()} by ${req.user.name}. Reason: ${reason}`);

    logger.debug('Saving booking with updated room', { bookingId: booking._id });
    await booking.save();

    logger.info('Room change saved successfully', { bookingId: booking._id, newRoomId });

    // Populate the updated booking with user and room details
    await booking.populate('userId', 'name email');
    await booking.populate('rooms.roomId', 'roomNumber roomType');

    res.json({
      success: true,
      data: {
        booking,
        message: `${guestName || 'Booking'}'s room assigned to ${newRoomNumber} successfully`
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/modification-request:
 *   post:
 *     summary: Create a booking modification request
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modificationType:
 *                 type: string
 *                 enum: [date_change, room_upgrade, guest_count, early_checkin, late_checkout, cancellation]
 *               requestedChanges:
 *                 type: object
 *               reason:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *     responses:
 *       200:
 *         description: Modification request created successfully
 */
router.post('/:id/modification-request',
  authenticate,
  ensureTenantContext,
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { modificationType, requestedChanges, reason, priority = 'medium' } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId).populate('userId hotelId');
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check if user owns this booking or is staff/admin
    const isOwner = booking.userId._id.toString() === req.user._id.toString();
    const isStaff = ['admin', 'staff', 'manager'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      throw new ApplicationError('You are not authorized to modify this booking', 403);
    }

    // Create modification request object following the booking schema
    const modificationRequest = {
      modificationId: new mongoose.Types.ObjectId().toString(),
      modificationType,
      modificationDate: new Date(),
      modifiedBy: {
        source: req.user.role === 'admin' || req.user.role === 'staff' || req.user.role === 'frontdesk' ? 'admin' : 'guest',
        userId: req.user._id.toString(),
        userName: req.user.name,
        ipAddress: req.ip || 'unknown'
      },
      oldValues: {
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        roomType: booking.roomType,
        totalAmount: booking.totalAmount,
        guestDetails: booking.guestDetails
      },
      newValues: requestedChanges,
      reason,
      autoApproved: false
    };

    // Add to booking's modifications array
    if (!booking.modifications) booking.modifications = [];
    booking.modifications.push(modificationRequest);

    await booking.save();

    // Notify staff/admin about new modification request
    try {
      if (websocketService) {
        const notificationData = {
          type: 'booking_modification_request',
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          guestName: booking.userId.name,
          modificationType,
          priority,
          requestedChanges,
          reason,
          requestedBy: req.user.name,
          hotelId: booking.hotelId._id
        };

        // Notify hotel staff and admins
        await websocketService.broadcastToHotel(booking.hotelId._id, 'booking:modification_requested', notificationData);
        await websocketService.broadcastToRole('admin', 'booking:modification_requested', notificationData);
        await websocketService.broadcastToRole('staff', 'booking:modification_requested', notificationData);
      }
    } catch (wsError) {
      logger.warn('WebSocket notification failed', { error: wsError.message });
    }

    res.json({
      status: 'success',
      data: {
        modificationRequest,
        message: 'Modification request submitted successfully'
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/modification-requests:
 *   get:
 *     summary: Get modification requests for a booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Modification requests retrieved successfully
 */
router.get('/:id/modification-requests',
  authenticate,
  ensureTenantContext,
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name email');

    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check permissions
    const isOwner = booking.userId._id.toString() === req.user._id.toString();
    const isStaff = ['admin', 'staff', 'manager'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      throw new ApplicationError('You are not authorized to view modification requests for this booking', 403);
    }

    res.json({
      status: 'success',
      data: {
        modifications: booking.modifications || []
      }
    });
  })
);

// Get booking audit trail (modification history + status history)
router.get('/:id/audit-trail',
  authenticate,
  ensureTenantContext,
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const booking = await Booking.findById(req.params.id)
      .select('modificationHistory statusHistory modifications bookingNumber');

    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Combine and sort all audit entries by date
    const auditTrail = [
      ...(booking.modificationHistory || []).map(m => ({
        type: 'field_change',
        timestamp: m.modifiedAt,
        ...m.toObject()
      })),
      ...(booking.statusHistory || []).map(s => ({
        type: 'status_change',
        timestamp: s.timestamp,
        ...s.toObject()
      })),
      ...(booking.modifications || []).map(m => ({
        type: 'ota_modification',
        timestamp: m.modificationDate,
        ...m.toObject()
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      status: 'success',
      data: { bookingNumber: booking.bookingNumber, auditTrail }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/modification-requests/{requestId}/review:
 *   patch:
 *     summary: Review (approve/reject) a booking modification request
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Modification Request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               reviewNotes:
 *                 type: string
 *               approvedChanges:
 *                 type: object
 *     responses:
 *       200:
 *         description: Modification request reviewed successfully
 */
router.patch('/:id/modification-requests/:requestId/review',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'manager', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { action, reviewNotes, approvedChanges } = req.body;
    const { id: bookingId, requestId } = req.params;

    const booking = await Booking.findById(bookingId).populate('userId hotelId');
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    const modificationRequest = booking.modifications.find(
      mod => mod.modificationId === requestId
    );

    if (!modificationRequest) {
      throw new ApplicationError('Modification request not found', 404);
    }

    // For now, we'll track status in the reason field since the schema doesn't have a status field
    if (modificationRequest.reason && modificationRequest.reason.includes('REVIEWED:')) {
      throw new ApplicationError('Modification request has already been reviewed', 400);
    }

    // Update modification request
    modificationRequest.reason = `${modificationRequest.reason || ''} REVIEWED: ${action.toUpperCase()} by ${req.user.name}. ${reviewNotes || ''}`.trim();

    if (action === 'approve' && approvedChanges) {
      modificationRequest.approvedChanges = approvedChanges;

      // Apply approved changes to booking
      if (approvedChanges.checkIn) booking.checkIn = new Date(approvedChanges.checkIn);
      if (approvedChanges.checkOut) booking.checkOut = new Date(approvedChanges.checkOut);
      if (approvedChanges.totalAmount) booking.totalAmount = approvedChanges.totalAmount;
      if (approvedChanges.guestDetails) {
        booking.guestDetails = { ...booking.guestDetails, ...approvedChanges.guestDetails };
      }

      // Add status history entry
      booking.statusHistory.push({
        status: booking.status,
        timestamp: new Date(),
        changedBy: {
          source: 'staff',
          userId: req.user._id,
          userName: req.user.name
        },
        reason: `Booking modified: ${modificationRequest.modificationType}`,
        automaticTransition: false,
        validatedTransition: true
      });
    }

    await booking.save();

    // Notify guest about decision
    try {
      if (websocketService) {
        const notificationData = {
          type: 'booking_modification_reviewed',
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          modificationType: modificationRequest.modificationType,
          status: modificationRequest.status,
          reviewNotes,
          reviewedBy: req.user.name,
          hotelId: booking.hotelId._id
        };

        // Notify the guest
        await websocketService.notifyUser(booking.userId._id, 'booking:modification_reviewed', notificationData);
      }
    } catch (wsError) {
      logger.warn('WebSocket notification failed', { error: wsError.message });
    }

    res.json({
      status: 'success',
      data: {
        modificationRequest,
        message: `Modification request ${action}d successfully`
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/check-in:
 *   patch:
 *     summary: Check-in a guest
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentDetails:
 *                 type: object
 *                 properties:
 *                   paymentMethods:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         method:
 *                           type: string
 *                           enum: [cash, card, upi, online_portal, corporate]
 *                         amount:
 *                           type: number
 *                         reference:
 *                           type: string
 *                         notes:
 *                           type: string
 *     responses:
 *       200:
 *         description: Guest checked in successfully
 */
router.patch('/:id/check-in',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check permissions
    if ((req.user.role === 'staff' || req.user.role === 'frontdesk') && booking.hotelId.toString() !== req.user.hotelId.toString()) {
      throw new ApplicationError('You do not have permission to check-in this booking', 403);
    }

    // Log current booking status for debugging
    logger.debug('Check-in attempt', { bookingId: booking._id, bookingNumber: booking.bookingNumber, currentStatus: booking.status });

    // Validate booking status - allow pending and confirmed for frontdesk operations
    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      throw new ApplicationError(`Cannot check-in booking with status '${booking.status}'. Only pending or confirmed bookings can be checked in.`, 400);
    }

    const { paymentDetails } = req.body;

    // Auto-confirm pending bookings before checking in
    if (booking.status === 'pending') {
      booking.status = 'confirmed';
      booking.lastStatusChange = {
        from: 'pending',
        to: 'confirmed',
        timestamp: new Date(),
        reason: 'Auto-confirmed during check-in'
      };
      await booking.save();
    }

    // Update booking with check-in information
    const updateData = {
      status: 'checked_in',
      checkInTime: new Date(), // Auto-update check-in time
      lastStatusChange: {
        from: 'confirmed', // Always confirmed at this point
        to: 'checked_in',
        timestamp: new Date(),
        reason: 'Guest checked in'
      }
    };

    // Add payment details if provided
    if (paymentDetails && paymentDetails.paymentMethods) {
      updateData.paymentDetails = {
        ...paymentDetails,
        collectedAt: new Date(),
        collectedBy: req.user._id
      };
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'rooms.roomId', select: 'roomNumber type baseRate currentRate' },
      { path: 'userId', select: 'name email phone' },
      { path: 'hotelId', select: 'name address contact' }
    ]);

    // Add to status history
    updatedBooking.statusHistory.push({
      status: 'checked_in',
      timestamp: new Date(),
      changedBy: {
        source: 'admin',
        userId: req.user._id.toString(),
        userName: req.user.name
      },
      reason: 'Guest checked in',
      automaticTransition: false,
      validatedTransition: true
    });

    // Process payment collection if provided
    if (paymentDetails && paymentDetails.paymentMethods && Array.isArray(paymentDetails.paymentMethods)) {
      // Calculate total payment amount
      const totalPaymentAmount = paymentDetails.paymentMethods.reduce((sum, pm) => sum + (pm.amount || 0), 0);

      // Initialize paymentHistory if it doesn't exist
      if (!updatedBooking.paymentHistory) {
        updatedBooking.paymentHistory = [];
      }

      // Add each payment to payment history
      paymentDetails.paymentMethods.forEach((pm) => {
        updatedBooking.paymentHistory.push({
          amount: pm.amount || 0,
          method: pm.method || 'cash',
          reference: pm.reference || '',
          notes: pm.notes || 'Payment collected at check-in',
          collectedBy: req.user._id,
          collectedAt: new Date(),
          status: 'completed'
        });
      });

      logger.info('Check-in payment processed', { bookingNumber: updatedBooking.bookingNumber, paymentAmount: totalPaymentAmount });
    }

    // Capture ID verification if provided
    if (req.body.idVerification) {
      updatedBooking.idVerification = {
        ...req.body.idVerification,
        verified: true,
        verifiedBy: req.user._id,
        verifiedAt: new Date()
      };
    }

    // Save the booking - this will trigger pre-save hooks to calculate paymentDetails.totalPaid
    await updatedBooking.save();

    logger.debug('Post-save payment status', { bookingNumber: updatedBooking.bookingNumber, paymentStatus: updatedBooking.paymentStatus });

    // Calculate balance information for frontend
    const totalPaid = updatedBooking.paymentDetails?.totalPaid || 0;
    const balanceInfo = {
      totalAmount: updatedBooking.totalAmount || 0,
      totalPaid: totalPaid,
      balanceRemaining: (updatedBooking.totalAmount || 0) - totalPaid,
      paymentCollected: paymentDetails && paymentDetails.paymentMethods ? true : false
    };

    // Broadcast room status change via WebSocket after check-in
    try {
      websocketService.broadcastToHotel(booking.hotelId?.toString() || booking.hotelId, 'room_status_changed', {
        roomId: booking.rooms?.[0]?.roomId,
        status: 'occupied',
        bookingId: booking._id,
        guestName: booking.guestDetails?.name || 'Guest'
      });
    } catch (e) { /* WebSocket is non-critical */ }

    res.json({
      status: 'success',
      data: {
        booking: updatedBooking,
        balanceInfo,
        message: 'Guest checked in successfully'
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/check-out:
 *   patch:
 *     summary: Check-out a guest
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Guest checked out successfully
 */
router.patch('/:id/check-out',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // ensurePropertyAccess middleware already verified access
    // No need for additional hotelId check - supports multi-property

    // Validate booking status
    if (booking.status !== 'checked_in') {
      throw new ApplicationError('Only checked-in bookings can be checked out', 400);
    }

    // CRITICAL: Validate payment balance BEFORE allowing checkout
    // Guests cannot checkout with outstanding balance unless explicitly bypassed
    const { bypassBalanceCheck, bypassReason } = req.body;
    const totalAmount = booking.totalAmount || 0;
    const totalPaid = booking.paymentDetails?.totalPaid || 0;
    const outstandingBalance = totalAmount - totalPaid;

    logger.debug('Checkout payment validation', { bookingNumber: booking.bookingNumber, outstandingBalance, bypassBalanceCheck });

    if (outstandingBalance > 0 && !bypassBalanceCheck) {
      throw new ApplicationError(
        `Cannot check out guest with outstanding balance of ₹${outstandingBalance.toLocaleString()}. Please collect payment first or use bypass checkout.`,
        400,
        'OUTSTANDING_BALANCE'
      );
    }

    // Log bypass action for audit trail
    if (bypassBalanceCheck && outstandingBalance > 0) {
      logger.warn('Bypass checkout with outstanding balance', {
        bookingNumber: booking.bookingNumber,
        outstandingBalance,
        bypassReason: bypassReason || 'No reason provided',
        bypassedBy: req.user._id
      });

      // Add to booking notes for audit
      if (!booking.notes) {
        booking.notes = [];
      }
      booking.notes.push({
        text: `BYPASS CHECKOUT - Outstanding balance: ₹${outstandingBalance}. Reason: ${bypassReason || 'Not specified'}`,
        createdBy: req.user._id,
        createdAt: new Date(),
        type: 'bypass_checkout'
      });
    }

    // Update booking with check-out information
    const updateData = {
      status: 'checked_out',
      checkOutTime: new Date(), // Auto-update check-out time
      lastStatusChange: {
        from: booking.status,
        to: 'checked_out',
        timestamp: new Date(),
        reason: 'Guest checked out'
      }
    };

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'rooms.roomId', select: 'roomNumber type baseRate currentRate' },
      { path: 'userId', select: 'name email phone' },
      { path: 'hotelId', select: 'name address contact' }
    ]);

    // Add to status history
    updatedBooking.statusHistory.push({
      status: 'checked_out',
      timestamp: new Date(),
      changedBy: {
        source: 'admin',
        userId: req.user._id.toString(),
        userName: req.user.name
      },
      reason: 'Guest checked out',
      automaticTransition: false,
      validatedTransition: true
    });

    await updatedBooking.save();

    // Update room status to 'dirty' for housekeeping
    if (updatedBooking.rooms && updatedBooking.rooms.length > 0) {
      for (const room of updatedBooking.rooms) {
        if (room.roomId) {
          const roomId = room.roomId._id || room.roomId;
          await Room.findByIdAndUpdate(roomId, {
            status: 'dirty',
            lastCheckout: new Date()
          });
        }
      }
      logger.debug('Room status updated to dirty at checkout', {
        bookingNumber: updatedBooking.bookingNumber,
        roomCount: updatedBooking.rooms.length
      });
    }

    // Auto-generate final invoice at checkout
    try {
      // Check if a final invoice already exists
      const existingInvoice = await Invoice.findOne({
        bookingId: booking._id,
        type: 'accommodation',
        status: { $ne: 'cancelled' }
      });

      if (!existingInvoice) {
        const invoiceData = {
          hotelId: booking.hotelId,
          bookingId: booking._id,
          guestId: booking.userId,
          type: 'accommodation',
          status: 'issued',
          invoiceDate: new Date(),
          dueDate: new Date(),
          items: [{
            description: `Room charges - ${booking.nights || 1} night(s)`,
            quantity: booking.nights || 1,
            unitPrice: booking.totalAmount / Math.max(booking.nights || 1, 1),
            amount: booking.totalAmount,
            category: 'room_charge'
          }],
          subtotal: booking.totalAmount,
          totalAmount: booking.totalAmount,
          currency: booking.currency || 'INR',
          notes: `Auto-generated at checkout for booking ${booking.bookingNumber || booking._id}`
        };

        await Invoice.create(invoiceData);
        logger.info('Invoice auto-generated at checkout', { bookingId: booking._id });
      }
    } catch (invoiceError) {
      logger.warn('Failed to auto-generate invoice at checkout', {
        bookingId: booking._id, error: invoiceError.message
      });
    }

    // AUTO-CREATE SETTLEMENT AT CHECKOUT
    // This ensures balance tracking starts immediately
    const settlement = updatedBooking.calculateSettlement();

    // Initialize settlement tracking if balance due or refund needed
    if (settlement.outstandingBalance > 0 || settlement.refundAmount > 0) {
      updatedBooking.settlementTracking = {
        status: settlement.outstandingBalance > 0 ? 'pending' :
                settlement.refundAmount > 0 ? 'refund_pending' : 'completed',
        finalAmount: settlement.finalAmount,
        outstandingBalance: settlement.outstandingBalance,
        refundAmount: settlement.refundAmount,
        adjustments: settlement.adjustments || [],
        settlementHistory: [{
          action: 'settlement_created',
          amount: settlement.finalAmount,
          processedBy: req.user._id,
          processedAt: new Date(),
          description: 'Settlement automatically created at checkout',
          reference: `SETTLEMENT-${updatedBooking.bookingNumber}-${Date.now()}`
        }]
      };

      await updatedBooking.save();

      logger.info('Settlement auto-created at checkout', {
        bookingNumber: updatedBooking.bookingNumber,
        status: updatedBooking.settlementTracking.status
      });
    } else {
      // No balance due, mark as completed
      updatedBooking.settlementTracking = {
        status: 'completed',
        finalAmount: settlement.finalAmount,
        outstandingBalance: 0,
        refundAmount: 0,
        adjustments: settlement.adjustments || [],
        settlementHistory: [{
          action: 'settlement_completed',
          amount: settlement.finalAmount,
          processedBy: req.user._id,
          processedAt: new Date(),
          description: 'Settlement completed - fully paid at checkout',
          reference: `SETTLEMENT-${updatedBooking.bookingNumber}-${Date.now()}`
        }]
      };

      await updatedBooking.save();

      logger.info('Settlement auto-completed at checkout', { bookingNumber: updatedBooking.bookingNumber });
    }

    // Broadcast room status change via WebSocket after checkout
    try {
      websocketService.broadcastToHotel(booking.hotelId?.toString() || booking.hotelId, 'room_status_changed', {
        roomId: booking.rooms?.[0]?.roomId,
        status: 'dirty',
        bookingId: booking._id,
        event: 'checkout'
      });
    } catch (e) { /* WebSocket is non-critical */ }

    res.json({
      status: 'success',
      data: {
        booking: updatedBooking,
        settlement: settlement,
        message: 'Guest checked out successfully',
        settlementStatus: updatedBooking.settlementTracking?.status || 'completed'
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/extra-persons:
 *   post:
 *     summary: Add extra person to booking with pending charge (Admin/Staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 description: Person's name
 *               type:
 *                 type: string
 *                 enum: [adult, child]
 *                 description: Person type
 *               age:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 120
 *                 description: Age (required for children)
 *     responses:
 *       200:
 *         description: Extra person added with pending charge. Charge must be approved before payment.
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Access denied - admin/staff only
 *       404:
 *         description: Booking not found
 */
router.post('/:id/extra-persons',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, type, age } = req.body;  // REMOVED: autoCalculateCharges

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check if booking belongs to user's hotel
    if (booking.hotelId.toString() !== req.user.hotelId.toString()) {
      throw new ApplicationError('Booking not found in your hotel', 404);
    }

    // User context for RBAC
    const userContext = {
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role
    };

    // Add extra person
    const extraPerson = await booking.addExtraPerson({ name, type, age }, userContext);

    // Calculate suggested charge (but DON'T auto-apply)
    const chargeResult = await booking.calculateExtraPersonCharges();

    // Find the charge for this person and set status to 'pending'
    const personChargeIndex = booking.extraPersonCharges.findIndex(
      c => c.personId === extraPerson.personId
    );

    if (personChargeIndex !== -1) {
      // Set status to pending (not applied yet)
      booking.extraPersonCharges[personChargeIndex].status = 'pending';

      // Store calculated amount
      if (!booking.extraPersonCharges[personChargeIndex].calculatedAmount) {
        booking.extraPersonCharges[personChargeIndex].calculatedAmount =
          booking.extraPersonCharges[personChargeIndex].totalCharge;
      }
    }

    // Save booking
    await booking.save();

    // Populate booking details for response
    await booking.populate('userId', 'name email');
    await booking.populate('rooms.roomId', 'roomNumber roomType');

    // Get the suggested charge for this person
    const suggestedCharge = booking.extraPersonCharges.find(
      c => c.personId === extraPerson.personId
    );

    res.json({
      status: 'success',
      data: {
        extraPerson,
        suggestedCharge,  // Return suggested charge info
        booking,
        message: `${type} ${name} added to booking. Suggested charge: ₹${suggestedCharge?.totalCharge || 0}. Status: Pending approval.`
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/extra-persons/{personId}:
 *   delete:
 *     summary: Remove extra person from booking (Admin/Staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *       - in: path
 *         name: personId
 *         required: true
 *         schema:
 *           type: string
 *         description: Extra person ID
 *     responses:
 *       200:
 *         description: Extra person removed successfully
 *       403:
 *         description: Access denied - admin/staff only
 *       404:
 *         description: Booking or person not found
 */
router.delete('/:id/extra-persons/:personId',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { id, personId } = req.params;

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check if booking belongs to user's hotel
    if (booking.hotelId.toString() !== req.user.hotelId.toString()) {
      throw new ApplicationError('Booking not found in your hotel', 404);
    }

    // User context for RBAC
    const userContext = {
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role
    };

    // Remove extra person
    const removedPerson = await booking.removeExtraPerson(personId, userContext);

    // Recalculate charges
    await booking.calculateExtraPersonCharges();

    // Save booking
    await booking.save();

    res.json({
      status: 'success',
      data: {
        removedPerson,
        message: `${removedPerson.type} ${removedPerson.name} removed from booking successfully`
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/extra-persons/{personId}/update-charge:
 *   put:
 *     summary: Update extra person charge amount (Admin/Staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *       - in: path
 *         name: personId
 *         required: true
 *         schema:
 *           type: string
 *         description: Extra person ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adjustedAmount
 *               - adjustmentReason
 *             properties:
 *               adjustedAmount:
 *                 type: number
 *                 description: New adjusted price
 *               adjustmentReason:
 *                 type: string
 *                 description: Reason for price adjustment
 *     responses:
 *       200:
 *         description: Charge updated successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Access denied
 *       404:
 *         description: Booking or charge not found
 */
router.put('/:id/extra-persons/:personId/update-charge',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { id, personId } = req.params;
    const { adjustedAmount, adjustmentReason } = req.body;

    // Validation
    if (!adjustedAmount || adjustedAmount < 0) {
      throw new ApplicationError('Valid adjusted amount is required', 400);
    }
    if (!adjustmentReason || !adjustmentReason.trim()) {
      throw new ApplicationError('Adjustment reason is required', 400);
    }

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check property access
    if (booking.hotelId.toString() !== req.user.hotelId.toString()) {
      throw new ApplicationError('Booking not found in your hotel', 404);
    }

    // Find the charge
    const chargeIndex = booking.extraPersonCharges.findIndex(
      c => c.personId === personId
    );

    if (chargeIndex === -1) {
      throw new ApplicationError('Extra person charge not found', 404);
    }

    const charge = booking.extraPersonCharges[chargeIndex];

    // Only allow updating pending charges
    if (charge.status !== 'pending') {
      throw new ApplicationError('Can only update pending charges', 400);
    }

    // Update the charge
    booking.extraPersonCharges[chargeIndex].adjustedAmount = adjustedAmount;
    booking.extraPersonCharges[chargeIndex].adjustmentReason = adjustmentReason.trim();
    booking.extraPersonCharges[chargeIndex].totalCharge = adjustedAmount;  // Update total to match adjusted amount
    booking.extraPersonCharges[chargeIndex].adjustedBy = {
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      adjustedAt: new Date()
    };

    await booking.save();

    // Populate for response
    await booking.populate('userId', 'name email');
    await booking.populate('rooms.roomId', 'roomNumber');

    res.json({
      status: 'success',
      data: {
        booking,
        updatedCharge: booking.extraPersonCharges[chargeIndex],
        message: 'Extra person charge updated successfully'
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/extra-persons/calculate-charges:
 *   post:
 *     summary: Calculate charges for extra persons (Admin/Staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Extra person charges calculated successfully
 *       403:
 *         description: Access denied - admin/staff only
 *       404:
 *         description: Booking not found
 */
router.post('/:id/extra-persons/calculate-charges',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check if booking belongs to user's hotel
    if (booking.hotelId.toString() !== req.user.hotelId.toString()) {
      throw new ApplicationError('Booking not found in your hotel', 404);
    }

    // Calculate charges
    const chargeResult = await booking.calculateExtraPersonCharges();

    // Save booking
    await booking.save();

    // Populate the updated booking to get complete data
    await booking.populate([
      { path: 'userId', select: 'name email phone' },
      { path: 'rooms.roomId', select: 'roomNumber type baseRate' }
    ]);

    res.json({
      status: 'success',
      data: {
        chargeBreakdown: chargeResult.chargeBreakdown,
        totalExtraCharge: chargeResult.totalExtraCharge,
        currency: chargeResult.currency,
        updatedTotalAmount: booking.calculateTotalAmount(),
        booking: booking, // Include the full updated booking
        extraPersonCharges: booking.extraPersonCharges, // Include updated charges with payment status
        message: 'Extra person charges calculated successfully'
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/extra-persons/{personId}/approve:
 *   post:
 *     summary: Approve and apply extra person charge (Admin/Staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *       - in: path
 *         name: personId
 *         required: true
 *         schema:
 *           type: string
 *         description: Extra person ID
 *     responses:
 *       200:
 *         description: Charge approved and applied successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Access denied
 *       404:
 *         description: Booking or charge not found
 */
router.post('/:id/extra-persons/:personId/approve',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { id, personId } = req.params;

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check property access
    if (booking.hotelId.toString() !== req.user.hotelId.toString()) {
      throw new ApplicationError('Booking not found in your hotel', 404);
    }

    // Find the charge
    const chargeIndex = booking.extraPersonCharges.findIndex(
      c => c.personId === personId
    );

    if (chargeIndex === -1) {
      throw new ApplicationError('Extra person charge not found', 404);
    }

    const charge = booking.extraPersonCharges[chargeIndex];

    // Only allow approving pending charges
    if (charge.status !== 'pending') {
      throw new ApplicationError('Charge is already applied or paid', 400);
    }

    // Approve and apply the charge
    booking.extraPersonCharges[chargeIndex].status = 'applied';
    booking.extraPersonCharges[chargeIndex].approvedBy = {
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role
    };
    booking.extraPersonCharges[chargeIndex].approvedAt = new Date();
    booking.extraPersonCharges[chargeIndex].appliedAt = new Date();
    booking.extraPersonCharges[chargeIndex].appliedBy = {
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role
    };

    await booking.save();

    // Populate for response
    await booking.populate('userId', 'name email');
    await booking.populate('rooms.roomId', 'roomNumber');

    res.json({
      status: 'success',
      data: {
        booking,
        approvedCharge: booking.extraPersonCharges[chargeIndex],
        message: 'Extra person charge approved and applied successfully. Guest can now pay.'
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/extra-persons/payment:
 *   post:
 *     summary: Process multi-payment for extra person charges (Admin/Staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethods:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     method:
 *                       type: string
 *                       enum: [cash, upi, stripe]
 *                     amount:
 *                       type: number
 *                     reference:
 *                       type: string
 *                     notes:
 *                       type: string
 *               extraPersonCharges:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     personId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     description:
 *                       type: string
 *               totalAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       403:
 *         description: Access denied - admin/staff only
 *       404:
 *         description: Booking not found
 */
router.post('/:id/extra-persons/payment',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { paymentMethods, extraPersonCharges, totalAmount } = req.body;

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check if booking belongs to user's hotel
    if (booking.hotelId.toString() !== req.user.hotelId.toString()) {
      throw new ApplicationError('Booking not found in your hotel', 404);
    }

    // Validate payment methods
    if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
      throw new ApplicationError('Payment methods are required', 400);
    }

    // Calculate total paid amount
    const totalPaid = paymentMethods.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    if (totalPaid <= 0) {
      throw new ApplicationError('Total payment amount must be greater than 0', 400);
    }

    try {
      // Process each payment method
      const processedPayments = paymentMethods.map(payment => ({
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference || `${payment.method}-${Date.now()}`,
        processedBy: req.user._id,
        processedAt: new Date(),
        notes: payment.notes || `${payment.method.toUpperCase()} payment for extra person charges`
      }));

      // Update booking with payment information in paymentDetails
      if (!booking.paymentDetails) {
        booking.paymentDetails = {
          paymentMethods: [],
          totalPaid: 0,
          remainingAmount: booking.totalAmount || 0,
          collectedAt: new Date(),
          collectedBy: req.user._id
        };
      }

      if (!booking.paymentDetails.paymentMethods) {
        booking.paymentDetails.paymentMethods = [];
      }

      // Add the new payment methods to paymentDetails
      booking.paymentDetails.paymentMethods.push(...processedPayments);

      // Pre-save hook will calculate totalPaid from paymentMethods
      // But we need to update paymentStatus here based on total
      const bookingTotalAmount = booking.calculateTotalAmount();
      const totalPaidAfterThisPayment = (booking.paymentDetails.totalPaid || 0) + totalPaid;

      if (totalPaidAfterThisPayment >= bookingTotalAmount) {
        booking.paymentStatus = 'paid';
      } else if (totalPaidAfterThisPayment > 0) {
        booking.paymentStatus = 'partially_paid';
      }

      // Mark extra person charges as paid
      if (booking.extraPersonCharges && booking.extraPersonCharges.length > 0) {
        booking.extraPersonCharges.forEach(charge => {
          // Find corresponding charge in the request
          const requestCharge = extraPersonCharges.find(reqCharge =>
            reqCharge.personId === charge.personId
          );

          if (requestCharge) {
            charge.paidAmount = (charge.paidAmount || 0) + requestCharge.amount;
            charge.isPaid = charge.paidAmount >= charge.totalCharge;
            if (charge.isPaid && !charge.paidAt) {
              charge.paidAt = new Date();
            }
          }
        });
      }

      // Add payment record to history
      if (!booking.paymentHistory) {
        booking.paymentHistory = [];
      }

      booking.paymentHistory.push({
        type: 'extra_person_charges',
        amount: totalPaid,
        paymentMethods: processedPayments,
        processedBy: req.user._id,
        processedAt: new Date(),
        description: 'Payment for extra person charges',
        extraPersonCharges: extraPersonCharges
      });

      // Save booking
      await booking.save();

      // Populate booking details for response
      await booking.populate('userId', 'name email');
      await booking.populate('rooms.roomId', 'roomNumber roomType');

      res.json({
        status: 'success',
        data: {
          booking,
          paymentSummary: {
            totalPaid,
            paymentMethods: processedPayments,
            updatedBookingTotal: bookingTotalAmount,
            updatedTotalPaid: booking.paymentDetails?.totalPaid || 0,
            remainingAmount: booking.paymentDetails?.remainingAmount || 0,
            paymentStatus: booking.paymentStatus
          },
          message: 'Extra person charges payment processed successfully'
        }
      });

    } catch (error) {
      logger.error('Error processing extra person charges payment', { error: error.message });
      throw new ApplicationError('Failed to process payment', 500);
    }
  })
);

/**
 * @swagger
 * /bookings/{id}/settlement:
 *   get:
 *     summary: Get booking settlement details (Admin/Staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Settlement details retrieved successfully
 *       403:
 *         description: Access denied - admin/staff only
 *       404:
 *         description: Booking not found
 */
router.get('/:id/settlement',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // ensurePropertyAccess middleware already verified access
    // No need for additional hotelId check - supports multi-property

    // Calculate settlement if not exists
    const settlement = booking.calculateSettlement();

    res.json({
      status: 'success',
      data: {
        settlement,
        bookingDetails: {
          bookingNumber: booking.bookingNumber,
          guestName: booking.userId ? booking.userId.name : 'N/A',
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          status: booking.status
        }
      }
    });
  })
);

/**
 * @swagger
 * /bookings/{id}/settlement/adjustment:
 *   post:
 *     summary: Add settlement adjustment (Admin/Staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [extra_person_charge, damage_charge, minibar_charge, service_charge, discount, refund, penalty, other]
 *                 description: Type of adjustment
 *               amount:
 *                 type: number
 *                 description: Adjustment amount (positive for charges, negative for credits)
 *               description:
 *                 type: string
 *                 description: Detailed description of the adjustment
 *     responses:
 *       200:
 *         description: Settlement adjustment added successfully
 *       400:
 *         description: Invalid adjustment data
 *       403:
 *         description: Access denied - admin/staff only
 *       404:
 *         description: Booking not found
 */
router.post('/:id/settlement/adjustment',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { type, amount, description } = req.body;

    // Validate input
    if (!type || amount === undefined || !description) {
      throw new ApplicationError('Type, amount, and description are required', 400);
    }

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check if booking belongs to user's hotel
    if (booking.hotelId.toString() !== req.user.hotelId.toString()) {
      throw new ApplicationError('Booking not found in your hotel', 404);
    }

    // User context for RBAC
    const userContext = {
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role
    };

    // Add settlement adjustment
    const adjustment = booking.addSettlementAdjustment({ type, amount, description }, userContext);

    // Save booking
    await booking.save();

    res.json({
      status: 'success',
      data: {
        adjustment,
        updatedSettlement: booking.settlementTracking,
        message: 'Settlement adjustment added successfully'
      }
    });
  })
);


/**
 * @swagger
 * /bookings/{id}/settlement/payment:
 *   post:
 *     summary: Process settlement payment (Admin/Staff only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethods
 *               - amount
 *             properties:
 *               paymentMethods:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     method:
 *                       type: string
 *                       enum: [cash, upi, stripe, bank_transfer]
 *                     amount:
 *                       type: number
 *                     reference:
 *                       type: string
 *                     notes:
 *                       type: string
 *               amount:
 *                 type: number
 *                 description: Total settlement amount
 *     responses:
 *       200:
 *         description: Settlement payment processed successfully
 *       400:
 *         description: Invalid payment data
 *       403:
 *         description: Access denied - admin/staff only
 *       404:
 *         description: Booking not found
 */
router.post('/:id/settlement/payment',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { paymentMethods, amount } = req.body;
    const { id } = req.params;

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // ensurePropertyAccess middleware already verified access
    // No need for additional hotelId check - supports multi-property

    // Validate payment methods
    if (!paymentMethods || paymentMethods.length === 0) {
      throw new ApplicationError('At least one payment method is required', 400);
    }

    const totalPaid = paymentMethods.reduce((sum, payment) => sum + payment.amount, 0);
    if (Math.abs(totalPaid - amount) > 0.01) {
      throw new ApplicationError('Payment amounts do not match total', 400);
    }

    // Process payments
    const processedPayments = paymentMethods.map(payment => ({
      method: payment.method,
      amount: payment.amount,
      reference: payment.reference || `${payment.method}-${Date.now()}`,
      processedBy: req.user._id,
      processedAt: new Date(),
      notes: payment.notes || `Settlement payment via ${payment.method}`
    }));

    // Initialize settlement tracking if not exists
    if (!booking.settlementTracking) {
      booking.settlementTracking = {
        status: 'pending',
        finalAmount: 0,
        outstandingBalance: 0,
        refundAmount: 0,
        adjustments: [],
        settlementHistory: []
      };
    }

    // Add payment to settlement history
    booking.settlementTracking.settlementHistory.push({
      action: 'payment_received',
      amount: totalPaid,
      paymentMethods: processedPayments,
      processedBy: req.user._id,
      processedAt: new Date(),
      description: 'Settlement payment received',
      reference: processedPayments.map(p => p.reference).join(', ')
    });

    // CRITICAL FIX: Update paymentDetails.totalPaid (not booking.totalPaid which doesn't exist)
    if (!booking.paymentDetails) {
      booking.paymentDetails = {
        paymentMethods: [],
        totalPaid: 0,
        remainingAmount: booking.totalAmount || 0,
        collectedAt: new Date(),
        collectedBy: req.user._id
      };
    }

    if (!booking.paymentDetails.paymentMethods) {
      booking.paymentDetails.paymentMethods = [];
    }

    // Add settlement payments to paymentDetails
    booking.paymentDetails.paymentMethods.push(...processedPayments);

    // Update outstanding balance
    const previousBalance = booking.settlementTracking.outstandingBalance || 0;
    booking.settlementTracking.outstandingBalance = Math.max(0, previousBalance - totalPaid);

    // Update settlement status
    if (booking.settlementTracking.outstandingBalance === 0) {
      booking.settlementTracking.status = 'completed';
    } else {
      booking.settlementTracking.status = 'partial';
    }

    // Add to booking payment history
    if (!booking.paymentHistory) {
      booking.paymentHistory = [];
    }

    // Add each payment method to payment history
    paymentMethods.forEach((pm) => {
      booking.paymentHistory.push({
        amount: pm.amount || 0,
        method: pm.method || 'cash',
        reference: pm.reference || '',
        notes: pm.notes || 'Settlement payment',
        collectedBy: req.user._id,
        collectedAt: new Date(),
        status: 'completed',
        type: 'settlement'
      });
    });

    logger.info('Settlement payment processed', { bookingNumber: booking.bookingNumber, paymentAmount: totalPaid });

    // Save booking
    await booking.save();

    // Populate booking details for response
    await booking.populate([
      { path: 'userId', select: 'name email phone' },
      { path: 'rooms.roomId', select: 'roomNumber type' }
    ]);

    res.json({
      status: 'success',
      data: {
        booking: booking,
        settlementTracking: booking.settlementTracking,
        paymentSummary: {
          totalPaid: totalPaid,
          previousBalance: previousBalance,
          remainingBalance: booking.settlementTracking.outstandingBalance,
          paymentMethods: processedPayments
        },
        message: 'Settlement payment processed successfully'
      }
    });
  })
);


/**
 * @swagger
 * /bookings/{id}/no-show:
 *   post:
 *     summary: Mark a booking as no-show
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
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
 *                 maxLength: 500
 *                 description: Reason for marking as no-show
 *               chargeAmount:
 *                 type: number
 *                 minimum: 0
 *                 description: Optional no-show charge amount (defaults to 0)
 *     responses:
 *       200:
 *         description: Booking marked as no-show successfully
 *       400:
 *         description: Invalid request or booking status
 *       403:
 *         description: Access denied - admin/staff only
 *       404:
 *         description: Booking not found
 */
router.post('/:id/no-show',
  authenticate,
  ensureTenantContext,
  authorize(['admin', 'staff', 'frontdesk']),
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { reason, chargeAmount = 0 } = req.body;
    const { id } = req.params;

    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new ApplicationError('Reason is required for marking a booking as no-show', 400);
    }

    if (reason.length > 500) {
      throw new ApplicationError('Reason cannot exceed 500 characters', 400);
    }

    // Validate chargeAmount
    if (chargeAmount < 0) {
      throw new ApplicationError('Charge amount cannot be negative', 400);
    }

    // Find booking
    const booking = await Booking.findById(id)
      .populate('userId', 'name email phone')
      .populate('rooms.roomId', 'roomNumber type');

    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // ensurePropertyAccess middleware already verified property access
    // No need for additional hotelId check - supports multi-property

    // Validate booking status - can only mark confirmed or pending bookings as no-show
    const validStatuses = ['confirmed', 'pending'];
    if (!validStatuses.includes(booking.status)) {
      throw new ApplicationError(
        `Cannot mark booking as no-show. Current status: ${booking.status}. Only confirmed or pending bookings can be marked as no-show.`,
        400
      );
    }

    // Validate chargeAmount doesn't exceed totalAmount
    if (chargeAmount > booking.totalAmount) {
      throw new ApplicationError(
        `Charge amount (${chargeAmount}) cannot exceed total booking amount (${booking.totalAmount})`,
        400
      );
    }

    // Update booking status
    booking.status = 'no_show';

    // Update no-show details using existing model fields
    booking.noShowRecorded = new Date();
    booking.noShowReason = reason.trim();
    booking.noShowMarkedBy = {
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role
    };
    booking.noShowChargeAmount = chargeAmount;
    booking.noShowChargeApplied = chargeAmount > 0;

    // If charge amount is provided, add to payment details
    if (chargeAmount > 0) {
      // Initialize paymentDetails if not exists
      if (!booking.paymentDetails) {
        booking.paymentDetails = {
          totalPaid: 0,
          remainingAmount: booking.totalAmount,
          paymentMethods: []
        };
      }

      // Add no-show charge to payment methods
      booking.paymentDetails.paymentMethods.push({
        method: 'cash', // Default to cash as it's pending collection
        amount: chargeAmount,
        reference: `NO-SHOW-${booking.bookingNumber}-${Date.now()}`,
        notes: `No-show cancellation charge: ${reason.substring(0, 100)}${reason.length > 100 ? '...' : ''}`,
        processedBy: req.user._id,
        processedAt: new Date()
      });

      // Update payment totals (marked as pending until actually collected)
      // Note: We're recording the charge but not adding to totalPaid yet
      // This represents the amount that SHOULD be charged
    }

    // Update status history
    if (!booking.statusHistory) {
      booking.statusHistory = [];
    }

    booking.statusHistory.push({
      status: 'no_show',
      timestamp: new Date(),
      changedBy: {
        source: 'manual',
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role
      },
      reason: reason.substring(0, 200) // Store abbreviated reason in status history
    });

    // Log the no-show action
    logger.info('No-show marked', {
      bookingNumber: booking.bookingNumber,
      chargeAmount,
      markedBy: req.user._id
    });

    // Save booking
    await booking.save();

    // Prepare no-show details for response
    const noShowDetails = {
      markedAt: booking.noShowRecorded,
      markedBy: {
        userId: booking.noShowMarkedBy.userId,
        userName: booking.noShowMarkedBy.userName,
        userRole: booking.noShowMarkedBy.userRole
      },
      reason: booking.noShowReason,
      chargeAmount: booking.noShowChargeAmount,
      charged: booking.noShowChargeApplied
    };

    // Send response
    res.json({
      status: 'success',
      data: {
        booking: booking,
        message: chargeAmount > 0
          ? `Booking marked as no-show successfully with a charge of ₹${chargeAmount}`
          : 'Booking marked as no-show successfully',
        noShowDetails: noShowDetails
      }
    });
  })
);

export default router;
