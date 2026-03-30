import express from 'express';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import RoomType from '../models/RoomType.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { validate, schemas } from '../middleware/validation.js';
import {
  ensurePropertyAccess,
  getUserPropertyIds,
  checkPropertyAccess,
} from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import Joi from 'joi';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

// Hotels list endpoint - accessible by admin, staff, and frontdesk (needed for walk-in bookings)
router.get('/hotels', authenticate, ensureTenantContext, ensurePropertyAccess, authorize(['admin', 'staff', 'frontdesk']), catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    isActive
  } = req.query;

  const accessiblePropertyIds = await getUserPropertyIds(req.user._id, req.user);
  const query = {};

  if (!accessiblePropertyIds.length) {
    return res.json({
      status: 'success',
      data: { hotels: [] },
      pagination: {
        total: 0,
        page: parseInt(page),
        pages: 0,
        limit: parseInt(limit)
      }
    });
  }

  query._id = { $in: accessiblePropertyIds };

  if (isActive !== undefined) query.isActive = isActive === 'true';

  if (search) {
    const escapedSearch = escapeRegex(search);
    query.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { 'address.city': { $regex: escapedSearch, $options: 'i' } },
      { 'address.country': { $regex: escapedSearch, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const [hotels, total] = await Promise.all([
    Hotel.find(query)
      .select('name address contact isActive settings')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Hotel.countDocuments(query)
  ]);

  res.json({
    status: 'success',
    data: { hotels },
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit)
    }
  });
}));

// Users list endpoint - accessible by admin, staff, and frontdesk (needed for staff management)
router.get('/users', authenticate, ensureTenantContext, ensurePropertyAccess, authorize(['admin', 'staff', 'frontdesk']), catchAsync(async (req, res) => {
  const {
    role,
    search,
    isActive,
    hotelId: queryHotelId
  } = req.query;

  const parsedPage = Math.max(1, parseInt(req.query.page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  const accessiblePropertyIds = await getUserPropertyIds(req.user._id, req.user);

  // If a specific hotelId was requested, validate it is within accessible properties
  let scopedPropertyIds = accessiblePropertyIds;
  if (queryHotelId && typeof queryHotelId === 'string') {
    const isAccessible = accessiblePropertyIds.some(id => id.toString() === queryHotelId);
    if (isAccessible) {
      scopedPropertyIds = [queryHotelId];
    }
    // If not accessible, silently fall back to all accessible properties (no data leak)
  }

  const query = {};

  if (isActive !== undefined) query.isActive = isActive === 'true';

  // Handle role filtering properly for staff management vs general user management
  if (role === 'guest') {
    query.role = 'guest';
    query.hotelId = { $in: scopedPropertyIds };
  } else if (role === 'staff' || role === 'admin') {
    query.role = role;
    query.hotelId = { $in: scopedPropertyIds };
  } else if (!role) {
    query.$or = [
      { role: 'staff', hotelId: { $in: scopedPropertyIds } },
      { role: 'admin', hotelId: { $in: scopedPropertyIds } }
    ];
  }

  if (search) {
    const escapedSearch = escapeRegex(search);
    const searchQuery = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } }
    ];

    // If we already have a $or condition, combine them
    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        { $or: searchQuery }
      ];
      delete query.$or;
    } else {
      query.$or = searchQuery;
    }
  }

  const skip = (parsedPage - 1) * parsedLimit;

  const [users, total] = await Promise.all([
    User.find(query)
      .populate('hotelId', 'name')
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort('-createdAt')
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    User.countDocuments(query)
  ]);

  res.json({
    status: 'success',
    data: {
      users,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit) || 1
      }
    }
  });
}));

