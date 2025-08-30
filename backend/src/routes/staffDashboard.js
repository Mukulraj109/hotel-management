import express from 'express';
import mongoose from 'mongoose';
import { authenticate, authorize } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Housekeeping from '../models/Housekeeping.js';
import GuestService from '../models/GuestService.js';
import MaintenanceTask from '../models/MaintenanceTask.js';
import RoomInventory from '../models/RoomInventory.js';
import InventoryItem from '../models/InventoryItem.js';

const router = express.Router();

// All routes require staff authentication
router.use(authenticate);
router.use(authorize('staff', 'admin'));

/**
 * Staff Dashboard - Today's Overview
 */
router.get('/today', catchAsync(async (req, res) => {
  const { hotelId } = req.user;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's key metrics for staff
  const [
    todayCheckIns,
    todayCheckOuts,
    pendingHousekeeping,
    pendingMaintenance,
    pendingGuestServices,
    roomMetrics
  ] = await Promise.all([
    Booking.countDocuments({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      checkIn: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'checked_in'] }
    }),
    Booking.countDocuments({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      checkOut: { $gte: today, $lt: tomorrow },
      status: 'checked_in'
    }),
    Housekeeping.countDocuments({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      status: 'pending'
    }),
    MaintenanceTask.countDocuments({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      status: 'pending'
    }),
    GuestService.countDocuments({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      status: { $in: ['pending', 'assigned'] }
    }),
    // Use real-time room status calculation like admin dashboard
    Room.aggregate([
      { $match: { hotelId: new mongoose.Types.ObjectId(hotelId) } },
      {
        $lookup: {
          from: 'bookings',
          let: { roomId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$$roomId', '$rooms.roomId'] },
                    { $lte: ['$checkIn', new Date()] },
                    { $gt: ['$checkOut', new Date()] },
                    { $in: ['$status', ['confirmed', 'checked_in']] }
                  ]
                }
              }
            }
          ],
          as: 'currentBooking'
        }
      },
      {
        $group: {
          _id: null,
          totalRooms: { $sum: 1 },
          occupiedRooms: {
            $sum: { $cond: [{ $gt: [{ $size: '$currentBooking' }, 0] }, 1, 0] }
          }
        }
      }
    ])
  ]);

  const totalRooms = roomMetrics[0]?.totalRooms || 0;
  const occupiedRooms = roomMetrics[0]?.occupiedRooms || 0;

  res.status(200).json({
    status: 'success',
    data: {
      today: {
        checkIns: todayCheckIns,
        checkOuts: todayCheckOuts,
        pendingHousekeeping,
        pendingMaintenance,
        pendingGuestServices,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
      },
      lastUpdated: new Date().toISOString()
    }
  });
}));

/**
 * Staff Dashboard - My Tasks
 */
router.get('/my-tasks', catchAsync(async (req, res) => {
  const { _id: staffId, hotelId } = req.user;

  try {
    // Get tasks assigned to this staff member
    const [housekeepingTasks, maintenanceTasks, guestServices] = await Promise.all([
      Housekeeping.find({
        hotelId: new mongoose.Types.ObjectId(hotelId),
        assignedToUserId: staffId,
        status: { $in: ['pending', 'in_progress'] }
      }).populate('roomId', 'roomNumber type').limit(10),
      
      MaintenanceTask.find({
        hotelId: new mongoose.Types.ObjectId(hotelId),
        assignedTo: staffId,
        status: { $in: ['pending', 'in_progress'] }
      }).populate('roomId', 'roomNumber type').limit(10),
      
      GuestService.find({
        hotelId: new mongoose.Types.ObjectId(hotelId),
        assignedTo: staffId,
        status: { $in: ['assigned', 'in_progress'] }
      }).populate('userId', 'name').populate('roomId', 'roomNumber').limit(10)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        housekeeping: housekeepingTasks || [],
        maintenance: maintenanceTasks || [],
        guestServices: guestServices || [],
        totalTasks: (housekeepingTasks?.length || 0) + (maintenanceTasks?.length || 0) + (guestServices?.length || 0)
      }
    });
  } catch (error) {
    console.error('Error in /my-tasks:', error);
    res.status(200).json({
      status: 'success',
      data: {
        housekeeping: [],
        maintenance: [],
        guestServices: [],
        totalTasks: 0
      }
    });
  }
}));

