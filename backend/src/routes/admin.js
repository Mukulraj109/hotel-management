import express from 'express';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/dashboard', catchAsync(async (req, res) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  // Get basic counts
  const [
    totalUsers,
    totalHotels,
    totalBookings,
    monthlyBookings,
    yearlyBookings,
    totalRevenue,
    monthlyRevenue
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Hotel.countDocuments({ isActive: true }),
    Booking.countDocuments(),
    Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Booking.countDocuments({ createdAt: { $gte: startOfYear } }),
    Booking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Booking.aggregate([
      { 
        $match: { 
          paymentStatus: 'paid',
          createdAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  // Get recent bookings
  const recentBookings = await Booking.find()
    .populate('userId', 'name email')
    .populate('hotelId', 'name')
    .sort('-createdAt')
    .limit(10)
    .select('bookingNumber status totalAmount checkIn checkOut createdAt');

  // Get user registration trends (last 12 months)
  const userTrends = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  res.json({
    status: 'success',
    data: {
      summary: {
        totalUsers,
        totalHotels,
        totalBookings,
        monthlyBookings,
        yearlyBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0
      },
      recentBookings,
      userTrends
    }
  });
}));

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users with pagination
 *     tags: [Admin]
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [guest, staff, admin]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    role,
    search,
    isActive
  } = req.query;

  const query = {};
  
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    User.find(query)
      .populate('hotelId', 'name')
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(query)
  ]);

  res.json({
    status: 'success',
    data: {
      users,
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
 * /admin/users/{id}:
 *   patch:
 *     summary: Update user status or role
 *     tags: [Admin]
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
 *               role:
 *                 type: string
 *                 enum: [guest, staff, admin]
 *               isActive:
 *                 type: boolean
 *               hotelId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.patch('/users/:id', catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role, isActive, hotelId } = req.body;

  const updateData = {};
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (hotelId !== undefined) updateData.hotelId = hotelId;

  const user = await User.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password -passwordResetToken -passwordResetExpires');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    status: 'success',
    data: { user }
  });
}));

/**
 * @swagger
 * /admin/hotels:
 *   get:
 *     summary: Get all hotels with pagination
 *     tags: [Admin]
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
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of hotels
 */
router.get('/hotels', catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    isActive
  } = req.query;

  const query = {};
  
  if (isActive !== undefined) query.isActive = isActive === 'true';
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } },
      { 'address.country': { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  
  const [hotels, total] = await Promise.all([
    Hotel.find(query)
      .populate('ownerId', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    Hotel.countDocuments(query)
  ]);

  // Get room counts for each hotel
  const hotelIds = hotels.map(hotel => hotel._id);
  const roomCounts = await Room.aggregate([
    { $match: { hotelId: { $in: hotelIds } } },
    { $group: { _id: '$hotelId', count: { $sum: 1 } } }
  ]);

  const roomCountMap = roomCounts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const hotelsWithRoomCount = hotels.map(hotel => ({
    ...hotel.toJSON(),
    roomCount: roomCountMap[hotel._id] || 0
  }));

  res.json({
    status: 'success',
    data: {
      hotels: hotelsWithRoomCount,
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
 * /admin/hotels/{id}:
 *   patch:
 *     summary: Update hotel status
 *     tags: [Admin]
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
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Hotel updated successfully
 */
router.patch('/hotels/:id', catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const hotel = await Hotel.findByIdAndUpdate(
    id,
    { isActive },
    { new: true, runValidators: true }
  ).populate('ownerId', 'name email');

  if (!hotel) {
    throw new AppError('Hotel not found', 404);
  }

  res.json({
    status: 'success',
    data: { hotel }
  });
}));

/**
 * @swagger
 * /admin/bookings:
 *   get:
 *     summary: Get all bookings with advanced filters
 *     tags: [Admin]
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
 *         name: paymentStatus
 *         schema:
 *           type: string
 *       - in: query
 *         name: hotelId
 *         schema:
 *           type: string
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
 *         description: List of bookings
 */
router.get('/bookings', catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    paymentStatus,
    hotelId,
    startDate,
    endDate
  } = req.query;

  const query = {};
  
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (hotelId) query.hotelId = hotelId;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  
  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('userId', 'name email')
      .populate('hotelId', 'name')
      .populate('rooms.roomId', 'number type')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit)),
    Booking.countDocuments(query)
  ]);

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
 * /admin/analytics:
 *   get:
 *     summary: Get system analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: System analytics
 */
router.get('/analytics', catchAsync(async (req, res) => {
  const { period = '30d' } = req.query;
  
  let startDate;
  const now = new Date();
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Revenue trends
  const revenueTrends = await Booking.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        revenue: { $sum: '$totalAmount' },
        bookings: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  // Booking status distribution
  const statusDistribution = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Top performing hotels
  const topHotels = await Booking.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$hotelId',
        revenue: { $sum: '$totalAmount' },
        bookings: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'hotels',
        localField: '_id',
        foreignField: '_id',
        as: 'hotel'
      }
    },
    {
      $unwind: '$hotel'
    },
    {
      $project: {
        hotelName: '$hotel.name',
        revenue: 1,
        bookings: 1
      }
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    status: 'success',
    data: {
      period,
      revenueTrends,
      statusDistribution,
      topHotels
    }
  });
}));

export default router;