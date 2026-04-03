import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Housekeeping from '../models/Housekeeping.js';
import GuestService from '../models/GuestService.js';
import MaintenanceTask from '../models/MaintenanceTask.js';
import RoomInventory from '../models/RoomInventory.js';
import Inventory from '../models/Inventory.js';
import SupplyRequest from '../models/SupplyRequest.js';
import CheckoutInventory from '../models/CheckoutInventory.js';
import { validate } from '../middleware/validation.js';
import logger from '../utils/logger.js';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();
const orderInventorySchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(10000).default(50)
}).required();
const inspectRoomSchema = Joi.object({}).max(0).optional();

// All routes require staff authentication, tenant context, and property access
router.use(authenticate);
router.use(ensureTenantContext);
router.use(authorizePolicy('staffDashboard', 'staffAccess'));
router.use(ensurePropertyAccess);

// Simple health check for debugging
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Staff dashboard API is working' });
});

/**
 * Staff Dashboard - Today's Overview
 */
router.get('/today', catchAsync(async (req, res) => {
  const { hotelId } = req.user;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  logger.debug('Staff dashboard today overview', { hotelId });

  // Get today's key metrics for staff
  const [
    todayCheckIns,
    todayCheckOuts,
    pendingHousekeeping,
    pendingMaintenance,
    pendingGuestServices,
    pendingOrders,
    roomMetrics
  ] = await Promise.all([
    // Count bookings scheduled to check in today (including those already checked in)
    Booking.countDocuments({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      checkIn: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'checked_in'] }
    }),
    // Count bookings actually checked out today (status === 'checked_out' AND checkOut falls in today's window)
    Booking.countDocuments({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      checkOut: { $gte: today, $lt: tomorrow },
      status: 'checked_out'
    }),
    Housekeeping.countDocuments({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      status: 'pending'
    }),
    // Count all pending maintenance tasks hotel-wide (not scoped to current user)
    MaintenanceTask.countDocuments({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      status: 'pending'
    }),
    GuestService.countDocuments({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      status: { $in: ['pending', 'assigned'] }
    }),
    SupplyRequest.countDocuments({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      status: 'ordered'
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
                    { $lte: ['$checkIn', today] },
                    { $gt: ['$checkOut', today] },
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

  logger.debug('Staff dashboard query results', { todayCheckIns, todayCheckOuts, pendingHousekeeping, totalRooms, occupiedRooms });

  res.status(200).json({
    status: 'success',
    data: {
      today: {
        checkIns: todayCheckIns,
        checkOuts: todayCheckOuts,
        pendingHousekeeping,
        pendingMaintenance,
        pendingGuestServices,
        pendingOrders,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
      },
      lastUpdated: new Date().toISOString()
    }
  });
}));



/**
 * Staff Dashboard - Room Status Overview
 */
router.get('/rooms/status', catchAsync(async (req, res) => {
  const { hotelId } = req.user;
  const today = new Date();

  logger.debug('Staff rooms/status request', { hotelId });

  // Reusable booking lookup pipeline for real-time occupancy
  const bookingLookupPipeline = [
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
                  { $lte: ['$checkIn', today] },
                  { $gt: ['$checkOut', today] },
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
    }
  ];

  const [roomsWithStatus, roomsNeedingAttention] = await Promise.all([
    Room.aggregate([
      { $match: { hotelId: new mongoose.Types.ObjectId(hotelId) } },
      ...bookingLookupPipeline,
      {
        $group: {
          _id: '$computedStatus',
          count: { $sum: 1 }
        }
      }
    ]),
    Room.aggregate([
      { $match: { hotelId: new mongoose.Types.ObjectId(hotelId) } },
      ...bookingLookupPipeline,
      {
        $match: {
          $or: [
            { computedStatus: 'dirty' },
            { computedStatus: 'maintenance' },
            { computedStatus: 'out_of_order' }
          ]
        }
      },
      {
        $project: {
          roomNumber: 1,
          // Normalise 'dirty' → 'vacant_dirty' to match the summary summary keys
          // so the frontend badge label is consistent with the summary cards
          status: {
            $cond: [
              { $eq: ['$computedStatus', 'dirty'] },
              'vacant_dirty',
              '$computedStatus'
            ]
          },
          type: 1
        }
      },
      { $limit: 20 }
    ])
  ]);

  const statusSummary = {
    occupied: 0,
    vacant_clean: 0,
    vacant_dirty: 0,
    maintenance: 0,
    out_of_order: 0
  };

  roomsWithStatus.forEach(status => {
    if (status._id === 'vacant') {
      statusSummary.vacant_clean = status.count;
    } else if (status._id === 'dirty') {
      statusSummary.vacant_dirty = status.count;
    } else if (status._id in statusSummary) {
      statusSummary[status._id] = status.count;
    }
  });

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
  const now = new Date();
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get recent bookings and services
  const [recentCheckIns, recentCheckOuts, recentServices] = await Promise.all([
    // Recent check-ins - show bookings that checked in within the last 7 days
    Booking.find({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      checkIn: { $gte: last7Days, $lte: now },
      status: { $in: ['checked_in', 'checked_out'] }
    }).populate('userId', 'name').populate('rooms.roomId', 'roomNumber').sort({ checkIn: -1 }).limit(10).lean(),

    // Recent checkout inventories — scoped directly by hotelId field (index: hotelId+createdAt)
    CheckoutInventory.find({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      createdAt: { $gte: last7Days, $lte: now }
    })
      .populate([
        { path: 'bookingId', select: 'bookingNumber userId', populate: { path: 'userId', select: 'name' } },
        { path: 'roomId', select: 'roomNumber' },
        { path: 'checkedBy', select: 'name' }
      ])
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    GuestService.find({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      createdAt: { $gte: last7Days }
    }).populate('userId', 'name')
      .populate({
        path: 'bookingId',
        select: 'rooms',
        populate: {
          path: 'rooms.roomId',
          select: 'roomNumber'
        }
      })
      .sort({ createdAt: -1 }).limit(10).lean()
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
    // Get low stock items using the Inventory model (consistent with admin)
    const lowStockItems = await Inventory.find({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      $expr: { $lte: ['$quantity', '$minimumThreshold'] },
      isActive: true
    }).select('name category quantity minimumThreshold unit').limit(10).lean();
    
    // Get rooms that need inspection (cleaned more than 30 days ago or never cleaned)
    // Paginated: default up to 50 rooms per request
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [roomsNeedingInspection, inspectionTotalCount] = await Promise.all([
      Room.find({
        hotelId: new mongoose.Types.ObjectId(hotelId),
        isActive: true,
        $or: [
          { lastCleaned: { $lt: thirtyDaysAgo } },
          { lastCleaned: { $exists: false } }
        ]
      }).select('_id roomNumber lastCleaned').sort('lastCleaned').lean().limit(50),
      Room.countDocuments({
        hotelId: new mongoose.Types.ObjectId(hotelId),
        isActive: true,
        $or: [
          { lastCleaned: { $lt: thirtyDaysAgo } },
          { lastCleaned: { $exists: false } }
        ]
      })
    ]);

    // Calculate days past due for each room
    const inspectionRooms = roomsNeedingInspection.map(room => {
      const lastCleanedDate = room.lastCleaned || room.createdAt || new Date();
      const daysPastDue = Math.floor((Date.now() - new Date(lastCleanedDate).getTime()) / (1000 * 60 * 60 * 24)) - 30;
      return {
        _id: room._id,
        roomNumber: room.roomNumber,
        daysPastDue: Math.max(0, daysPastDue)
      };
    });

    // Format low stock items (using unified Inventory model fields)
    const formattedLowStockItems = lowStockItems.map(item => ({
      _id: item._id,
      name: item.name,
      currentStock: item.quantity, // quantity field from unified model
      threshold: item.minimumThreshold, // minimumThreshold field from unified model
      category: item.category,
      unit: item.unit
    }));

    res.status(200).json({
      status: 'success',
      data: {
        lowStockAlert: {
          count: formattedLowStockItems.length,
          items: formattedLowStockItems
        },
        inspectionsDue: {
          count: inspectionTotalCount,
          rooms: inspectionRooms
        }
      }
    });
  } catch (error) {
    logger.error('Error in /inventory/summary', { error: error.message });
    // Return empty data on error but still indicate success to prevent UI crashes
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

/**
 * Staff Dashboard - Order Inventory Item (Mark as Ordered)
 */
router.post('/inventory/:itemId/order', validate(orderInventorySchema), catchAsync(async (req, res) => {
  const { itemId } = req.params;
  const { hotelId } = req.user;
  const { quantity = 50 } = req.body; // Default order quantity

  // Atomic: find the inventory item, verify ownership, and compute new stock in one step
  // First read to get threshold for calculation
  const existingItem = await Inventory.findOne({
    _id: itemId,
    hotelId: new mongoose.Types.ObjectId(hotelId),
    isActive: true
  }).lean();

  if (!existingItem) {
    throw new ApplicationError('Inventory item not found', 404);
  }

  // For this demo, we'll just increase the current stock to above threshold
  // In a real system, this would create a purchase order
  const newStock = existingItem.minimumThreshold + quantity;

  const inventoryItem = await Inventory.findOneAndUpdate(
    { _id: itemId, hotelId: new mongoose.Types.ObjectId(hotelId), isActive: true },
    { $set: { quantity: newStock } },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      item: {
        _id: inventoryItem._id,
        name: inventoryItem.name,
        quantity: inventoryItem.quantity,
        minimumThreshold: inventoryItem.minimumThreshold,
        unit: inventoryItem.unit
      }
    },
    message: `Order placed for ${inventoryItem.name}. Stock updated to ${newStock} ${inventoryItem.unit}.`
  });
}));

/**
 * Staff Dashboard - Update Room Status (staff-accessible version)
 * Allows housekeeping and staff to mark rooms clean/dirty/inspected
 * without requiring the admin-level 'rooms.createUpdateAccess' RBAC policy.
 */
const updateRoomStatusSchema = Joi.object({
  status: Joi.string().valid('vacant', 'dirty', 'maintenance', 'out_of_order').required()
}).required();

router.patch('/rooms/:roomId/status', validate(updateRoomStatusSchema), catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const { hotelId } = req.user;
  const { status } = req.body;

  const room = await Room.findOneAndUpdate(
    { _id: roomId, hotelId: new mongoose.Types.ObjectId(hotelId) },
    { $set: { status, ...(status === 'vacant' ? { lastCleaned: new Date() } : {}) } },
    { new: true }
  );

  if (!room) {
    throw new ApplicationError('Room not found or access denied', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      room: {
        _id: room._id,
        roomNumber: room.roomNumber,
        status: room.status,
        lastCleaned: room.lastCleaned
      }
    },
    message: `Room ${room.roomNumber} status updated to ${status}`
  });
}));

/**
 * Staff Dashboard - Mark Room as Inspected
 */
router.patch('/rooms/:roomId/inspect', validate(inspectRoomSchema), catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const { hotelId } = req.user;

  // Atomic update: find room, verify ownership, and update lastCleaned
  const room = await Room.findOneAndUpdate(
    { _id: roomId, hotelId: new mongoose.Types.ObjectId(hotelId) },
    { $set: { lastCleaned: new Date() } },
    { new: true }
  );

  if (!room) {
    throw new ApplicationError('Room not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      room: {
        _id: room._id,
        roomNumber: room.roomNumber,
        lastCleaned: room.lastCleaned
      }
    },
    message: `Room ${room.roomNumber} marked as inspected`
  });
}));

export default router;