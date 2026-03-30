import express from 'express';
import Joi from 'joi';
import MeetUpRequest from '../models/MeetUpRequest.js';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import ServiceBooking from '../models/ServiceBooking.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { validate, schemas } from '../middleware/validation.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { validateStatusTransition, MEETUP_TRANSITIONS } from '../utils/statusTransitions.js';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

/**
 * Attach computed virtual-equivalent fields to lean meetup documents.
 * Mongoose .lean() strips virtuals; this restores the ones the frontend needs.
 */
function attachVirtuals(doc) {
  if (!doc) return doc;
  const now = new Date();
  const proposedDate = new Date(doc.proposedDate);
  doc.isUpcoming = proposedDate > now && doc.status === 'accepted';
  doc.isPast = proposedDate < now;
  doc.canBeCancelled = doc.status === 'accepted' && proposedDate > now;
  doc.canBeRescheduled = doc.status === 'accepted' && proposedDate > now;
  doc.participantCount = doc.participants?.confirmedParticipants?.length ?? 0;
  doc.hasAvailableSpots = doc.participantCount < (doc.participants?.maxParticipants ?? 2);
  return doc;
}
function attachVirtualsToList(docs) {
  return docs.map(attachVirtuals);
}

// Apply authentication, tenant isolation, and property access to all routes
router.use(authenticate);
router.use(ensureTenantContext);
router.use(ensurePropertyAccess);
router.use(authorizePolicy('meetUpRequests', 'baseAccess'));

// ============= ADMIN ROUTES (Place first to avoid conflicts) =============
// Admin/Staff/Frontdesk: Get all meet-up requests across the system
router.get('/admin/all', authorize('admin', 'staff', 'frontdesk'), catchAsync(async (req, res) => {
  const {
    status,
    type,
    hotelId,
    dateFrom,
    dateTo,
    search
  } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  // Mandatory hotel filtering for tenant isolation
  const resolvedHotelId = (hotelId && hotelId !== 'all') ? hotelId : (req.body.hotelId || req.user?.hotelId);
  if (!resolvedHotelId) {
    return res.status(400).json({ status: 'error', message: 'Hotel context required' });
  }

  let query = {};
  query.hotelId = resolvedHotelId;

  // Filter by status
  if (status && status !== 'all') query.status = status;

  // Filter by type
  if (type && type !== 'all') query.type = type;

  // Filter by date range
  if (dateFrom || dateTo) {
    query.proposedDate = {};
    if (dateFrom) query.proposedDate.$gte = new Date(dateFrom);
    if (dateTo) query.proposedDate.$lte = new Date(dateTo);
  }

  // Search in title, description, or user names
  if (search) {
    const escapedSearch = escapeRegex(search);
    query.$or = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } }
    ];
  }

  const meetUps = attachVirtualsToList(await MeetUpRequest.find(query)
    .populate('requesterId', 'name email avatar role')
    .populate('targetUserId', 'name email avatar role')
    .populate('hotelId', 'name address')
    .populate('meetingRoomBooking.roomId', 'number type')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit).lean());

  const total = await MeetUpRequest.countDocuments(query);

  res.json({
    success: true,
    data: {
      meetUps,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + meetUps.length < total,
        hasPrev: page > 1
      }
    }
  });
}));

