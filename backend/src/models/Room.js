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
roomSchema.statics.findAvailable = function(hotelId, checkIn, checkOut, roomType = null) {
  const Booking = mongoose.model('Booking');
  
  // Find all bookings that conflict with the date range
  const conflictingBookingsPromise = Booking.find({
    hotelId,
    status: { $in: ['confirmed', 'checked_in'] },
    $or: [
      { checkIn: { $lt: checkOut, $gte: checkIn } },
      { checkOut: { $gt: checkIn, $lte: checkOut } },
      { checkIn: { $lte: checkIn }, checkOut: { $gte: checkOut } }
    ]
  }).select('rooms.roomId');

  // Build query for available rooms
  const query = {
    hotelId,
    status: 'vacant',
    isActive: true
  };

  if (roomType) {
    query.type = roomType;
  }

  // Return a promise that resolves to the query with the occupied rooms excluded
  return conflictingBookingsPromise.then(conflictingBookings => {
    const occupiedRoomIds = conflictingBookings.flatMap(booking => 
      booking.rooms.map(room => room.roomId.toString())
    );
    
    query._id = { $nin: occupiedRoomIds };
    
    return this.find(query).sort({ roomNumber: 1 });
  });
};

export default mongoose.model('Room', roomSchema);