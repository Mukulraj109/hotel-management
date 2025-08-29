import express from 'express';
import mongoose from 'mongoose';
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
    // paymentStatus: 'paid', // Temporarily removed for debugging
    // createdAt: {  // Temporarily removed for debugging
    //   $gte: new Date(startDate),
    //   $lte: new Date(endDate)
    // }
  };

  // Filter by hotel if user is staff
  if (req.user.role === 'staff' && req.user.hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(req.user.hotelId);
  } else if (hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(hotelId);
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

  console.log('Revenue report matchQuery:', matchQuery);
  
  // Debug: Check total bookings for this hotel
  const totalBookingsForHotel = await Booking.countDocuments({ hotelId: matchQuery.hotelId });
  console.log('Total bookings in DB for hotel:', totalBookingsForHotel);
  
  const results = await Booking.aggregate(pipeline);
  console.log('Revenue report results:', results.length, 'bookings found');

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
    matchQuery.hotelId = new mongoose.Types.ObjectId(req.user.hotelId);
  } else if (hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(hotelId);
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
  
  // Temporarily removed date filtering for debugging
  // if (startDate && endDate) {
  //   matchQuery.createdAt = {
  //     $gte: new Date(startDate),
  //     $lte: new Date(endDate)
  //   };
  // }

  if (req.user.role === 'staff' && req.user.hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(req.user.hotelId);
  } else if (hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(hotelId);
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
  
  // Temporarily removed date filtering for debugging
  // if (startDate && endDate) {
  //   matchQuery.createdAt = {
  //     $gte: new Date(startDate),
  //     $lte: new Date(endDate)
  //   };
  // }

  if (req.user.role === 'staff' && req.user.hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(req.user.hotelId);
  } else if (hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(hotelId);
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

  // Debug: Check what status values actually exist
  const statusValues = await Booking.distinct('status', { hotelId: matchQuery.hotelId });
  console.log('Actual booking status values in DB:', statusValues);
  
  const results = await Booking.aggregate(pipeline);
  console.log('Booking stats results:', results);

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

// Revenue breakdown - detailed breakdown of revenue sources
router.get('/revenue-breakdown', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
  const {
    month,
    year,
    hotelId
  } = req.query;

  // Default to current month if not provided
  const currentDate = new Date();
  const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth(); // JS months are 0-based
  const targetYear = year ? parseInt(year) : currentDate.getFullYear();

  // Create start and end dates for the month
  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59); // Last day of month

  console.log('Revenue breakdown query:', { startDate, endDate, hotelId });

  const matchQuery = {
    status: { $in: ['checked_out', 'confirmed', 'checked_in'] },
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  };

  // Filter by hotel if user is staff
  if (req.user.role === 'staff' && req.user.hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(req.user.hotelId);
  } else if (hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(hotelId);
  }

  // Get detailed booking data
  const bookings = await Booking.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: 'rooms',
        localField: 'rooms.roomId',
        foreignField: '_id',
        as: 'roomDetails'
      }
    },
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'bookingId',
        as: 'payments'
      }
    },
    {
      $project: {
        _id: 1,
        totalAmount: 1,
        status: 1,
        checkIn: 1,
        checkOut: 1,
        createdAt: 1,
        roomDetails: 1,
        payments: 1,
        rooms: 1
      }
    }
  ]);

  console.log(`Found ${bookings.length} bookings for revenue breakdown`);

  // Calculate breakdown
  let roomRevenue = 0;
  let taxRevenue = 0;
  let serviceRevenue = 0;
  let extraCharges = 0;
  let refunds = 0;

  const revenueByRoomType = {
    single: 0,
    double: 0,
    suite: 0,
    deluxe: 0
  };

  const revenueByWeek = [0, 0, 0, 0, 0]; // 5 weeks max in a month
  const revenueByStatus = {
    confirmed: 0,
    checked_in: 0,
    checked_out: 0
  };

  bookings.forEach(booking => {
    const bookingRevenue = booking.totalAmount || 0;
    
    // Base room revenue (80% of total)
    const baseRoom = bookingRevenue * 0.8;
    roomRevenue += baseRoom;
    
    // Tax (18% of base)
    const tax = baseRoom * 0.18;
    taxRevenue += tax;
    
    // Service charges (10% of base)
    const service = baseRoom * 0.1;
    serviceRevenue += service;
    
    // Extra charges (remaining)
    const extra = bookingRevenue - baseRoom - tax - service;
    extraCharges += Math.max(0, extra);

    // Revenue by room type
    if (booking.roomDetails && booking.roomDetails.length > 0) {
      booking.roomDetails.forEach(room => {
        const roomTypeRevenue = bookingRevenue / booking.roomDetails.length;
        if (revenueByRoomType[room.type] !== undefined) {
          revenueByRoomType[room.type] += roomTypeRevenue;
        }
      });
    }

    // Revenue by week (based on check-in date)
    const checkInDate = new Date(booking.checkIn);
    const weekOfMonth = Math.ceil(checkInDate.getDate() / 7) - 1;
    if (weekOfMonth >= 0 && weekOfMonth < 5) {
      revenueByWeek[weekOfMonth] += bookingRevenue;
    }

    // Revenue by status
    if (revenueByStatus[booking.status] !== undefined) {
      revenueByStatus[booking.status] += bookingRevenue;
    }
  });

  // Handle any refunds from payments
  bookings.forEach(booking => {
    if (booking.payments) {
      booking.payments.forEach(payment => {
        if (payment.status === 'refunded') {
          refunds += payment.amount || 0;
        }
      });
    }
  });

  const totalRevenue = roomRevenue + taxRevenue + serviceRevenue + extraCharges - refunds;

  const breakdown = {
    total: totalRevenue,
    components: {
      roomRevenue: {
        amount: roomRevenue,
        percentage: totalRevenue > 0 ? (roomRevenue / totalRevenue * 100).toFixed(1) : 0,
        label: 'Room Charges'
      },
      taxRevenue: {
        amount: taxRevenue,
        percentage: totalRevenue > 0 ? (taxRevenue / totalRevenue * 100).toFixed(1) : 0,
        label: 'Taxes & GST'
      },
      serviceRevenue: {
        amount: serviceRevenue,
        percentage: totalRevenue > 0 ? (serviceRevenue / totalRevenue * 100).toFixed(1) : 0,
        label: 'Service Charges'
      },
      extraCharges: {
        amount: extraCharges,
        percentage: totalRevenue > 0 ? (extraCharges / totalRevenue * 100).toFixed(1) : 0,
        label: 'Extra Services'
      }
    },
    byRoomType: Object.entries(revenueByRoomType).map(([type, amount]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      amount,
      percentage: totalRevenue > 0 ? (amount / totalRevenue * 100).toFixed(1) : 0
    })).filter(item => item.amount > 0),
    byWeek: revenueByWeek.map((amount, index) => ({
      week: index + 1,
      amount,
      percentage: totalRevenue > 0 ? (amount / totalRevenue * 100).toFixed(1) : 0
    })).filter(item => item.amount > 0),
    byStatus: Object.entries(revenueByStatus).map(([status, amount]) => ({
      status: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      amount,
      percentage: totalRevenue > 0 ? (amount / totalRevenue * 100).toFixed(1) : 0
    })).filter(item => item.amount > 0),
    metrics: {
      totalBookings: bookings.length,
      averageBookingValue: bookings.length > 0 ? totalRevenue / bookings.length : 0,
      refunds: refunds,
      netRevenue: totalRevenue - refunds
    },
    period: {
      month: targetMonth + 1,
      year: targetYear,
      monthName: new Date(targetYear, targetMonth, 1).toLocaleString('en-US', { month: 'long' })
    }
  };

  console.log('Revenue breakdown calculated:', breakdown);

  res.json({
    status: 'success',
    data: breakdown
  });
}));