// Admin/Staff/Frontdesk: Get system-wide meet-up insights
router.get('/admin/insights', authorize('admin', 'staff', 'frontdesk'), catchAsync(async (req, res) => {
  const { hotelId } = req.query;

  // Mandatory hotel filtering for tenant isolation
  const resolvedInsightsHotelId = (hotelId && hotelId !== 'all') ? hotelId : (req.body.hotelId || req.user?.hotelId);
  if (!resolvedInsightsHotelId) {
    return res.status(400).json({ status: 'error', message: 'Hotel context required' });
  }
  let baseQuery = {};
  baseQuery.hotelId = resolvedInsightsHotelId;

  // Get various insights
  const [
    totalUsers,
    activeUsers,
    riskMeetUps,
    frequentRequesters,
    underperformingHotels,
    safetyStats
  ] = await Promise.all([
    // Total users who have used meet-up feature
    MeetUpRequest.distinct('requesterId', baseQuery).then(ids => ids.length),

    // Active users (last 30 days)
    MeetUpRequest.distinct('requesterId', {
      ...baseQuery,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).then(ids => ids.length),

    // Potentially risky meet-ups (declined multiple times, safety concerns)
    MeetUpRequest.find({
      ...baseQuery,
      $or: [
        { status: 'declined' },
        { 'safety.verifiedOnly': false, 'safety.publicLocation': false }
      ]
    }).populate('requesterId', 'name email').populate('targetUserId', 'name email').sort({ createdAt: -1 }).limit(50).lean(),

    // Users with excessive requests
    MeetUpRequest.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$requesterId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 10 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $project: { userName: { $arrayElemAt: ['$user.name', 0] }, requestCount: '$count' } },
      { $sort: { requestCount: -1 } }
    ]),

    // Hotels with low acceptance rates
    MeetUpRequest.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$hotelId',
          total: { $sum: 1 },
          accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } }
        }
      },
      {
        $project: {
          total: 1,
          accepted: 1,
          acceptanceRate: { $divide: ['$accepted', '$total'] }
        }
      },
      { $match: { total: { $gt: 5 }, acceptanceRate: { $lt: 0.5 } } },
      { $lookup: { from: 'hotels', localField: '_id', foreignField: '_id', as: 'hotel' } },
      { $project: { hotelName: { $arrayElemAt: ['$hotel.name', 0] }, acceptanceRate: 1, total: 1 } }
    ]),

    // Safety preferences statistics
    MeetUpRequest.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          verifiedOnly: { $sum: { $cond: ['$safety.verifiedOnly', 1, 0] } },
          publicLocation: { $sum: { $cond: ['$safety.publicLocation', 1, 0] } },
          hotelStaffPresent: { $sum: { $cond: ['$safety.hotelStaffPresent', 1, 0] } }
        }
      }
    ])
  ]);

  res.json({
    success: true,
    data: {
      userEngagement: {
        totalUsers,
        activeUsers,
        engagementRate: totalUsers > 0 ? (activeUsers / totalUsers * 100) : 0
      },
      riskAssessment: {
        potentiallyRiskyMeetUps: riskMeetUps.length,
        frequentRequesters: frequentRequesters.length,
        riskyMeetUpDetails: riskMeetUps.slice(0, 10) // Limit to 10 for performance
      },
      hotelPerformance: {
        underperformingHotels
      },
      safetyInsights: safetyStats[0] || {
        totalRequests: 0,
        verifiedOnly: 0,
        publicLocation: 0,
        hotelStaffPresent: 0
      }
    }
  });
}));