// All other admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));
router.use(ensurePropertyAccess);

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
  const accessiblePropertyIds = await getUserPropertyIds(req.user._id, req.user);
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const scopedHotelFilter = accessiblePropertyIds.length ? { hotelId: { $in: accessiblePropertyIds } } : { hotelId: null };

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
    User.countDocuments({ isActive: true, ...scopedHotelFilter }),
    Hotel.countDocuments({ isActive: true, _id: { $in: accessiblePropertyIds } }),
    Booking.countDocuments(scopedHotelFilter),
    Booking.countDocuments({ ...scopedHotelFilter, createdAt: { $gte: startOfMonth } }),
    Booking.countDocuments({ ...scopedHotelFilter, createdAt: { $gte: startOfYear } }),
    Booking.aggregate([
      { $match: { ...scopedHotelFilter, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Booking.aggregate([
      { 
        $match: { 
          ...scopedHotelFilter,
          paymentStatus: 'paid',
          createdAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  // Get recent bookings
  const recentBookings = await Booking.find(scopedHotelFilter)
    .populate('userId', 'name email')
    .populate('hotelId', 'name')
    .sort('-createdAt')
    .limit(10)
    .select('bookingNumber status totalAmount checkIn checkOut createdAt').lean();

  // Get user registration trends (last 12 months)
  const userTrends = await User.aggregate([
    {
      $match: {
        ...scopedHotelFilter,
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
 *   post:
 *     summary: Create a new user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [guest, staff, admin]
 *               preferences:
 *                 type: object
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/users', authorizePolicy('admin', 'createUser'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { name, email, phone, password, role, preferences } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    throw new ApplicationError('User with this email already exists', 409);
  }

  const userData = {
    name,
    email,
    phone,
    password,
    role: role || 'guest',
    preferences
  };

  // If creating staff or admin, automatically assign to the current admin's hotel
  if (role === 'staff' || role === 'admin') {
    userData.hotelId = req.user.hotelId;
  }

  const user = await User.create(userData);

  res.status(201).json({
    status: 'success',
    data: {
      user: user.toJSON()
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
router.get('/users/:id', authorizePolicy('admin', 'createUser'), catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select('-password').lean();

  if (!user) {
    throw new ApplicationError('User not found', 404);
  }

  // Tenant isolation: ensure the requested user belongs to the same hotel
  if (req.user.hotelId && user.hotelId && user.hotelId.toString() !== req.user.hotelId.toString()) {
    throw new ApplicationError('User not found', 404);
  }

  res.json({
    status: 'success',
    data: { user }
  });
}));

router.patch('/users/:id', authorizePolicy('admin', 'updateUser'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role, isActive, hotelId } = req.body;
  const existingUser = await User.findById(id).select('hotelId').lean();

  if (!existingUser) {
    throw new ApplicationError('User not found', 404);
  }

  if (existingUser.hotelId) {
    const hasExistingAccess = await checkPropertyAccess(req.user._id, existingUser.hotelId, req.user);
    if (!hasExistingAccess) {
      throw new ApplicationError('Access denied. You do not have permission to modify this user.', 403);
    }
  }

  if (hotelId) {
    const hasTargetAccess = await checkPropertyAccess(req.user._id, hotelId, req.user);
    if (!hasTargetAccess) {
      throw new ApplicationError('Access denied. You do not have permission to assign this user to the selected property.', 403);
    }
  }

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
    throw new ApplicationError('User not found', 404);
  }

  res.json({
    status: 'success',
    data: { user }
  });
}));

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Admin]
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
 *         description: User deleted successfully
 */
router.delete('/users/:id', authorizePolicy('admin', 'deleteUser'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const existingUser = await User.findById(id).select('hotelId').lean();

  if (!existingUser) {
    throw new ApplicationError('User not found', 404);
  }

  if (existingUser.hotelId) {
    const hasAccess = await checkPropertyAccess(req.user._id, existingUser.hotelId, req.user);
    if (!hasAccess) {
      throw new ApplicationError('Access denied. You do not have permission to delete this user.', 403);
    }
  }

  // Soft delete — deactivate instead of permanently removing
  await User.findByIdAndUpdate(id, { isActive: false });

  res.json({
    status: 'success',
    data: {
      message: 'User deactivated successfully'
    }
  });
}));

// NOTE: GET /hotels route moved to top of file (before global admin middleware)
// to allow frontdesk access for walk-in bookings

/**
 * @swagger
 * /admin/hotels:
 *   post:
 *     summary: Create a new hotel
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - contact
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *               contact:
 *                 type: object
 *                 properties:
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *                   website:
 *                     type: string
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Hotel created successfully
 */
router.post('/hotels', authorizePolicy('admin', 'createHotel'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const {
    name,
    description,
    address,
    contact,
    amenities = [],
    type = 'hotel'
  } = req.body;

  // Create the hotel
  const hotel = new Hotel({
    name,
    description,
    address: {
      street: address.street,
      city: address.city,
      state: address.state,
      country: address.country,
      zipCode: address.zipCode
    },
    contact: {
      phone: contact.phone,
      email: contact.email,
      website: contact.website
    },
    amenities,
    type,
    ownerId: req.user._id,
    isActive: true
  });

  await hotel.save();

  res.status(201).json({
    status: 'success',
    data: {
      hotel
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
router.patch('/hotels/:id', authorizePolicy('admin', 'updateHotelStatus'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const hasAccess = await checkPropertyAccess(req.user._id, id, req.user);

  if (!hasAccess) {
    throw new ApplicationError('Access denied. You do not have permission to modify this hotel.', 403);
  }

  const hotel = await Hotel.findByIdAndUpdate(
    id,
    { isActive },
    { new: true, runValidators: true }
  ).populate('ownerId', 'name email');

  if (!hotel) {
    throw new ApplicationError('Hotel not found', 404);
  }

  res.json({
    status: 'success',
    data: { hotel }
  });
}));

/**
 * @swagger
 * /admin/hotels/{id}:
 *   put:
 *     summary: Update hotel details
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: object
 *               contact:
 *                 type: object
 *               amenities:
 *                 type: array
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hotel updated successfully
 */
router.put('/hotels/:id', authorizePolicy('admin', 'updateHotelDetails'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    address,
    contact,
    amenities = [],
    type = 'hotel'
  } = req.body;
  const hasAccess = await checkPropertyAccess(req.user._id, id, req.user);

  if (!hasAccess) {
    throw new ApplicationError('Access denied. You do not have permission to modify this hotel.', 403);
  }

  const hotel = await Hotel.findByIdAndUpdate(
    id,
    {
      name,
      description,
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        country: address.country,
        zipCode: address.zipCode
      },
      contact: {
        phone: contact.phone,
        email: contact.email,
        website: contact.website
      },
      amenities,
      type
    },
    { new: true, runValidators: true }
  ).populate('ownerId', 'name email');

  if (!hotel) {
    throw new ApplicationError('Hotel not found', 404);
  }

  res.json({
    status: 'success',
    data: { hotel }
  });
}));

/**
 * @swagger
 * /admin/hotels/{id}:
 *   delete:
 *     summary: Delete hotel
 *     tags: [Admin]
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
 *         description: Hotel deleted successfully
 */
router.delete('/hotels/:id', authorizePolicy('admin', 'deleteHotel'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const hasAccess = await checkPropertyAccess(req.user._id, id, req.user);

  if (!hasAccess) {
    throw new ApplicationError('Access denied. You do not have permission to delete this hotel.', 403);
  }

  const hotel = await Hotel.findByIdAndDelete(id);

  if (!hotel) {
    throw new ApplicationError('Hotel not found', 404);
  }

  // Cascade cleanup: remove associated rooms, room types, and user references
  await Room.deleteMany({ hotelId: id });
  await RoomType.deleteMany({ hotelId: id });
  await User.updateMany(
    { properties: id },
    { $pull: { properties: id } }
  );

  res.json({
    status: 'success',
    message: 'Hotel deleted successfully'
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
  const accessiblePropertyIds = await getUserPropertyIds(req.user._id, req.user);
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
  query.hotelId = { $in: accessiblePropertyIds };
  
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (hotelId) {
    const hasAccess = await checkPropertyAccess(req.user._id, hotelId, req.user);
    if (!hasAccess) {
      throw new ApplicationError('Access denied. You do not have permission to access this property.', 403);
    }
    query.hotelId = hotelId;
  }
  
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
      .populate('rooms.roomId', 'roomNumber type baseRate currentRate')
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
  const accessiblePropertyIds = await getUserPropertyIds(req.user._id, req.user);
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
        hotelId: { $in: accessiblePropertyIds },
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
        hotelId: { $in: accessiblePropertyIds },
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
        hotelId: { $in: accessiblePropertyIds },
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

/**
 * @swagger
 * /admin/current-hotel:
 *   get:
 *     summary: Get current user's hotel ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user's hotel ID
 */
router.get('/current-hotel', catchAsync(async (req, res) => {
  res.json({
    status: 'success',
    data: {
      hotelId: req.user.hotelId
    }
  });
}));

export default router;
