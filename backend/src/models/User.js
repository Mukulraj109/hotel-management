import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           description: User ID
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         phone:
 *           type: string
 *           description: User's phone number
 *         role:
 *           type: string
 *           enum: [guest, staff, admin]
 *           default: guest
 *           description: User role
 *         preferences:
 *           type: object
 *           properties:
 *             bedType:
 *               type: string
 *             floor:
 *               type: string
 *             smokingAllowed:
 *               type: boolean
 *         loyalty:
 *           type: object
 *           properties:
 *             points:
 *               type: number
 *               default: 0
 *             tier:
 *               type: string
 *               default: 'bronze'
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

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['guest', 'staff', 'admin'],
    default: 'guest'
  },
  guestType: {
    type: String,
    enum: ['normal', 'corporate'],
    default: 'normal'
  },
  corporateDetails: {
    corporateCompanyId: {
      type: mongoose.Schema.ObjectId,
      ref: 'CorporateCompany'
    },
    employeeId: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true
    },
    designation: {
      type: String,
      trim: true
    },
    costCenter: {
      type: String,
      trim: true
    },
    approvalRequired: {
      type: Boolean,
      default: false
    },
    approverEmail: {
      type: String,
      lowercase: true
    }
  },
  hotelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hotel',
    required: function() {
      return this.role === 'staff' || this.role === 'admin';
    }
  },
  preferences: {
    bedType: {
      type: String,
      enum: ['single', 'double', 'queen', 'king']
    },
    floor: String,
    smokingAllowed: {
      type: Boolean,
      default: false
    },
    other: String
  },
  loyalty: {
    points: {
      type: Number,
      default: 0
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    }
  },
  billingHistory: [{
    type: {
      type: String,
      enum: ['checkout_charges', 'booking_payment', 'service_charge', 'refund'],
      required: true
    },
    bookingId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Booking'
    },
    roomId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Room'
    },
    description: {
      type: String,
      required: true
    },
    items: [{
      name: String,
      category: String,
      status: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
      notes: String
    }],
    subtotal: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank_transfer']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    paidAt: Date,
    checkoutInventoryId: {
      type: mongoose.Schema.ObjectId,
      ref: 'CheckoutInventory'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes - email has unique constraint in schema, only need compound index
userSchema.index({ hotelId: 1, role: 1 });

// Virtual for bookings
userSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'userId'
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update loyalty tier based on points
userSchema.methods.updateLoyaltyTier = function() {
  const points = this.loyalty.points;
  
  if (points >= 10000) this.loyalty.tier = 'platinum';
  else if (points >= 5000) this.loyalty.tier = 'gold';
  else if (points >= 1000) this.loyalty.tier = 'silver';
  else this.loyalty.tier = 'bronze';
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

export default mongoose.model('User', userSchema);