// Admin/Staff/Frontdesk: Get comprehensive analytics
router.get('/admin/analytics', authorize('admin', 'staff', 'frontdesk'), catchAsync(async (req, res) => {
  const { period = '30d', hotelId } = req.query;

  // Calculate date range based on period
  const periodMap = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '365d': 365
  };

  const days = periodMap[period] || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Mandatory hotel filtering for tenant isolation
  const resolvedAnalyticsHotelId = (hotelId && hotelId !== 'all') ? hotelId : (req.body.hotelId || req.user?.hotelId);
  if (!resolvedAnalyticsHotelId) {
    return res.status(400).json({ status: 'error', message: 'Hotel context required' });
  }
  let baseQuery = { createdAt: { $gte: startDate } };
  baseQuery.hotelId = resolvedAnalyticsHotelId;

  // Parallel execution of analytics queries
  const [
    totalRequests,
    statusStats,
    typeStats,
    hotelStats,
    dailyTrends,
    topUsers,
    responseTimeStats,
    completionRate,
    popularLocations,
    peakTimes
  ] = await Promise.all([
    // Total requests in period
    MeetUpRequest.countDocuments(baseQuery),

    // Status breakdown
    MeetUpRequest.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),

    // Type breakdown
    MeetUpRequest.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),

    // Hotel breakdown
    MeetUpRequest.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$hotelId', count: { $sum: 1 } } },
      { $lookup: { from: 'hotels', localField: '_id', foreignField: '_id', as: 'hotel' } },
      { $project: { hotelName: { $arrayElemAt: ['$hotel.name', 0] }, count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),

    // Daily trends
    MeetUpRequest.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          requests: { $sum: 1 },
          accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      },
      { $sort: { '_id': 1 } }
    ]),

    // Top active users
    MeetUpRequest.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$requesterId',
          requestsSent: { $sum: 1 }
        }
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $project: { userName: { $arrayElemAt: ['$user.name', 0] }, requestsSent: 1 } },
      { $sort: { requestsSent: -1 } },
      { $limit: 10 }
    ]),

    // Response time statistics
    MeetUpRequest.aggregate([
      {
        $match: {
          ...baseQuery,
          'response.respondedAt': { $exists: true }
        }
      },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$response.respondedAt', '$createdAt'] },
              3600000 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' }
        }
      }
    ]),

    // Completion rate
    MeetUpRequest.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          declined: { $sum: { $cond: [{ $eq: ['$status', 'declined'] }, 1, 0] } }
        }
      }
    ]),

    // Popular locations
    MeetUpRequest.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$location.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),

    // Peak times analysis
    MeetUpRequest.aggregate([
      { $match: baseQuery },
      {
        $project: {
          hour: { $hour: '$createdAt' },
          dayOfWeek: { $dayOfWeek: '$createdAt' }
        }
      },
      {
        $group: {
          _id: { hour: '$hour', dayOfWeek: '$dayOfWeek' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);

  // Calculate rates
  const completionStats = completionRate[0] || { total: 0, accepted: 0, completed: 0, declined: 0 };
  const acceptanceRate = completionStats.total > 0 ? (completionStats.accepted / completionStats.total * 100) : 0;
  const declineRate = completionStats.total > 0 ? (completionStats.declined / completionStats.total * 100) : 0;
  const completionRatePercent = completionStats.accepted > 0 ? (completionStats.completed / completionStats.accepted * 100) : 0;

  res.json({
    success: true,
    data: {
      summary: {
        totalRequests,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
        declineRate: Math.round(declineRate * 100) / 100,
        completionRate: Math.round(completionRatePercent * 100) / 100,
        avgResponseTime: responseTimeStats[0]?.avgResponseTime || 0
      },
      breakdown: {
        status: statusStats,
        type: typeStats,
        hotels: hotelStats,
        locations: popularLocations
      },
      trends: {
        daily: dailyTrends,
        peakTimes: peakTimes
      },
      users: {
        topRequesters: topUsers
      },
      period,
      generatedAt: new Date()
    }
  });
}));

// Admin/Staff/Frontdesk: Force cancel any meet-up request
router.post('/admin/:requestId/force-cancel', authorize('admin', 'staff', 'frontdesk'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { reason } = req.body;

  // Tenant isolation: resolve hotel context
  const resolvedCancelHotelId = req.body.hotelId || req.user?.hotelId;
  const existingRequest = await MeetUpRequest.findById(req.params.requestId).lean();

  if (!existingRequest) {
    throw new ApplicationError('Meet-up request not found', 404);
  }

  // Verify the meet-up belongs to the admin's hotel
  if (resolvedCancelHotelId && existingRequest.hotelId?.toString() !== resolvedCancelHotelId.toString()) {
    throw new ApplicationError('Meet-up request not found', 404);
  }

  // Validate status transition
  const transition = validateStatusTransition(MEETUP_TRANSITIONS, existingRequest.status, 'cancelled');
  if (!transition.valid) {
    throw new ApplicationError(transition.error, 400);
  }

  // Atomic update: set status and admin action
  const meetUpRequest = await MeetUpRequest.findByIdAndUpdate(
    req.params.requestId,
    {
      $set: {
        status: 'cancelled',
        adminAction: {
          action: 'force_cancelled',
          adminId: req.user._id,
          reason: reason || 'Cancelled by administrator',
          timestamp: new Date()
        }
      }
    },
    { new: true, runValidators: true }
  );

  // Populate for response
  await meetUpRequest.populate([
    { path: 'requesterId', select: 'name email' },
    { path: 'targetUserId', select: 'name email' },
    { path: 'hotelId', select: 'name' }
  ]);

  res.json({
    success: true,
    message: 'Meet-up request forcefully cancelled',
    data: meetUpRequest
  });
}));

// ============= USER ROUTES =============
// Get all meet-up requests for the authenticated user
router.get('/', catchAsync(async (req, res) => {
  const { status, type, filter, search } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  let query = {
    $or: [
      { requesterId: req.user._id },
      { targetUserId: req.user._id },
      { 'participants.confirmedParticipants.userId': req.user._id }
    ]
  };

  if (status) query.status = status;
  if (type) query.type = type;

  // Filter by role (sent vs received)
  if (filter === 'sent') {
    query = { requesterId: req.user._id };
    if (status) query.status = status;
    if (type) query.type = type;
  } else if (filter === 'received') {
    query = { targetUserId: req.user._id };
    if (status) query.status = status;
    if (type) query.type = type;
  } else if (filter === 'participating') {
    query = { 'participants.confirmedParticipants.userId': req.user._id };
    if (status) query.status = status;
    if (type) query.type = type;
  }

  // Text search in title and description
  if (search) {
    const escapedSearch = escapeRegex(search);
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } }
      ]
    });
  }

  const meetUps = attachVirtualsToList(await MeetUpRequest.find(query)
    .populate('requesterId', 'name email avatar')
    .populate('targetUserId', 'name email avatar')
    .populate('hotelId', 'name address')
    .populate('meetingRoomBooking.roomId', 'number type')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit).lean());

  const total = await MeetUpRequest.countDocuments(query);

  res.json({
    success: true,
    data: {
      meetUps,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + meetUps.length < total,
        hasPrev: page > 1
      }
    }
  });
}));

