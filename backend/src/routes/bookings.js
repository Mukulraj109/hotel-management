import express from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

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
    .populate('hotelId', 'name')
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
    data: {
      bookings
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
      roomIds,
      checkIn,
      checkOut,
      guestDetails,
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
        const totalAmount = roomsWithRates.reduce((total, room) => total + room.rate, 0) * nights;

        // Create booking
        const booking = await Booking.create([{
          hotelId,
          userId: req.user._id,
          rooms: roomsWithRates,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights,
          guestDetails,
          totalAmount,
          idempotencyKey,
          status: 'pending',
          paymentStatus: 'pending'
        }], { session });

        res.status(201).json({
          status: 'success',
          data: {
            booking: booking[0]
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

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('rooms.roomId userId hotelId');

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

    res.json({
      status: 'success',
      data: {
        booking
      }
    });
  })
);

export default router;