// Occupancy breakdown - detailed occupancy analysis
router.get('/occupancy-breakdown', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
  const {
    month,
    year,
    hotelId
  } = req.query;

  const currentDate = new Date();
  
  // For current occupancy, we only care about bookings that are active TODAY
  const matchQuery = {
    status: { $in: ['confirmed', 'checked_in'] }, // Only active bookings
    checkIn: { $lte: currentDate }, // Check-in date has passed
    checkOut: { $gt: currentDate }  // Check-out date is in the future
  };

  if (req.user.role === 'staff' && req.user.hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(req.user.hotelId);
  } else if (hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(hotelId);
  }

  // Get bookings and rooms data
  const [bookings, rooms] = await Promise.all([
    Booking.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'rooms',
          localField: 'rooms.roomId',
          foreignField: '_id',
          as: 'roomDetails'
        }
      }
    ]),
    Room.find({ 
      hotelId: req.user.role === 'staff' ? req.user.hotelId : hotelId,
      isActive: true 
    })
  ]);
  
  // Debug information
  console.log('Current Occupancy Debug Info:');
  console.log('Total rooms found:', rooms.length);
  console.log('Current active bookings found:', bookings.length);
  console.log('Current date/time:', currentDate);
  console.log('Sample booking:', bookings.length > 0 ? {
    id: bookings[0]._id,
    status: bookings[0].status,
    checkIn: bookings[0].checkIn,
    checkOut: bookings[0].checkOut,
    rooms: bookings[0].rooms,
    roomDetails: bookings[0].roomDetails?.map(r => ({ type: r.type, roomNumber: r.roomNumber, _id: r._id }))
  } : 'No active bookings');

  const totalRooms = rooms.length;
  
  // Count currently occupied rooms
  let currentlyOccupiedRooms = 0;
  const occupiedRoomsByType = {};
  const occupiedRoomsList = [];
  const availableRoomsList = [];
  
  // Initialize room type tracking with all available room types
  rooms.forEach(room => {
    if (!occupiedRoomsByType[room.type]) {
      occupiedRoomsByType[room.type] = {
        occupied: 0,
        total: 0
      };
    }
    occupiedRoomsByType[room.type].total++;
  });

  // Track which specific rooms are occupied
  const occupiedRoomIds = new Set();
  
  bookings.forEach(booking => {
    if (booking.roomDetails && booking.roomDetails.length > 0) {
      booking.roomDetails.forEach(room => {
        occupiedRoomIds.add(room._id.toString());
        currentlyOccupiedRooms++;
        
        if (occupiedRoomsByType[room.type]) {
          occupiedRoomsByType[room.type].occupied++;
        }
        
        occupiedRoomsList.push({
          roomNumber: room.roomNumber,
          type: room.type,
          guestName: booking.guestName || 'Guest',
          status: booking.status,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut
        });
      });
    }
  });
  
  // Get available rooms
  rooms.forEach(room => {
    if (!occupiedRoomIds.has(room._id.toString())) {
      availableRoomsList.push({
        roomNumber: room.roomNumber,
        type: room.type,
        status: 'available'
      });
    }
  });

  const currentOccupancyRate = totalRooms > 0 ? (currentlyOccupiedRooms / totalRooms * 100) : 0;
    
  // Debug calculations
  console.log('Current Occupancy Results:');
  console.log('Total rooms:', totalRooms);
  console.log('Currently occupied rooms:', currentlyOccupiedRooms);
  console.log('Current occupancy rate:', currentOccupancyRate.toFixed(1) + '%');
  console.log('Occupied rooms by type:', occupiedRoomsByType);
  console.log('Occupied rooms list:', occupiedRoomsList.map(r => r.roomNumber));

  const breakdown = {
    overall: {
      rate: currentOccupancyRate,
      totalRooms,
      occupiedRooms: currentlyOccupiedRooms,
      availableRooms: totalRooms - currentlyOccupiedRooms
    },
    byRoomType: Object.entries(occupiedRoomsByType).map(([type, data]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      rate: data.total > 0 ? (data.occupied / data.total * 100) : 0,
      occupiedRooms: data.occupied,
      totalRooms: data.total,
      percentage: ((data.occupied / currentlyOccupiedRooms) * 100).toFixed(1)
    })),
    occupiedRooms: occupiedRoomsList,
    availableRooms: availableRoomsList.slice(0, 10), // Limit to first 10 for display
    peakDays: [], // Not relevant for current occupancy
    metrics: {
      averageRate: currentOccupancyRate,
      peakOccupancy: currentOccupancyRate, // Current is the "peak" for now
      lowestOccupancy: currentOccupancyRate, // Current is the "lowest" for now
      roomNights: currentlyOccupiedRooms
    },
    period: {
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      monthName: currentDate.toLocaleString('en-US', { month: 'long' }),
      currentTime: currentDate.toLocaleString()
    }
  };

  res.json({
    status: 'success',
    data: breakdown
  });
}));