// Get pending requests (requests sent to the user)
router.get('/pending', catchAsync(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const pendingRequests = attachVirtualsToList(
    await MeetUpRequest.getPendingRequests(req.user._id)
      .skip(skip)
      .limit(limit)
  );

  const total = await MeetUpRequest.countDocuments({
    targetUserId: req.user._id,
    status: 'pending'
  });

  res.json({
    success: true,
    data: {
      pendingRequests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + pendingRequests.length < total,
        hasPrev: page > 1
      }
    }
  });
}));

// Get upcoming meet-ups
router.get('/upcoming', catchAsync(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const upcomingMeetUps = attachVirtualsToList(
    await MeetUpRequest.getUpcomingMeetUps(req.user._id)
      .skip(skip)
      .limit(limit)
  );

  const total = await MeetUpRequest.countDocuments({
    $or: [
      { requesterId: req.user._id },
      { targetUserId: req.user._id },
      { 'participants.confirmedParticipants.userId': req.user._id }
    ],
    status: 'accepted',
    proposedDate: { $gt: new Date() }
  });

  res.json({
    success: true,
    data: {
      upcomingMeetUps,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + upcomingMeetUps.length < total,
        hasPrev: page > 1
      }
    }
  });
}));

// Create a new meet-up request
router.post('/', validate(schemas.createMeetUpRequest), catchAsync(async (req, res) => {
  const {
    targetUserId,
    hotelId,
    type,
    title,
    description,
    proposedDate,
    proposedTime,
    location,
    meetingRoomBooking,
    participants,
    preferences,
    communication,
    activity,
    safety,
    metadata
  } = req.body;
  
  // Verify target user exists
  const targetUser = await User.findById(targetUserId).lean();
  if (!targetUser) {
    throw new ApplicationError('Target user not found', 404);
  }
  
  // Verify hotel exists
  const hotel = await Hotel.findById(hotelId).lean();
  if (!hotel) {
    throw new ApplicationError('Hotel not found', 404);
  }
  
  // Check if meeting room booking is required and valid
  if (meetingRoomBooking && meetingRoomBooking.isRequired) {
    if (!meetingRoomBooking.roomId) {
      throw new ApplicationError('Meeting room is required', 400);
    }
    
    const room = await Room.findById(meetingRoomBooking.roomId).lean();
    if (!room) {
      throw new ApplicationError('Meeting room not found', 404);
    }
  }
  
  // Check if user is trying to meet with themselves
  if (targetUserId.toString() === req.user._id.toString()) {
    throw new ApplicationError('Cannot create meet-up request with yourself', 400);
  }
  
  // Check if there's already a pending request between these users
  const existingRequest = await MeetUpRequest.findOne({
    $or: [
      { requesterId: req.user._id, targetUserId },
      { requesterId: targetUserId, targetUserId: req.user._id }
    ],
    status: 'pending'
  }).lean();
  
  if (existingRequest) {
    throw new ApplicationError('A pending meet-up request already exists between these users', 400);
  }
  
  const meetUpRequest = new MeetUpRequest({
    requesterId: req.user._id,
    targetUserId,
    hotelId,
    type,
    title,
    description,
    proposedDate: new Date(proposedDate),
    proposedTime,
    location,
    meetingRoomBooking,
    participants: {
      maxParticipants: participants?.maxParticipants || 2,
      confirmedParticipants: []
    },
    preferences,
    communication,
    activity,
    safety,
    metadata
  });
  
  await meetUpRequest.save();
  
  // Populate references for response
  await meetUpRequest.populate([
    { path: 'requesterId', select: 'name email avatar' },
    { path: 'targetUserId', select: 'name email avatar' },
    { path: 'hotelId', select: 'name address' },
    { path: 'meetingRoomBooking.roomId', select: 'number type' }
  ]);
  
  res.status(201).json({
    success: true,
    message: 'Meet-up request created successfully',
    data: meetUpRequest
  });
}));

