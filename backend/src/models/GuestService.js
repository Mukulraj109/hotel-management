import mongoose from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     GuestService:
 *       type: object
 *       required:
 *         - hotelId
 *         - userId
 *         - bookingId
 *         - serviceType
 *         - title
 *       properties:
 *         _id:
 *           type: string
 *         hotelId:
 *           type: string
 *           description: Hotel ID
 *         userId:
 *           type: string
 *           description: Guest user ID
 *         bookingId:
 *           type: string
 *           description: Associated booking ID
 *         serviceType:
 *           type: string
 *           enum: [room_service, housekeeping, maintenance, concierge, transport, spa, laundry, other]
 *           description: Type of service requested
 *         title:
 *           type: string
 *           description: Brief title of the request
 *         description:
 *           type: string
 *           description: Detailed description of the request
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           default: medium
 *         status:
 *           type: string
 *           enum: [pending, assigned, in_progress, completed, cancelled]
 *           default: pending
 *         assignedTo:
 *           type: string
 *           description: Staff member assigned to handle the request
 *         scheduledTime:
 *           type: string
 *           format: date-time
 *         completedTime:
 *           type: string
 *           format: date-time
 *         estimatedCost:
 *           type: number
 *           default: 0
 *         actualCost:
 *           type: number
 *           default: 0
 *         notes:
 *           type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const guestServiceSchema = new mongoose.Schema({
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
  bookingId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking ID is required']
  },
  serviceType: {
    type: String,
    enum: {
      values: ['room_service', 'housekeeping', 'maintenance', 'concierge', 'transport', 'spa', 'laundry', 'other'],
      message: 'Invalid service type'
    },
    required: [true, 'Service type is required']
  },
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Invalid priority level'
    },
    default: 'medium'
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
      message: 'Invalid status'
    },
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  scheduledTime: {
    type: Date
  },
  completedTime: {
    type: Date
  },
  estimatedCost: {
    type: Number,
    min: [0, 'Estimated cost cannot be negative'],
    default: 0
  },
  actualCost: {
    type: Number,
    min: [0, 'Actual cost cannot be negative'],
    default: 0
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  attachments: [{
    type: String,
    match: [/^https?:\/\//, 'Attachment URL must be valid']
  }],
  items: [{
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    price: {
      type: Number,
      min: 0,
      default: 0
    }
  }],
  specialInstructions: {
    type: String,
    maxlength: [300, 'Special instructions cannot be more than 300 characters']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    maxlength: [500, 'Feedback cannot be more than 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
guestServiceSchema.index({ hotelId: 1, status: 1 });
guestServiceSchema.index({ userId: 1, createdAt: -1 });
guestServiceSchema.index({ bookingId: 1 });
guestServiceSchema.index({ assignedTo: 1, status: 1 });
guestServiceSchema.index({ serviceType: 1, priority: 1 });

// Calculate total cost
guestServiceSchema.methods.calculateTotalCost = function() {
  const itemsTotal = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  return itemsTotal + (this.actualCost || this.estimatedCost);
};

// Update status with timestamp
guestServiceSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  
  if (newStatus === 'completed') {
    this.completedTime = new Date();
  } else if (newStatus === 'in_progress' && !this.scheduledTime) {
    this.scheduledTime = new Date();
  }
};

// Check if service can be cancelled
guestServiceSchema.methods.canCancel = function() {
  return ['pending', 'assigned'].includes(this.status);
};

// Static method to get service statistics
guestServiceSchema.statics.getServiceStats = async function(hotelId, startDate, endDate) {
  const matchQuery = { hotelId };
  
  if (startDate && endDate) {
    matchQuery.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const pipeline = [
    { $match: matchQuery },
    {
      $group: {
        _id: {
          serviceType: '$serviceType',
          status: '$status'
        },
        count: { $sum: 1 },
        avgCost: { $avg: '$actualCost' },
        totalRevenue: { $sum: '$actualCost' }
      }
    },
    {
      $group: {
        _id: '$_id.serviceType',
        stats: {
          $push: {
            status: '$_id.status',
            count: '$count',
            avgCost: '$avgCost',
            totalRevenue: '$totalRevenue'
          }
        },
        totalRequests: { $sum: '$count' }
      }
    }
  ];

  return await this.aggregate(pipeline);
};

export default mongoose.model('GuestService', guestServiceSchema);