// Bookings breakdown - detailed bookings analysis  
router.get('/bookings-breakdown', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
  const {
    month,
    year,
    hotelId
  } = req.query;

  const currentDate = new Date();
  const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
  const targetYear = year ? parseInt(year) : currentDate.getFullYear();

  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

  const matchQuery = {
    createdAt: { $gte: startDate, $lte: endDate }
  };

  if (req.user.role === 'staff' && req.user.hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(req.user.hotelId);
  } else if (hotelId) {
    matchQuery.hotelId = new mongoose.Types.ObjectId(hotelId);
  }

  const bookings = await Booking.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: 'rooms',
        localField: 'rooms.roomId',
        foreignField: '_id',
        as: 'roomDetails'
      }
    }
  ]);

  const statusBreakdown = {};
  const sourceBreakdown = { direct: 0, ota: 0, walk_in: 0 };
  const weeklyBookings = [0, 0, 0, 0, 0];
  const roomTypeBookings = {};
  
  let totalRevenue = 0;
  let cancelledBookings = 0;
  let noShowBookings = 0;

  bookings.forEach(booking => {
    // Status breakdown
    const status = booking.status;
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    
    if (status === 'cancelled') cancelledBookings++;
    if (status === 'no_show') noShowBookings++;
    
    // Revenue calculation
    totalRevenue += booking.totalAmount || 0;
    
    // Source breakdown (mock data for now)
    const source = booking.source || 'direct';
    if (sourceBreakdown[source] !== undefined) {
      sourceBreakdown[source]++;
    } else {
      sourceBreakdown.direct++;
    }
    
    // Weekly breakdown
    const weekOfMonth = Math.ceil(new Date(booking.createdAt).getDate() / 7) - 1;
    if (weekOfMonth >= 0 && weekOfMonth < 5) {
      weeklyBookings[weekOfMonth]++;
    }
    
    // Room type breakdown
    booking.roomDetails?.forEach(room => {
      const type = room.type;
      roomTypeBookings[type] = (roomTypeBookings[type] || 0) + 1;
    });
  });

  const breakdown = {
    total: bookings.length,
    byStatus: Object.entries(statusBreakdown).map(([status, count]) => ({
      status: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      percentage: bookings.length > 0 ? (count / bookings.length * 100).toFixed(1) : 0,
      revenue: (booking => {
        const statusRevenue = bookings
          .filter(b => b.status === status)
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        return statusRevenue;
      })()
    })),
    bySource: Object.entries(sourceBreakdown).map(([source, count]) => ({
      source: source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      percentage: bookings.length > 0 ? (count / bookings.length * 100).toFixed(1) : 0,
      averageValue: count > 0 ? totalRevenue / count : 0
    })),
    weekly: weeklyBookings.map((count, index) => ({
      week: index + 1,
      count,
      revenue: bookings
        .filter(b => Math.ceil(new Date(b.createdAt).getDate() / 7) - 1 === index)
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      averageValue: count > 0 ? (bookings
        .filter(b => Math.ceil(new Date(b.createdAt).getDate() / 7) - 1 === index)
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0) / count) : 0
    })).filter(item => item.count > 0),
    metrics: {
      totalRevenue,
      averageBookingValue: bookings.length > 0 ? totalRevenue / bookings.length : 0,
      confirmationRate: bookings.length > 0 ? ((bookings.length - cancelledBookings) / bookings.length * 100) : 0,
      cancellationRate: bookings.length > 0 ? (cancelledBookings / bookings.length * 100) : 0
    },
    period: {
      month: targetMonth + 1,
      year: targetYear,
      monthName: new Date(targetYear, targetMonth, 1).toLocaleString('en-US', { month: 'long' })
    }
  };

  res.json({
    status: 'success',
    data: breakdown
  });
}));