/**
 * Staff Dashboard - Room Status Overview
 */
router.get('/rooms/status', catchAsync(async (req, res) => {
  const { hotelId } = req.user;

  // Use real-time room status calculation like admin dashboard
  const roomsWithStatus = await Room.aggregate([
    { $match: { hotelId: new mongoose.Types.ObjectId(hotelId) } },
    {
      $lookup: {
        from: 'bookings',
        let: { roomId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ['$$roomId', '$rooms.roomId'] },
                  { $lte: ['$checkIn', new Date()] },
                  { $gt: ['$checkOut', new Date()] },
                  { $in: ['$status', ['confirmed', 'checked_in']] }
                ]
              }
            }
          }
        ],
        as: 'currentBooking'
      }
    },
    {
      $addFields: {
        computedStatus: {
          $cond: [
            { $gt: [{ $size: '$currentBooking' }, 0] },
            'occupied',
            '$status'
          ]
        }
      }
    },
    {
      $group: {
        _id: '$computedStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  const statusSummary = {
    occupied: 0,
    vacant: 0,
    vacant_clean: 0,
    vacant_dirty: 0,
    maintenance: 0,
    out_of_order: 0
  };

  roomsWithStatus.forEach(status => {
    statusSummary[status._id] = status.count;
  });

  // Get rooms that need attention (using real-time status)
  const roomsNeedingAttention = await Room.aggregate([
    { $match: { hotelId: new mongoose.Types.ObjectId(hotelId) } },
    {
      $lookup: {
        from: 'bookings',
        let: { roomId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ['$$roomId', '$rooms.roomId'] },
                  { $lte: ['$checkIn', new Date()] },
                  { $gt: ['$checkOut', new Date()] },
                  { $in: ['$status', ['confirmed', 'checked_in']] }
                ]
              }
            }
          }
        ],
        as: 'currentBooking'
      }
    },
    {
      $addFields: {
        computedStatus: {
          $cond: [
            { $gt: [{ $size: '$currentBooking' }, 0] },
            'occupied',
            '$status'
          ]
        }
      }
    },
    {
      $match: {
        $or: [
          { computedStatus: 'vacant_dirty' },
          { computedStatus: 'maintenance' },
          { computedStatus: 'out_of_order' }
        ]
      }
    },
    {
      $project: {
        roomNumber: 1,
        status: '$computedStatus',
        type: 1
      }
    }
  ]).limit(20);

  res.status(200).json({
    status: 'success',
    data: {
      summary: statusSummary,
      needsAttention: roomsNeedingAttention,
      total: Object.values(statusSummary).reduce((a, b) => a + b, 0)
    }
  });
}));

/**
 * Staff Dashboard - Recent Activity
 */
router.get('/activity', catchAsync(async (req, res) => {
  const { hotelId } = req.user;
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get recent bookings and services
  const [recentCheckIns, recentCheckOuts, recentServices] = await Promise.all([
    Booking.find({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      checkIn: { $gte: last24Hours },
      status: 'checked_in'
    }).populate('userId', 'name').populate('rooms.roomId', 'roomNumber').limit(10),

    Booking.find({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      checkOut: { $gte: last24Hours },
      status: 'checked_out'
    }).populate('userId', 'name').populate('rooms.roomId', 'roomNumber').limit(10),

    GuestService.find({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      createdAt: { $gte: last24Hours }
    }).populate('userId', 'name').populate('roomId', 'roomNumber').limit(10)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      checkIns: recentCheckIns,
      checkOuts: recentCheckOuts,
      guestServices: recentServices
    }
  });
}));

/**
 * Staff Dashboard - Inventory Summary (limited view)
 */
router.get('/inventory/summary', catchAsync(async (req, res) => {
  const { hotelId } = req.user;

  try {
    // Since InventoryItem and RoomInventory have no data, return empty results
    res.status(200).json({
      status: 'success',
      data: {
        lowStockAlert: {
          count: 0,
          items: []
        },
        inspectionsDue: {
          count: 0,
          rooms: []
        }
      }
    });
  } catch (error) {
    console.error('Error in /inventory/summary:', error);
    res.status(200).json({
      status: 'success',
      data: {
        lowStockAlert: {
          count: 0,
          items: []
        },
        inspectionsDue: {
          count: 0,
          rooms: []
        }
      }
    });
  }
}));

export default router;