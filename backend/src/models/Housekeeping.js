import mongoose from 'mongoose';

const housekeepingSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hotel',
    required: true
  },
  roomId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Room',
    required: true
  },
  taskType: {
    type: String,
    enum: ['cleaning', 'maintenance', 'inspection', 'deep_clean', 'checkout_clean'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  assignedToUserId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  estimatedDuration: {
    type: Number, // minutes
    default: 30
  },
  startedAt: Date,
  completedAt: Date,
  actualDuration: Number, // minutes
  notes: String,
  supplies: [{
    name: String,
    quantity: Number,
    unit: String
  }],
  beforeImages: [String],
  afterImages: [String]
}, {
  timestamps: true
});

// Indexes
housekeepingSchema.index({ hotelId: 1, status: 1 });
housekeepingSchema.index({ roomId: 1, status: 1 });
housekeepingSchema.index({ assignedToUserId: 1, status: 1 });

// Calculate actual duration when completed
housekeepingSchema.pre('save', function(next) {
  if (this.isModified('completedAt') && this.startedAt && this.completedAt) {
    this.actualDuration = Math.round((this.completedAt - this.startedAt) / (1000 * 60));
  }
  next();
});

export default mongoose.model('Housekeeping', housekeepingSchema);