// Guest satisfaction breakdown - detailed satisfaction analysis
router.get('/satisfaction-breakdown', authenticate, authorize('admin', 'staff'), catchAsync(async (req, res) => {
  const {
    month,
    year,
    hotelId
  } = req.query;

  const currentDate = new Date();
  const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
  const targetYear = year ? parseInt(year) : currentDate.getFullYear();

  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

  // Mock satisfaction data (in real app, this would come from reviews/feedback)
  const mockSatisfactionData = {
    overall: {
      rating: 3.8,
      totalReviews: 24,
      distribution: {
        5: 8,
        4: 6,
        3: 5,
        2: 3,
        1: 2
      }
    },
    categories: {
      cleanliness: { rating: 4.2, reviews: 24 },
      service: { rating: 3.9, reviews: 24 },
      location: { rating: 4.1, reviews: 24 },
      value: { rating: 3.5, reviews: 24 },
      amenities: { rating: 3.7, reviews: 24 }
    },
    trends: {
      thisMonth: 3.8,
      lastMonth: 3.8,
      improvement: 0.0
    }
  };

  const breakdown = {
    overallRating: mockSatisfactionData.overall.rating,
    totalReviews: mockSatisfactionData.overall.totalReviews,
    ratingDistribution: Object.entries(mockSatisfactionData.overall.distribution).map(([rating, count]) => ({
      rating: parseInt(rating),
      count,
      percentage: mockSatisfactionData.overall.totalReviews > 0 ? 
        (count / mockSatisfactionData.overall.totalReviews * 100).toFixed(1) : 0
    })).reverse(),
    categoryRatings: Object.entries(mockSatisfactionData.categories).map(([category, data]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      rating: data.rating,
      reviews: data.reviews
    })),
    trends: {
      monthlyChange: mockSatisfactionData.trends.improvement,
      trend: mockSatisfactionData.trends.improvement >= 0 ? 'up' : 'down'
    },
    insights: [
      'Room cleanliness rated highest at 4.2/5',
      'Value for money needs improvement at 3.5/5',
      '67% of guests rate service as good or excellent'
    ],
    period: {
      month: targetMonth + 1,
      year: targetYear,
      monthName: new Date(targetYear, targetMonth, 1).toLocaleString('en-US', { month: 'long' })
    }
  };

  res.json({
    status: 'success',
    data: breakdown
  });
}));

export default router;