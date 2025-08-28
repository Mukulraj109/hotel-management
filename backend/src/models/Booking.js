import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       required:
 *         - hotelId
 *         - userId
 *         - rooms
 *         - checkIn
 *         - checkOut
 *       properties:
 *         _id:
 *           type: string
 *         hotelId:
 *           type: string
 *           description: Hotel ID
 *         userId:
 *           type: string
 *           description: Guest user ID
 *         rooms:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               roomId:
 *                 type: string
 *               rate:
 *                 type: number
 *         checkIn:
 *           type: string
 *           format: date
 *         checkOut:
 *           type: string
 *           format: date
 *         nights:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, confirmed, checked_in, checked_out, cancelled, no_show]
 *           default: pending
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, refunded, failed]
 *           default: pending
 *         totalAmount:
 *           type: number
 *         currency:
 *           type: string
 *           default: USD
 *         stripePaymentId:
 *           type: string
 *         idempotencyKey:
 *           type: string
 *         reservedUntil:
 *           type: string
 *           format: date-time
 *         guestDetails:
 *           type: object
 *           properties:
 *             adults:
 *               type: number
 *             children:
 *               type: number
 *             specialRequests:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const bookingSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hotel',
    required: [true, 'Hotel ID is required']
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  bookingNumber: {
    type: String,
    unique: true
  },
  rooms: [{
    roomId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Room',
      required: true
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  checkIn: {
    type: Date,
    required: [true, 'Check-in date is required']
  },
  checkOut: {
    type: Date,
    required: [true, 'Check-out date is required'],
    validate: {
      validator: function(value) {
        return value > this.checkIn;
      },
      message: 'Check-out date must be after check-in date'
    }
  },
  nights: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
      message: 'Invalid booking status'
    },
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'refunded', 'failed'],
      message: 'Invalid payment status'
    },
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  stripePaymentId: String,
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  },
  reservedUntil: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }
  },
  guestDetails: {
    adults: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    children: {
      type: Number,
      default: 0,
      min: 0
    },
    specialRequests: String
  },
  extras: [{
    name: String,
    price: Number,
    quantity: {
      type: Number,
      default: 1
    }
  }],
  cancellationReason: String,
  cancellationPolicy: {
    type: String,
    default: 'standard'
  },
  checkInTime: Date,
  checkOutTime: Date,
  source: {
    type: String,
    enum: ['direct', 'booking_com', 'expedia', 'airbnb'],
    default: 'direct'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
bookingSchema.index({ hotelId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ status: 1, paymentStatus: 1 });
// idempotencyKey already has unique and sparse constraints in schema
// bookingNumber already has unique constraint in schema
bookingSchema.index({ reservedUntil: 1 }, { expireAfterSeconds: 0 });

// Calculate nights before saving
bookingSchema.pre('save', function(next) {
  if (this.isModified('checkIn') || this.isModified('checkOut')) {
    const timeDiff = this.checkOut.getTime() - this.checkIn.getTime();
    this.nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
  
  // Generate booking number if not exists
  if (!this.bookingNumber) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.bookingNumber = `BK${date}${random}`;
  }
  
  next();
});

// Virtual for room details
bookingSchema.virtual('roomDetails', {
  ref: 'Room',
  localField: 'rooms.roomId',
  foreignField: '_id'
});

// Instance method to calculate total amount
bookingSchema.methods.calculateTotalAmount = function() {
  const roomsTotal = this.rooms.reduce((total, room) => total + room.rate, 0) * this.nights;
  const extrasTotal = this.extras.reduce((total, extra) => total + (extra.price * extra.quantity), 0);
  return roomsTotal + extrasTotal;
};

// Static method to find overlapping bookings
bookingSchema.statics.findOverlapping = async function(roomIds, checkIn, checkOut, excludeBookingId = null) {
  const query = {
    'rooms.roomId': { $in: roomIds },
    status: { $in: ['confirmed', 'checked_in'] },
    $or: [
      { checkIn: { $lt: checkOut, $gte: checkIn } },
      { checkOut: { $gt: checkIn, $lte: checkOut } },
      { checkIn: { $lte: checkIn }, checkOut: { $gte: checkOut } }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return await this.find(query);
};

// Instance method to check if booking can be cancelled
bookingSchema.methods.canCancel = function() {
  const now = new Date();
  const checkInTime = new Date(this.checkIn);
  const hoursUntilCheckIn = (checkInTime - now) / (1000 * 60 * 60);
  
  // Can cancel if more than 24 hours before check-in and not already checked in
  return hoursUntilCheckIn > 24 && !['checked_in', 'checked_out', 'cancelled'].includes(this.status);
};

export default mongoose.model('Booking', bookingSchema);