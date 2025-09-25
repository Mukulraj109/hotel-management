import mongoose from 'mongoose';
import NotificationAutomationService from '../services/notificationAutomationService.js';

const maintenanceRequestSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  floorId: {
    type: Number,
    required: false
  },
  issueType: {
    type: String,
    enum: ['plumbing', 'electrical', 'hvac', 'furniture', 'appliance', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  description: {
    type: String,
    required: true
  },
  estimatedCost: {
    type: Number,
    default: null
  },
  actualCost: {
    type: Number,
    default: null
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  completedDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  images: [{
    type: String, // URLs to images
    default: []
  }],
  notes: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
maintenanceRequestSchema.index({ hotelId: 1, status: 1 });
maintenanceRequestSchema.index({ roomId: 1, status: 1 });
maintenanceRequestSchema.index({ issueType: 1, priority: 1 });
maintenanceRequestSchema.index({ vendorId: 1, status: 1 });
maintenanceRequestSchema.index({ floorId: 1, status: 1 });

// NOTIFICATION AUTOMATION HOOKS
maintenanceRequestSchema.post('save', async function(doc) {
  try {
    // Get room data for notifications
    const room = await mongoose.model('Room').findById(doc.roomId).select('roomNumber');
    const roomNumber = room ? room.roomNumber : 'Unknown';

    // 1. New maintenance request created
    if (this.isNew) {
      const notificationType = doc.priority === 'urgent' ? 'maintenance_urgent' : 'maintenance_request_created';
      const priority = doc.priority === 'urgent' ? 'urgent' : 'medium';

      await NotificationAutomationService.triggerNotification(
        notificationType,
        {
          roomNumber,
          issueType: doc.issueType,
          description: doc.description,
          priority: doc.priority,
          requestId: doc._id,
          createdBy: doc.createdBy,
          estimatedCost: doc.estimatedCost
        },
        'auto',
        priority,
        doc.hotelId
      );
    }

    // 2. Maintenance assigned to staff
    if (doc.isModified('assignedTo') && doc.assignedTo) {
      await NotificationAutomationService.triggerNotification(
        'maintenance_assigned',
        {
          roomNumber,
          issueType: doc.issueType,
          description: doc.description,
          requestId: doc._id,
          assignedTo: doc.assignedTo,
          priority: doc.priority,
          scheduledDate: doc.scheduledDate
        },
        [doc.assignedTo],
        doc.priority === 'urgent' ? 'urgent' : 'medium',
        doc.hotelId
      );
    }

    // 3. Maintenance status changed to in_progress
    if (doc.isModified('status') && doc.status === 'in_progress') {
      await NotificationAutomationService.triggerNotification(
        'maintenance_started',
        {
          roomNumber,
          issueType: doc.issueType,
          description: doc.description,
          requestId: doc._id,
          assignedTo: doc.assignedTo
        },
        'auto',
        'low',
        doc.hotelId
      );
    }

    // 4. Maintenance completed
    if (doc.isModified('status') && doc.status === 'completed') {
      await NotificationAutomationService.triggerNotification(
        'maintenance_completed',
        {
          roomNumber,
          issueType: doc.issueType,
          description: doc.description,
          requestId: doc._id,
          completedDate: doc.completedDate,
          actualCost: doc.actualCost,
          createdBy: doc.createdBy,
          assignedTo: doc.assignedTo
        },
        'auto',
        'medium',
        doc.hotelId
      );
    }

    // 5. High-cost maintenance alert
    if (doc.isModified('actualCost') && doc.actualCost && doc.actualCost >= 500) {
      await NotificationAutomationService.triggerNotification(
        'maintenance_high_cost',
        {
          roomNumber,
          issueType: doc.issueType,
          cost: doc.actualCost,
          requestId: doc._id,
          description: doc.description
        },
        'auto',
        'high',
        doc.hotelId
      );
    }

  } catch (error) {
    console.error('Error in MaintenanceRequest notification hook:', error);
  }
});

export default mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
