import express from 'express';
import QRCode from 'qrcode';
import DigitalKey from '../models/DigitalKey.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all digital keys for the authenticated user
router.get('/', catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, type } = req.query;
  const skip = (page - 1) * limit;
  
  const filter = { userId: req.user.id };
  if (status) filter.status = status;
  if (type) filter.type = type;
  
  const keys = await DigitalKey.find(filter)
    .populate('bookingId', 'bookingNumber checkIn checkOut')
    .populate('roomId', 'number type floor')
    .populate('hotelId', 'name address')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await DigitalKey.countDocuments(filter);
  
  res.json({
    success: true,
    data: {
      keys,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + keys.length < total,
        hasPrev: page > 1
      }
    }
  });
}));

// Get shared keys for the authenticated user
router.get('/shared', catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  
  const keys = await DigitalKey.getSharedKeysForUser(req.user.id)
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await DigitalKey.countDocuments({
    'sharedWith.userId': req.user.id,
    'sharedWith.isActive': true,
    status: 'active',
    validUntil: { $gt: new Date() }
  });
  
  res.json({
    success: true,
    data: {
      keys,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + keys.length < total,
        hasPrev: page > 1
      }
    }
  });
}));

// Generate a new digital key for a booking
router.post('/generate', validate(schemas.generateDigitalKey), catchAsync(async (req, res) => {
  const { bookingId, type = 'primary', maxUses = -1, securitySettings = {} } = req.body;
  
  // Verify booking exists and belongs to user
  const booking = await Booking.findOne({ 
    _id: bookingId, 
    userId: req.user.id,
    status: { $in: ['confirmed', 'checked_in'] }
  }).populate('roomId hotelId');
  
  if (!booking) {
    throw new AppError('Booking not found or not eligible for digital key', 404);
  }
  
  // Check if key already exists for this booking
  const existingKey = await DigitalKey.findOne({ 
    bookingId, 
    userId: req.user.id,
    status: { $in: ['active', 'expired'] }
  });
  
  if (existingKey && type === 'primary') {
    throw new AppError('A primary key already exists for this booking', 400);
  }
  
  // Generate QR code data
  const keyCode = DigitalKey.generateKeyCode();
  const qrData = JSON.stringify({
    keyCode,
    bookingId: booking._id.toString(),
    roomId: booking.roomId._id.toString(),
    hotelId: booking.hotelId._id.toString(),
    type,
    timestamp: Date.now()
  });
  
  const qrCode = await QRCode.toDataURL(qrData);
  
  // Create digital key
  const digitalKey = new DigitalKey({
    userId: req.user.id,
    bookingId: booking._id,
    roomId: booking.roomId._id,
    hotelId: booking.hotelId._id,
    keyCode,
    qrCode,
    type,
    validFrom: new Date(),
    validUntil: booking.checkOut,
    maxUses: parseInt(maxUses),
    securitySettings: {
      requirePin: securitySettings.requirePin || false,
      pin: securitySettings.pin,
      allowSharing: securitySettings.allowSharing !== false,
      maxSharedUsers: securitySettings.maxSharedUsers || 5,
      requireApproval: securitySettings.requireApproval || false
    },
    metadata: {
      generatedBy: req.user.id,
      deviceInfo: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    }
  });
  
  await digitalKey.save();
  
  // Populate references for response
  await digitalKey.populate([
    { path: 'bookingId', select: 'bookingNumber checkIn checkOut' },
    { path: 'roomId', select: 'number type floor' },
    { path: 'hotelId', select: 'name address' }
  ]);
  
  res.status(201).json({
    success: true,
    message: 'Digital key generated successfully',
    data: digitalKey
  });
}));

// Get a specific digital key
router.get('/:keyId', catchAsync(async (req, res) => {
  const digitalKey = await DigitalKey.findOne({
    _id: req.params.keyId,
    $or: [
      { userId: req.user.id },
      { 'sharedWith.userId': req.user.id, 'sharedWith.isActive': true }
    ]
  })
  .populate('bookingId', 'bookingNumber checkIn checkOut')
  .populate('roomId', 'number type floor')
  .populate('hotelId', 'name address')
  .populate('sharedWith.userId', 'name email');
  
  if (!digitalKey) {
    throw new AppError('Digital key not found', 404);
  }
  
  res.json({
    success: true,
    data: digitalKey
  });
}));

