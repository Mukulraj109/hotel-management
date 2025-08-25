import express from 'express';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

const router = express.Router();

// Get guest profile
router.get('/:id', authenticate, catchAsync(async (req, res) => {
  const guest = await User.findById(req.params.id);

  if (!guest) {
    throw new AppError('Guest not found', 404);
  }

  // Check permissions
  if (req.user.role === 'guest' && req.user._id.toString() !== req.params.id) {
    throw new AppError('You can only view your own profile', 403);
  }

  res.json({
    status: 'success',
    data: { guest }
  });
}));

// Get guest bookings
router.get('/:id/bookings', authenticate, catchAsync(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  // Check permissions
  if (req.user.role === 'guest' && req.user._id.toString() !== req.params.id) {
    throw new AppError('You can only view your own bookings', 403);
  }

  const query = { userId: req.params.id };
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const bookings = await Booking.find(query)
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
    data: { bookings }
  });
}));

// Update guest profile
router.patch('/:id', authenticate, catchAsync(async (req, res) => {
  // Check permissions
  if (req.user.role === 'guest' && req.user._id.toString() !== req.params.id) {
    throw new AppError('You can only update your own profile', 403);
  }

  // Allowed fields for update
  const allowedFields = ['name', 'phone', 'preferences'];
  const updateData = {};

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const guest = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!guest) {
    throw new AppError('Guest not found', 404);
  }

  res.json({
    status: 'success',
    data: { guest }
  });
}));

export default router;