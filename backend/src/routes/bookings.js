import express from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Invoice from '../models/Invoice.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { dashboardUpdateService } from '../services/dashboardUpdateService.js';

const router = express.Router();

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
router.get('/', authenticate, catchAsync(async (req, res) => {
  const {
    status,
    checkIn,
    checkOut,
    page = 1,
    limit = 10
  } = req.query;

  // Build query based on user role
  const query = {};
  
  if (req.user.role === 'guest') {
    query.userId = req.user._id;
  } else if (req.user.role === 'staff' && req.user.hotelId) {
    query.hotelId = req.user.hotelId;
  }
  // Admin sees all bookings

  if (status) {
    query.status = status;
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
    .populate('rooms.roomId', 'roomNumber type')
    .populate('hotelId', 'name address contact')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(query);

  res.json({
    status: 'success',
    results: bookings.length,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
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
router.get('/room/:roomId', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
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
    throw new AppError('Room not found', 404);
  }
  
  // Check if user has access to this hotel
  if (req.user.role === 'staff' && req.user.hotelId.toString() !== room.hotelId.toString()) {
    throw new AppError('You do not have access to this room', 403);
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
    .populate('rooms.roomId', 'roomNumber type')
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
router.get('/:id', authenticate, catchAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('userId', 'name email phone')
    .populate('rooms.roomId')
    .populate('hotelId', 'name address contact policies');

  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  // Check access permissions
  if (req.user.role === 'guest' && booking.userId.toString() !== req.user._id.toString()) {
    throw new AppError('You do not have permission to view this booking', 403);
  }

  if (req.user.role === 'staff' && booking.hotelId.toString() !== req.user.hotelId.toString()) {
    throw new AppError('You do not have permission to view this booking', 403);
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
  validate(schemas.createBooking), 
  catchAsync(async (req, res) => {
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
      idempotencyKey
    } = req.body;

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Check for duplicate booking with same idempotency key
        const existingBooking = await Booking.findOne({ idempotencyKey });
        if (existingBooking) {
          throw new AppError('Booking with this idempotency key already exists', 409);
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        // Get rooms and check availability
        const rooms = await Room.find({
          _id: { $in: roomIds },
          hotelId,
          isActive: true
        });

        if (rooms.length !== roomIds.length) {
          throw new AppError('One or more rooms not found or not available', 404);
        }

        // Check for overlapping bookings
        const overlappingBookings = await Booking.findOverlapping(
          roomIds,
          checkInDate,
          checkOutDate
        );

        if (overlappingBookings.length > 0) {
          throw new AppError('One or more rooms are not available for the selected dates', 409);
        }

        // Calculate total amount
        const roomsWithRates = rooms.map(room => ({
          roomId: room._id,
          rate: room.currentRate
        }));

        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const calculatedTotal = roomsWithRates.reduce((total, room) => total + room.rate, 0) * nights;

        // Create booking - use admin-provided values when available
        const booking = await Booking.create([{
          hotelId,
          userId: userId || req.user._id, // Use provided userId for admin bookings, fallback to current user
          rooms: roomsWithRates,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights,
          guestDetails,
          totalAmount: totalAmount || calculatedTotal, // Use provided total or calculated total
          currency: currency || 'INR',
          idempotencyKey,
          status: status || 'pending',
          paymentStatus: paymentStatus || 'pending'
        }], { session });

        // Create corresponding invoice for billing history
        const finalAmount = totalAmount || calculatedTotal;
        const bookingCurrency = currency || 'INR';
        
        // Calculate due date (typically 30 days from issue date)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        
        // Create invoice items from room charges
        const invoiceItems = roomsWithRates.map(room => {
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
        });
        
        // Calculate subtotal and tax
        const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const taxAmount = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
        const totalWithTax = subtotal + taxAmount;
        
        const invoice = await Invoice.create([{
          hotelId,
          bookingId: booking[0]._id,
          guestId: userId || req.user._id,
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
            paidBy: userId || req.user._id,
            paidAt: new Date(),
            notes: 'Booking payment'
          }] : []
        }], { session });

        // Notify admin dashboard of new booking
        await dashboardUpdateService.notifyNewBooking(booking[0], req.user);
        await dashboardUpdateService.triggerDashboardRefresh(hotelId, 'bookings');

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
  catchAsync(async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check permissions
    if (req.user.role === 'guest' && booking.userId.toString() !== req.user._id.toString()) {
      throw new AppError('You do not have permission to modify this booking', 403);
    }

    if (req.user.role === 'staff' && booking.hotelId.toString() !== req.user.hotelId.toString()) {
      throw new AppError('You do not have permission to modify this booking', 403);
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
    ).populate('rooms.roomId userId hotelId');

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
  catchAsync(async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Check permissions
    if (req.user.role === 'guest' && booking.userId.toString() !== req.user._id.toString()) {
      throw new AppError('You do not have permission to cancel this booking', 403);
    }

    if (!booking.canCancel()) {
      throw new AppError('This booking cannot be cancelled', 400);
    }

    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason || 'Cancelled by user';
    await booking.save();

    // Notify admin dashboard of booking cancellation
    await dashboardUpdateService.notifyBookingCancellation(booking, req.user, req.body.reason);
    await dashboardUpdateService.triggerDashboardRefresh(booking.hotelId, 'bookings');

    res.json({
      status: 'success',
      data: {
        booking
      }
    });
  })
);

export default router;