// Validate a digital key (for door access)
router.post('/validate/:keyCode', catchAsync(async (req, res) => {
  const { keyCode } = req.params;
  const { pin, deviceInfo = {} } = req.body;
  
  const digitalKey = await DigitalKey.findByKeyCode(keyCode);
  
  if (!digitalKey) {
    throw new AppError('Invalid key code', 404);
  }
  
  if (!digitalKey.canBeUsed) {
    throw new AppError('Key is not valid or has expired', 400);
  }
  
  // Check PIN if required
  if (digitalKey.securitySettings.requirePin) {
    if (!pin) {
      throw new AppError('PIN is required', 400);
    }
    if (digitalKey.securitySettings.pin !== pin) {
      throw new AppError('Invalid PIN', 400);
    }
  }
  
  // Use the key
  await digitalKey.useKey(req.user.id, {
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
    ...deviceInfo
  });
  
  res.json({
    success: true,
    message: 'Key validated successfully',
    data: {
      keyId: digitalKey._id,
      roomNumber: digitalKey.roomId.number,
      hotelName: digitalKey.hotelId.name,
      remainingUses: digitalKey.remainingUses,
      validUntil: digitalKey.validUntil
    }
  });
}));

// Share a digital key
router.post('/:keyId/share', validate(schemas.shareDigitalKey), catchAsync(async (req, res) => {
  const { keyId } = req.params;
  const { email, name, expiresAt } = req.body;
  
  const digitalKey = await DigitalKey.findOne({
    _id: keyId,
    userId: req.user.id
  });
  
  if (!digitalKey) {
    throw new AppError('Digital key not found', 404);
  }
  
  if (!digitalKey.canBeShared) {
    throw new AppError('This key cannot be shared', 400);
  }
  
  // Find user by email if provided
  let sharedUserId = null;
  if (email) {
    const sharedUser = await User.findOne({ email });
    if (sharedUser) {
      sharedUserId = sharedUser._id;
    }
  }
  
  const shareData = {
    userId: sharedUserId,
    email,
    name,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined
  };
  
  await digitalKey.shareWithUser(shareData);
  
  res.json({
    success: true,
    message: 'Key shared successfully',
    data: {
      keyId: digitalKey._id,
      sharedWith: shareData
    }
  });
}));

// Revoke a shared key
router.delete('/:keyId/share/:userIdOrEmail', catchAsync(async (req, res) => {
  const { keyId, userIdOrEmail } = req.params;
  
  const digitalKey = await DigitalKey.findOne({
    _id: keyId,
    userId: req.user.id
  });
  
  if (!digitalKey) {
    throw new AppError('Digital key not found', 404);
  }
  
  await digitalKey.revokeShare(userIdOrEmail);
  
  res.json({
    success: true,
    message: 'Key access revoked successfully'
  });
}));

// Get access logs for a digital key
router.get('/:keyId/logs', catchAsync(async (req, res) => {
  const { keyId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;
  
  const digitalKey = await DigitalKey.findOne({
    _id: keyId,
    userId: req.user.id
  }).populate('accessLogs.userId', 'name email');
  
  if (!digitalKey) {
    throw new AppError('Digital key not found', 404);
  }
  
  const logs = digitalKey.accessLogs
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(skip, skip + parseInt(limit));
  
  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(digitalKey.accessLogs.length / limit),
        totalItems: digitalKey.accessLogs.length,
        hasNext: skip + logs.length < digitalKey.accessLogs.length,
        hasPrev: page > 1
      }
    }
  });
}));

// Revoke a digital key
router.delete('/:keyId', catchAsync(async (req, res) => {
  const { keyId } = req.params;
  
  const digitalKey = await DigitalKey.findOne({
    _id: keyId,
    userId: req.user.id
  });
  
  if (!digitalKey) {
    throw new AppError('Digital key not found', 404);
  }
  
  await digitalKey.revokeKey();
  
  res.json({
    success: true,
    message: 'Digital key revoked successfully'
  });
}));

// Get key statistics
router.get('/stats/overview', catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  const [
    totalKeys,
    activeKeys,
    expiredKeys,
    sharedKeys,
    totalUses,
    recentActivity
  ] = await Promise.all([
    DigitalKey.countDocuments({ userId }),
    DigitalKey.countDocuments({ 
      userId, 
      status: 'active',
      validUntil: { $gt: new Date() }
    }),
    DigitalKey.countDocuments({ 
      userId, 
      status: 'expired'
    }),
    DigitalKey.countDocuments({
      'sharedWith.userId': userId,
      'sharedWith.isActive': true,
      status: 'active',
      validUntil: { $gt: new Date() }
    }),
    DigitalKey.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, total: { $sum: '$currentUses' } } }
    ]),
    DigitalKey.aggregate([
      { $match: { userId: req.user._id } },
      { $unwind: '$accessLogs' },
      { $sort: { 'accessLogs.timestamp': -1 } },
      { $limit: 10 },
      { $project: {
        keyId: '$_id',
        action: '$accessLogs.action',
        timestamp: '$accessLogs.timestamp',
        deviceInfo: '$accessLogs.deviceInfo'
      }}
    ])
  ]);
  
  res.json({
    success: true,
    data: {
      totalKeys,
      activeKeys,
      expiredKeys,
      sharedKeys,
      totalUses: totalUses[0]?.total || 0,
      recentActivity
    }
  });
}));

export default router;
