import express from 'express';
import MeetUpRequest from '../models/MeetUpRequest.js';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import ServiceBooking from '../models/ServiceBooking.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all meet-up requests for the authenticated user
router.get('/', catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, type, filter } = req.query;
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
  } else if (filter === 'received') {
    query = { targetUserId: req.user._id };
  } else if (filter === 'participating') {
    query = { 'participants.confirmedParticipants.userId': req.user._id };
  }
  
  const meetUps = await MeetUpRequest.find(query)
    .populate('requesterId', 'name email avatar')
    .populate('targetUserId', 'name email avatar')
    .populate('hotelId', 'name address')
    .populate('meetingRoomBooking.roomId', 'number type')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await MeetUpRequest.countDocuments(query);
  
  res.json({
    success: true,
    data: {
      meetUps,
      pagination: {
        currentPage: parseInt(page),
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
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  
  const pendingRequests = await MeetUpRequest.getPendingRequests(req.user._id)
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await MeetUpRequest.countDocuments({
    targetUserId: req.user._id,
    status: 'pending'
  });
  
  res.json({
    success: true,
    data: {
      pendingRequests,
      pagination: {
        currentPage: parseInt(page),
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
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  
  const upcomingMeetUps = await MeetUpRequest.getUpcomingMeetUps(req.user._id)
    .skip(skip)
    .limit(parseInt(limit));
  
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
        currentPage: parseInt(page),
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
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new AppError('Target user not found', 404);
  }
  
  // Verify hotel exists
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    throw new AppError('Hotel not found', 404);
  }
  
  // Check if meeting room booking is required and valid
  if (meetingRoomBooking && meetingRoomBooking.isRequired) {
    if (!meetingRoomBooking.roomId) {
      throw new AppError('Meeting room is required', 400);
    }
    
    const room = await Room.findById(meetingRoomBooking.roomId);
    if (!room) {
      throw new AppError('Meeting room not found', 404);
    }
  }
  
  // Check if user is trying to meet with themselves
  if (targetUserId === req.user._id) {
    throw new AppError('Cannot create meet-up request with yourself', 400);
  }
  
  // Check if there's already a pending request between these users
  const existingRequest = await MeetUpRequest.findOne({
    $or: [
      { requesterId: req.user._id, targetUserId },
      { requesterId: targetUserId, targetUserId: req.user._id }
    ],
    status: 'pending'
  });
  
  if (existingRequest) {
    throw new AppError('A pending meet-up request already exists between these users', 400);
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
  .populate('participants.confirmedParticipants.userId', 'name email avatar');
  
  if (!meetUpRequest) {
    throw new AppError('Meet-up request not found', 404);
  }
  
  res.json({
    success: true,
    data: meetUpRequest
  });
}));

// Accept a meet-up request
router.post('/:requestId/accept', validate(schemas.respondToMeetUpRequest), catchAsync(async (req, res) => {
  const { message } = req.body;
  
  const meetUpRequest = await MeetUpRequest.findOne({
    _id: req.params.requestId,
    targetUserId: req.user._id,
    status: 'pending'
  });
  
  if (!meetUpRequest) {
    throw new AppError('Meet-up request not found or cannot be accepted', 404);
  }
  
  await meetUpRequest.acceptRequest(message);
  
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
  
  const meetUpRequest = await MeetUpRequest.findOne({
    _id: req.params.requestId,
    targetUserId: req.user._id,
    status: 'pending'
  });
  
  if (!meetUpRequest) {
    throw new AppError('Meet-up request not found or cannot be declined', 404);
  }
  
  await meetUpRequest.declineRequest(message);
  
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
router.post('/:requestId/cancel', catchAsync(async (req, res) => {
  const meetUpRequest = await MeetUpRequest.findOne({
    _id: req.params.requestId,
    requesterId: req.user._id,
    status: { $in: ['pending', 'accepted'] }
  });
  
  if (!meetUpRequest) {
    throw new AppError('Meet-up request not found or cannot be cancelled', 404);
  }
  
  await meetUpRequest.cancelRequest();
  
  res.json({
    success: true,
    message: 'Meet-up request cancelled successfully'
  });
}));

// Complete a meet-up request
router.post('/:requestId/complete', catchAsync(async (req, res) => {
  const meetUpRequest = await MeetUpRequest.findOne({
    _id: req.params.requestId,
    $or: [
      { requesterId: req.user._id },
      { targetUserId: req.user._id }
    ],
    status: 'accepted'
  });
  
  if (!meetUpRequest) {
    throw new AppError('Meet-up request not found or cannot be completed', 404);
  }
  
  await meetUpRequest.completeRequest();
  
  res.json({
    success: true,
    message: 'Meet-up request marked as completed'
  });
}));

// Add participant to a meet-up
router.post('/:requestId/participants', validate(schemas.addParticipant), catchAsync(async (req, res) => {
  const { userId, name, email } = req.body;
  
  const meetUpRequest = await MeetUpRequest.findOne({
    _id: req.params.requestId,
    $or: [
      { requesterId: req.user._id },
      { targetUserId: req.user._id }
    ],
    status: 'accepted'
  });
  
  if (!meetUpRequest) {
    throw new AppError('Meet-up request not found or cannot add participants', 404);
  }
  
  await meetUpRequest.addParticipant(userId, name, email);
  
  res.json({
    success: true,
    message: 'Participant added successfully'
  });
}));

// Remove participant from a meet-up
router.delete('/:requestId/participants/:userId', catchAsync(async (req, res) => {
  const meetUpRequest = await MeetUpRequest.findOne({
    _id: req.params.requestId,
    $or: [
      { requesterId: req.user._id },
      { targetUserId: req.user._id }
    ],
    status: 'accepted'
  });
  
  if (!meetUpRequest) {
    throw new AppError('Meet-up request not found or cannot remove participants', 404);
  }
  
  await meetUpRequest.removeParticipant(req.params.userId);
  
  res.json({
    success: true,
    message: 'Participant removed successfully'
  });
}));

// Suggest alternative time/date
router.post('/:requestId/suggest-alternative', validate(schemas.suggestAlternative), catchAsync(async (req, res) => {
  const { date, time } = req.body;
  
  const meetUpRequest = await MeetUpRequest.findOne({
    _id: req.params.requestId,
    targetUserId: req.user._id,
    status: 'pending'
  });
  
  if (!meetUpRequest) {
    throw new AppError('Meet-up request not found or cannot suggest alternative', 404);
  }
  
  await meetUpRequest.suggestAlternative(new Date(date), time);
  
  res.json({
    success: true,
    message: 'Alternative time suggested successfully'
  });
}));

// Search for potential meet-up partners
router.get('/search/partners', catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    interests, 
    languages, 
    ageGroup, 
    gender,
    hotelId 
  } = req.query;
  const skip = (page - 1) * limit;
  
  let query = {
    _id: { $ne: req.user._id }, // Exclude current user
    role: 'guest'
  };
  
  if (hotelId) {
    // Find users who have bookings at this hotel
    query.hotelId = hotelId;
  }
  
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
    .limit(parseInt(limit));
  
  const total = await User.countDocuments(query);
  
  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
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