// Get a specific meet-up request
router.get('/:requestId', catchAsync(async (req, res) => {
  const meetUpRequest = await MeetUpRequest.findOne({
    _id: req.params.requestId,
    $or: [
      { requesterId: req.user._id },
      { targetUserId: req.user._id },
      { 'participants.confirmedParticipants.userId': req.user._id }
    ]
  })
  .populate('requesterId', 'name email avatar')
  .populate('targetUserId', 'name email avatar')
  .populate('hotelId', 'name address')
  .populate('meetingRoomBooking.roomId', 'number type')
  .populate('participants.confirmedParticipants.userId', 'name email avatar').lean();

  if (!meetUpRequest) {
    throw new ApplicationError('Meet-up request not found', 404);
  }

  attachVirtuals(meetUpRequest);
  
  res.json({
    success: true,
    data: meetUpRequest
  });
}));

// Accept a meet-up request
router.post('/:requestId/accept', validate(schemas.respondToMeetUpRequest), catchAsync(async (req, res) => {
  const { message } = req.body;

  const meetUpRequest = await MeetUpRequest.findOneAndUpdate(
    {
      _id: req.params.requestId,
      targetUserId: req.user._id,
      status: 'pending'
    },
    {
      $set: {
        status: 'accepted',
        'response.message': message,
        'response.respondedAt': new Date()
      }
    },
    { new: true, runValidators: true }
  );

  if (!meetUpRequest) {
    throw new ApplicationError('Meet-up request not found or cannot be accepted', 404);
  }

  // Populate references for response
  await meetUpRequest.populate([
    { path: 'requesterId', select: 'name email avatar' },
    { path: 'targetUserId', select: 'name email avatar' },
    { path: 'hotelId', select: 'name address' }
  ]);

  res.json({
    success: true,
    message: 'Meet-up request accepted successfully',
    data: meetUpRequest
  });
}));

// Decline a meet-up request
router.post('/:requestId/decline', validate(schemas.respondToMeetUpRequest), catchAsync(async (req, res) => {
  const { message } = req.body;

  const meetUpRequest = await MeetUpRequest.findOneAndUpdate(
    {
      _id: req.params.requestId,
      targetUserId: req.user._id,
      status: 'pending'
    },
    {
      $set: {
        status: 'declined',
        'response.message': message,
        'response.respondedAt': new Date()
      }
    },
    { new: true, runValidators: true }
  );

  if (!meetUpRequest) {
    throw new ApplicationError('Meet-up request not found or cannot be declined', 404);
  }

  // Populate references for response
  await meetUpRequest.populate([
    { path: 'requesterId', select: 'name email avatar' },
    { path: 'targetUserId', select: 'name email avatar' },
    { path: 'hotelId', select: 'name address' }
  ]);

  res.json({
    success: true,
    message: 'Meet-up request declined successfully',
    data: meetUpRequest
  });
}));

// Cancel a meet-up request
router.post('/:requestId/cancel', validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const meetUpRequest = await MeetUpRequest.findOneAndUpdate(
    {
      _id: req.params.requestId,
      requesterId: req.user._id,
      status: { $in: ['pending', 'accepted'] }
    },
    { $set: { status: 'cancelled' } },
    { new: true }
  );

  if (!meetUpRequest) {
    throw new ApplicationError('Meet-up request not found or cannot be cancelled', 404);
  }

  res.json({
    success: true,
    message: 'Meet-up request cancelled successfully'
  });
}));

// Complete a meet-up request
router.post('/:requestId/complete', validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const meetUpRequest = await MeetUpRequest.findOneAndUpdate(
    {
      _id: req.params.requestId,
      $or: [
        { requesterId: req.user._id },
        { targetUserId: req.user._id }
      ],
      status: 'accepted'
    },
    { $set: { status: 'completed', completedAt: new Date() } },
    { new: true }
  );

  if (!meetUpRequest) {
    throw new ApplicationError('Meet-up request not found or cannot be completed', 404);
  }

  res.json({
    success: true,
    message: 'Meet-up request marked as completed'
  });
}));

// Add participant to a meet-up
router.post('/:requestId/participants', validate(schemas.addParticipant), catchAsync(async (req, res) => {
  const { userId, name, email } = req.body;

  const meetUpRequest = await MeetUpRequest.findOneAndUpdate(
    {
      _id: req.params.requestId,
      $or: [
        { requesterId: req.user._id },
        { targetUserId: req.user._id }
      ],
      status: 'accepted'
    },
    {
      $push: {
        'participants.confirmedParticipants': {
          userId,
          name,
          email,
          joinedAt: new Date()
        }
      }
    },
    { new: true }
  );

  if (!meetUpRequest) {
    throw new ApplicationError('Meet-up request not found or cannot add participants', 404);
  }

  res.json({
    success: true,
    message: 'Participant added successfully'
  });
}));

