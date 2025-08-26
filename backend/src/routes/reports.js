import express from 'express';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Payment from '../models/Payment.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

const router = express.Router();

// Revenue report
router.get('/revenue', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
  const {
    startDate,
    endDate,
    groupBy = 'day', // day, month, year
    hotelId
  } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('Start date and end date are required', 400);
  }

  const matchQuery = {
    paymentStatus: 'paid',
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  // Filter by hotel if user is staff
  if (req.user.role === 'staff' && req.user.hotelId) {
    matchQuery.hotelId = req.user.hotelId;
  } else if (hotelId) {
    matchQuery.hotelId = hotelId;
  }

  // Group by format
  let dateFormat;
  switch (groupBy) {
    case 'month':
      dateFormat = '%Y-%m';
      break;
    case 'year':
      dateFormat = '%Y';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }

  const pipeline = [
    { $match: matchQuery },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          hotelId: '$hotelId'
        },
        totalRevenue: { $sum: '$totalAmount' },
        bookingCount: { $sum: 1 },
        averageBookingValue: { $avg: '$totalAmount' }
      }
    },
    { $sort: { '_id.date': 1 } }
  ];

  const results = await Booking.aggregate(pipeline);

  // Calculate totals
  const summary = {
    totalRevenue: results.reduce((sum, item) => sum + item.totalRevenue, 0),
    totalBookings: results.reduce((sum, item) => sum + item.bookingCount, 0),
    averageBookingValue: results.length > 0 ? 
      results.reduce((sum, item) => sum + item.averageBookingValue, 0) / results.length : 0
  };

  res.json({
    status: 'success',
    data: {
      summary,
      breakdown: results,
      period: { startDate, endDate, groupBy }
    }
  });
}));

// Occupancy report
router.get('/occupancy', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
  const {
    startDate,
    endDate,
    hotelId
  } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('Start date and end date are required', 400);
  }

  const matchQuery = {
    $or: [
      { 
        checkIn: { $gte: new Date(startDate), $lte: new Date(endDate) },
        status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
      },
      {
        checkOut: { $gte: new Date(startDate), $lte: new Date(endDate) },
        status: { $in: ['confirmed', 'checked_in', 'checked_out'] }
      }
    ]
  };

  if (req.user.role === 'staff' && req.user.hotelId) {
    matchQuery.hotelId = req.user.hotelId;
  } else if (hotelId) {
    matchQuery.hotelId = hotelId;
  }

  // Get bookings in the period
  const bookings = await Booking.find(matchQuery)
    .populate('rooms.roomId', 'type')
    .populate('hotelId', 'name');

  // Get total rooms by hotel
  const roomsQuery = req.user.role === 'staff' && req.user.hotelId 
    ? { hotelId: req.user.hotelId, isActive: true }
    : { isActive: true };
    
  if (hotelId) roomsQuery.hotelId = hotelId;

  const totalRooms = await Room.countDocuments(roomsQuery);

  // Calculate occupied room nights
  let totalRoomNights = 0;
  const occupancyByType = {};

  bookings.forEach(booking => {
    const nights = booking.nights;
    const roomCount = booking.rooms.length;
    
    totalRoomNights += nights * roomCount;

    booking.rooms.forEach(room => {
      const roomType = room.roomId.type;
      if (!occupancyByType[roomType]) {
        occupancyByType[roomType] = { roomNights: 0, bookings: 0 };
      }
      occupancyByType[roomType].roomNights += nights;
      occupancyByType[roomType].bookings += 1;
    });
  });

  // Calculate date range in days
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
  const totalPossibleRoomNights = totalRooms * daysDiff;

  const occupancyRate = totalPossibleRoomNights > 0 
    ? (totalRoomNights / totalPossibleRoomNights * 100).toFixed(2)
    : 0;

  res.json({
    status: 'success',
    data: {
      summary: {
        occupancyRate: parseFloat(occupancyRate),
        totalRoomNights,
        totalPossibleRoomNights,
        totalRooms,
        periodDays: daysDiff
      },
      occupancyByType,
      period: { startDate, endDate }
    }
  });
}));

// Booking status report
router.get('/bookings', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
  const {
    startDate,
    endDate,
    hotelId
  } = req.query;

  const matchQuery = {};
  
  if (startDate && endDate) {
    matchQuery.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  if (req.user.role === 'staff' && req.user.hotelId) {
    matchQuery.hotelId = req.user.hotelId;
  } else if (hotelId) {
    matchQuery.hotelId = hotelId;
  }

  const pipeline = [
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { count: -1 } }
  ];

  const results = await Booking.aggregate(pipeline);

  const totalBookings = results.reduce((sum, item) => sum + item.count, 0);
  const totalRevenue = results.reduce((sum, item) => sum + item.totalRevenue, 0);

  res.json({
    status: 'success',
    data: {
      summary: {
        totalBookings,
        totalRevenue
      },
      breakdown: results,
      period: startDate && endDate ? { startDate, endDate } : null
    }
  });
}));

// Booking stats for admin dashboard
router.get('/bookings/stats', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
  const {
    startDate,
    endDate,
    hotelId
  } = req.query;

  const matchQuery = {};
  
  if (startDate && endDate) {
    matchQuery.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  if (req.user.role === 'staff' && req.user.hotelId) {
    matchQuery.hotelId = req.user.hotelId;
  } else if (hotelId) {
    matchQuery.hotelId = hotelId;
  }

  const pipeline = [
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageBookingValue: { $avg: '$totalAmount' },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        confirmed: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        },
        checkedIn: {
          $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] }
        },
        checkedOut: {
          $sum: { $cond: [{ $eq: ['$status', 'checked_out'] }, 1, 0] }
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ];

  const results = await Booking.aggregate(pipeline);

  const stats = results.length > 0 ? results[0] : {
    total: 0,
    totalRevenue: 0,
    averageBookingValue: 0,
    pending: 0,
    confirmed: 0,
    checkedIn: 0,
    checkedOut: 0,
    cancelled: 0
  };

  res.json({
    status: 'success',
    data: {
      stats
    }
  });
}));

export default router;