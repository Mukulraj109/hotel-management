import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       required:
 *         - hotelId
 *         - roomNumber
 *         - type
 *         - baseRate
 *       properties:
 *         _id:
 *           type: string
 *         hotelId:
 *           type: string
 *           description: Hotel ID
 *         roomNumber:
 *           type: string
 *           description: Room number
 *         type:
 *           type: string
 *           enum: [single, double, suite, deluxe]
 *         baseRate:
 *           type: number
 *           description: Base rate per night
 *         currentRate:
 *           type: number
 *           description: Current rate per night
 *         status:
 *           type: string
 *           enum: [vacant, occupied, dirty, maintenance, out_of_order]
 *           default: vacant
 *         floor:
 *           type: number
 *         capacity:
 *           type: number
 *           default: 2
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         description:
 *           type: string
 *         isActive:
 *           type: boolean
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const roomSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hotel',
    required: [true, 'Hotel ID is required']
  },
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Room type is required'],
    enum: {
      values: ['single', 'double', 'suite', 'deluxe'],
      message: 'Room type must be single, double, suite, or deluxe'
    }
  },
  baseRate: {
    type: Number,
    required: [true, 'Base rate is required'],
    min: [0, 'Base rate cannot be negative']
  },
  currentRate: {
    type: Number,
    min: [0, 'Current rate cannot be negative']
  },
  status: {
    type: String,
    enum: {
      values: ['vacant', 'occupied', 'dirty', 'maintenance', 'out_of_order'],
      message: 'Invalid room status'
    },
    default: 'vacant'
  },
  floor: {
    type: Number,
    min: 1
  },
  capacity: {
    type: Number,
    required: true,
    min: [1, 'Capacity must be at least 1'],
    default: 2
  },
  amenities: [{
    type: String,
    trim: true
  }],
  images: [{
    type: String,
    match: [/^https?:\/\//, 'Image URL must be valid']
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastCleaned: Date,
  maintenanceNotes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hotelId: 1, type: 1, status: 1 });
roomSchema.index({ hotelId: 1, floor: 1 });

// Set current rate to base rate if not provided
roomSchema.pre('save', function(next) {
  if (!this.currentRate) {
    this.currentRate = this.baseRate;
  }
  next();
});

// Virtual for current bookings
roomSchema.virtual('currentBookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'rooms.roomId',
  match: {
    status: { $in: ['confirmed', 'checked_in'] },
    checkOut: { $gte: new Date() }
  }
});

// Instance method to check availability for date range
roomSchema.methods.isAvailable = async function(checkIn, checkOut) {
  const Booking = mongoose.model('Booking');
  
  const conflictingBookings = await Booking.find({
    'rooms.roomId': this._id,
    status: { $in: ['confirmed', 'checked_in'] },
    $or: [
      { checkIn: { $lt: checkOut, $gte: checkIn } },
      { checkOut: { $gt: checkIn, $lte: checkOut } },
      { checkIn: { $lte: checkIn }, checkOut: { $gte: checkOut } }
    ]
  });

  return conflictingBookings.length === 0 && this.status === 'vacant' && this.isActive;
};

// Static method to find available rooms
roomSchema.statics.findAvailable = async function(hotelId, checkInDate, checkOutDate, roomType = null) {
  const Booking = mongoose.model('Booking');
  
  // Find all bookings that conflict with the date range
  const conflictingBookings = await Booking.find({
    hotelId,
    status: { $in: ['confirmed', 'checked_in'] },
    $or: [
      { checkIn: { $lt: checkOutDate, $gte: checkInDate } },
      { checkOut: { $gt: checkInDate, $lte: checkOutDate } },
      { checkIn: { $lte: checkInDate }, checkOut: { $gte: checkOutDate } }
    ]
  }).select('rooms.roomId');

  // Extract room IDs from conflicting bookings
  const occupiedRoomIds = conflictingBookings.flatMap(booking => 
    booking.rooms.map(room => room.roomId.toString())
  );

  // Debug logging
  console.log('Conflicting bookings found:', conflictingBookings.length);
  console.log('Occupied room IDs:', occupiedRoomIds);

  // Build query for available rooms
  const query = {
    hotelId,
    _id: { $nin: occupiedRoomIds },
    status: 'vacant',
    isActive: true
  };

  if (roomType) {
    query.type = roomType;
  }

  // Debug logging
  console.log('Room query:', JSON.stringify(query, null, 2));

  // Return the executed query results, not a query object
  const availableRooms = await this.find(query).sort({ roomNumber: 1 });
  
  // Debug logging
  console.log('Available rooms query result:', availableRooms.length);
  
  return availableRooms;
};

// Method to get room status based on current bookings
roomSchema.statics.getRoomsWithRealTimeStatus = async function(hotelId, options = {}) {
  const Booking = mongoose.model('Booking');
  
  const {
    type,
    floor,
    page = 1,
    limit = 100
  } = options;
  
  // Build base query
  const query = {
    hotelId,
    isActive: true
  };
  
  if (type) query.type = type;
  if (floor) query.floor = floor;
  
  // Get all rooms for the hotel
  const rooms = await this.find(query)
    .sort({ floor: 1, roomNumber: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  if (!rooms.length) return { rooms: [], total: 0 };
  
  // Get current date
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  
  // Find all current bookings that affect these rooms
  const currentBookings = await Booking.find({
    hotelId,
    status: { $in: ['confirmed', 'checked_in'] },
    checkOut: { $gte: today }, // Haven't checked out yet
    checkIn: { $lte: tomorrow } // Started or starting soon
  }).select('rooms.roomId status checkIn checkOut');
  
  console.log('Real-time status calculation:', {
    hotelId,
    today: today.toISOString(),
    tomorrow: tomorrow.toISOString(),
    totalRooms: rooms.length,
    currentBookings: currentBookings.length,
    bookings: currentBookings.map(b => ({
      id: b._id,
      status: b.status,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      roomIds: b.rooms.map(r => r.roomId)
    }))
  });
  
  // Create a map of room occupancy
  const roomOccupancyMap = new Map();
  
  currentBookings.forEach(booking => {
    booking.rooms.forEach(roomBooking => {
      const roomId = roomBooking.roomId.toString();
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      let computedStatus = 'occupied';
      
      // More granular status based on dates and booking status
      if (booking.status === 'checked_in') {
        computedStatus = 'occupied';
      } else if (booking.status === 'confirmed') {
        if (checkIn <= today) {
          computedStatus = 'occupied'; // Should be checked in
        } else {
          computedStatus = 'reserved'; // Reserved for future
        }
      }
      
      roomOccupancyMap.set(roomId, {
        status: computedStatus,
        bookingId: booking._id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        bookingStatus: booking.status
      });
    });
  });
  
  // Add computed status to each room
  const roomsWithStatus = rooms.map(room => {
    const roomObj = room.toObject();
    const occupancy = roomOccupancyMap.get(room._id.toString());
    
    if (occupancy) {
      roomObj.computedStatus = occupancy.status;
      roomObj.currentBooking = {
        bookingId: occupancy.bookingId,
        checkIn: occupancy.checkIn,
        checkOut: occupancy.checkOut,
        status: occupancy.bookingStatus
      };
    } else {
      // Check if room has any other status (maintenance, dirty, etc.)
      roomObj.computedStatus = room.status === 'vacant' ? 'vacant' : room.status;
    }
    
    return roomObj;
  });
  
  // Get total count for pagination
  const total = await this.countDocuments(query);
  
  return {
    rooms: roomsWithStatus,
    total,
    pagination: {
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

export default mongoose.model('Room', roomSchema);