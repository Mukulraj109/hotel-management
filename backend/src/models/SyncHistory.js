import mongoose from 'mongoose';

const syncHistorySchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hotel',
    required: true
  },
  provider: {
    type: String,
    required: true,
    enum: ['booking_com', 'expedia', 'airbnb']
  },
  type: {
    type: String,
    required: true,
    enum: ['availability_sync', 'booking_sync', 'rate_sync', 'inventory_sync']
  },
  status: {
    type: String,
    required: true,
    enum: ['in_progress', 'completed', 'failed']
  },
  syncId: {
    type: String,
    required: true,
    unique: true
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  roomsUpdated: {
    type: Number,
    default: 0
  },
  bookingsReceived: {
    type: Number,
    default: 0
  },
  errors: [{
    message: String,
    code: String,
    timestamp: Date
  }],
  metadata: {
    duration: Number, // in milliseconds
    recordsProcessed: Number,
    apiCalls: Number,
    dataSize: Number
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
syncHistorySchema.index({ hotelId: 1, startedAt: -1 });
syncHistorySchema.index({ provider: 1, status: 1 });
syncHistorySchema.index({ syncId: 1 });

export default mongoose.model('SyncHistory', syncHistorySchema);