// Remove participant from a meet-up
router.delete('/:requestId/participants/:userId', validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const meetUpRequest = await MeetUpRequest.findOneAndUpdate(
    {
      _id: req.params.requestId,
      $or: [
        { requesterId: req.user._id },
        { targetUserId: req.user._id }
      ],
      status: 'accepted'
    },
    {
      $pull: {
        'participants.confirmedParticipants': { userId: req.params.userId }
      }
    },
    { new: true }
  );

  if (!meetUpRequest) {
    throw new ApplicationError('Meet-up request not found or cannot remove participants', 404);
  }

  res.json({
    success: true,
    message: 'Participant removed successfully'
  });
}));

// Suggest alternative time/date
router.post('/:requestId/suggest-alternative', validate(schemas.suggestAlternative), catchAsync(async (req, res) => {
  const { date, time } = req.body;

  const meetUpRequest = await MeetUpRequest.findOneAndUpdate(
    {
      _id: req.params.requestId,
      targetUserId: req.user._id,
      status: 'pending'
    },
    {
      $set: {
        'alternativeSuggestion.date': new Date(date),
        'alternativeSuggestion.time': time,
        'alternativeSuggestion.suggestedBy': req.user._id,
        'alternativeSuggestion.suggestedAt': new Date()
      }
    },
    { new: true }
  );

  if (!meetUpRequest) {
    throw new ApplicationError('Meet-up request not found or cannot suggest alternative', 404);
  }

  res.json({
    success: true,
    message: 'Alternative time suggested successfully'
  });
}));

// Search for potential meet-up partners
router.get('/search/partners', catchAsync(async (req, res) => {
  const {
    interests,
    languages,
    ageGroup,
    gender,
    hotelId
  } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  
  let query = {
    _id: { $ne: req.user._id }, // Exclude current user
    role: 'guest'
  };
  
  // Mandatory hotel filtering for tenant isolation
  const resolvedPartnerHotelId = hotelId || req.body.hotelId || req.user?.hotelId;
  if (!resolvedPartnerHotelId) {
    return res.status(400).json({ status: 'error', message: 'Hotel context required' });
  }
  query.hotelId = resolvedPartnerHotelId;
  
  if (interests) {
    query.interests = { $in: interests.split(',') };
  }
  
  if (languages) {
    query.languages = { $in: languages.split(',') };
  }
  
  if (ageGroup && ageGroup !== 'any') {
    query.ageGroup = ageGroup;
  }
  
  if (gender && gender !== 'any') {
    query.gender = gender;
  }
  
  const users = await User.find(query)
    .select('name email avatar interests languages ageGroup gender')
    .skip(skip)
    .limit(limit).lean();

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + users.length < total,
        hasPrev: page > 1
      }
    }
  });
}));

// Get meet-up statistics
router.get('/stats/overview', catchAsync(async (req, res) => {
  const stats = await MeetUpRequest.getMeetUpStats(req.user._id);
  
  const [
    totalRequests,
    pendingRequests,
    acceptedRequests,
    completedRequests,
    upcomingMeetUps
  ] = await Promise.all([
    MeetUpRequest.countDocuments({
      $or: [
        { requesterId: req.user._id },
        { targetUserId: req.user._id }
      ]
    }),
    MeetUpRequest.countDocuments({
      targetUserId: req.user._id,
      status: 'pending'
    }),
    MeetUpRequest.countDocuments({
      $or: [
        { requesterId: req.user._id },
        { targetUserId: req.user._id }
      ],
      status: 'accepted'
    }),
    MeetUpRequest.countDocuments({
      $or: [
        { requesterId: req.user._id },
        { targetUserId: req.user._id }
      ],
      status: 'completed'
    }),
    MeetUpRequest.countDocuments({
      $or: [
        { requesterId: req.user._id },
        { targetUserId: req.user._id }
      ],
      status: 'accepted',
      proposedDate: { $gt: new Date() }
    })
  ]);
  
  res.json({
    success: true,
    data: {
      totalRequests,
      pendingRequests,
      acceptedRequests,
      completedRequests,
      upcomingMeetUps,
      statusBreakdown: stats
    }
  });
}));


export default router;
