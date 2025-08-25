import express from 'express';
import Room from '../models/Room.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

const router = express.Router();

/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: Get rooms with availability
 *     tags: [Rooms]
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         schema:
 *           type: string
 *         description: Hotel ID
 *       - in: query
 *         name: checkIn
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-in date (YYYY-MM-DD)
 *       - in: query
 *         name: checkOut
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-out date (YYYY-MM-DD)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [single, double, suite, deluxe]
 *         description: Room type filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of rooms
 */
router.get('/', optionalAuth, catchAsync(async (req, res) => {
  const {
    hotelId,
    checkIn,
    checkOut,
    type,
    page = 1,
    limit = 10,
    minPrice,
    maxPrice
  } = req.query;

  // Build query
  const query = { isActive: true };
  
  if (hotelId) {
    query.hotelId = hotelId;
  }
  
  if (type) {
    query.type = type;
  }

  if (minPrice || maxPrice) {
    query.currentRate = {};
    if (minPrice) query.currentRate.$gte = parseFloat(minPrice);
    if (maxPrice) query.currentRate.$lte = parseFloat(maxPrice);
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let rooms;
  
  // If dates provided, check availability
  if (checkIn && checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate >= checkOutDate) {
      throw new AppError('Check-out date must be after check-in date', 400);
    }

    rooms = await Room.findAvailable(hotelId, checkInDate, checkOutDate, type)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('hotelId', 'name address');
  } else {
    rooms = await Room.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('hotelId', 'name address')
      .sort({ roomNumber: 1 });
  }

  // Get total count for pagination
  const total = await Room.countDocuments(query);

  res.json({
    status: 'success',
    results: rooms.length,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    },
    data: {
      rooms
    }
  });
}));

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: Get room by ID
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room details
 */
router.get('/:id', catchAsync(async (req, res) => {
  const room = await Room.findById(req.params.id)
    .populate('hotelId', 'name address contact policies');

  if (!room || !room.isActive) {
    throw new AppError('Room not found', 404);
  }

  res.json({
    status: 'success',
    data: {
      room
    }
  });
}));

/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       201:
 *         description: Room created successfully
 */
router.post('/', 
  authenticate, 
  authorize('admin', 'staff'), 
  validate(schemas.createRoom), 
  catchAsync(async (req, res) => {
    const room = await Room.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        room
      }
    });
  })
);

/**
 * @swagger
 * /rooms/{id}:
 *   patch:
 *     summary: Update room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room updated successfully
 */
router.patch('/:id', 
  authenticate, 
  authorize('admin', 'staff'), 
  catchAsync(async (req, res) => {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        room
      }
    });
  })
);

/**
 * @swagger
 * /rooms/{id}:
 *   delete:
 *     summary: Delete room (soft delete)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       204:
 *         description: Room deleted successfully
 */
router.delete('/:id', 
  authenticate, 
  authorize('admin'), 
  catchAsync(async (req, res) => {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  })
);

export default router;