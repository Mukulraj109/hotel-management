import mongoose from 'mongoose';

const meetUpRequestSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Requester ID is required'],
    index: true
  },
  targetUserId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Target user ID is required'],
    index: true
  },
  hotelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hotel',
    required: [true, 'Hotel ID is required'],
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled', 'completed'],
    default: 'pending',
    index: true
  },
  type: {
    type: String,
    enum: ['casual', 'business', 'social', 'networking', 'activity'],
    required: [true, 'Meet-up type is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  proposedDate: {
    type: Date,
    required: [true, 'Proposed date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Proposed date must be in the future'
    }
  },
  proposedTime: {
    start: {
      type: String,
      required: [true, 'Start time is required'],
      validate: {
        validator: function(value) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'Start time must be in HH:MM format'
      }
    },
    end: {
      type: String,
      required: [true, 'End time is required'],
      validate: {
        validator: function(value) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'End time must be in HH:MM format'
      }
    }
  },
  location: {
    type: {
      type: String,
      enum: ['hotel_lobby', 'restaurant', 'bar', 'meeting_room', 'outdoor', 'other'],
      required: [true, 'Location type is required']
    },
    name: {
      type: String,
      required: [true, 'Location name is required'],
      maxlength: [100, 'Location name cannot exceed 100 characters']
    },
    details: {
      type: String,
      maxlength: [200, 'Location details cannot exceed 200 characters']
    }
  },
  meetingRoomBooking: {
    roomId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Room'
    },
    bookingId: {
      type: mongoose.Schema.ObjectId,
      ref: 'ServiceBooking'
    },
    isRequired: {
      type: Boolean,
      default: false
    }
  },
  participants: {
    maxParticipants: {
      type: Number,
      min: [2, 'Minimum 2 participants required'],
      max: [20, 'Maximum 20 participants allowed'],
      default: 2
    },
    confirmedParticipants: [{
      userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      confirmedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  preferences: {
    interests: [{
      type: String,
      maxlength: [50, 'Interest cannot exceed 50 characters']
    }],
    languages: [{
      type: String,
      maxlength: [20, 'Language cannot exceed 20 characters']
    }],
    ageGroup: {
      type: String,
      enum: ['18-25', '26-35', '36-45', '46-55', '55+', 'any']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'any']
    }
  },
  communication: {
    preferredMethod: {
      type: String,
      enum: ['in_app', 'email', 'phone', 'whatsapp'],
      default: 'in_app'
    },
    contactInfo: {
      email: String,
      phone: String,
      whatsapp: String
    }
  },
  response: {
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    },
    message: {
      type: String,
      maxlength: [300, 'Response message cannot exceed 300 characters']
    },
    respondedAt: Date,
    alternativeDate: Date,
    alternativeTime: {
      start: String,
      end: String
    }
  },
  activity: {
    type: {
      type: String,
      enum: ['coffee', 'lunch', 'dinner', 'drinks', 'walk', 'tour', 'game', 'other'],
      required: function() {
        return this.type === 'activity';
      }
    },
    duration: {
      type: Number,
      min: [30, 'Minimum duration is 30 minutes'],
      max: [480, 'Maximum duration is 8 hours'],
      default: 60
    },
    cost: {
      type: Number,
      min: [0, 'Cost cannot be negative'],
      default: 0
    },
    costSharing: {
      type: Boolean,
      default: false
    }
  },
  safety: {
    verifiedOnly: {
      type: Boolean,
      default: false
    },
    publicLocation: {
      type: Boolean,
      default: true
    },
    hotelStaffPresent: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    tags: [String],
    category: {
      type: String,
      enum: ['business', 'leisure', 'cultural', 'sports', 'food', 'entertainment']
    },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'challenging'],
      default: 'easy'
    }
  },
  notifications: {
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderSentAt: Date,
    followUpSent: {
      type: Boolean,
      default: false
    },
    followUpSentAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
meetUpRequestSchema.index({ requesterId: 1, status: 1 });
meetUpRequestSchema.index({ targetUserId: 1, status: 1 });
meetUpRequestSchema.index({ hotelId: 1, status: 1 });
meetUpRequestSchema.index({ proposedDate: 1, status: 1 });
meetUpRequestSchema.index({ type: 1, status: 1 });
meetUpRequestSchema.index({ 'location.type': 1 });
meetUpRequestSchema.index({ createdAt: -1 });

// Virtuals
meetUpRequestSchema.virtual('isUpcoming').get(function() {
  return this.proposedDate > new Date() && this.status === 'accepted';
});

meetUpRequestSchema.virtual('isPast').get(function() {
  return this.proposedDate < new Date();
});

meetUpRequestSchema.virtual('canBeCancelled').get(function() {
  return this.status === 'accepted' && this.proposedDate > new Date();
});

meetUpRequestSchema.virtual('canBeRescheduled').get(function() {
  return this.status === 'accepted' && this.proposedDate > new Date();
});

meetUpRequestSchema.virtual('participantCount').get(function() {
  return this.participants.confirmedParticipants.length;
});

meetUpRequestSchema.virtual('hasAvailableSpots').get(function() {
  return this.participants.confirmedParticipants.length < this.participants.maxParticipants;
});

// Static methods
meetUpRequestSchema.statics.getUpcomingMeetUps = function(userId) {
  return this.find({
    $or: [
      { requesterId: userId },
      { targetUserId: userId },
      { 'participants.confirmedParticipants.userId': userId }
    ],
    status: 'accepted',
    proposedDate: { $gt: new Date() }
  })
  .populate('requesterId', 'name email avatar')
  .populate('targetUserId', 'name email avatar')
  .populate('hotelId', 'name address')
  .populate('meetingRoomBooking.roomId', 'number type')
  .sort({ proposedDate: 1 });
};

meetUpRequestSchema.statics.getPendingRequests = function(userId) {
  return this.find({
    targetUserId: userId,
    status: 'pending'
  })
  .populate('requesterId', 'name email avatar')
  .populate('hotelId', 'name address')
  .sort({ createdAt: -1 });
};

meetUpRequestSchema.statics.getSentRequests = function(userId) {
  return this.find({
    requesterId: userId
  })
  .populate('targetUserId', 'name email avatar')
  .populate('hotelId', 'name address')
  .sort({ createdAt: -1 });
};

meetUpRequestSchema.statics.getMeetUpStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { requesterId: new mongoose.Types.ObjectId(userId) },
          { targetUserId: new mongoose.Types.ObjectId(userId) }
        ]
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance methods
meetUpRequestSchema.methods.acceptRequest = function(message = '') {
  this.status = 'accepted';
  this.response = {
    status: 'accepted',
    message,
    respondedAt: new Date()
  };
  return this.save();
};

meetUpRequestSchema.methods.declineRequest = function(message = '') {
  this.status = 'declined';
  this.response = {
    status: 'declined',
    message,
    respondedAt: new Date()
  };
  return this.save();
};

meetUpRequestSchema.methods.cancelRequest = function() {
  this.status = 'cancelled';
  return this.save();
};

meetUpRequestSchema.methods.completeRequest = function() {
  this.status = 'completed';
  return this.save();
};

meetUpRequestSchema.methods.addParticipant = function(userId, name, email) {
  const existingParticipant = this.participants.confirmedParticipants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (!existingParticipant && this.hasAvailableSpots) {
    this.participants.confirmedParticipants.push({
      userId,
      name,
      email,
      confirmedAt: new Date()
    });
    return this.save();
  }
  
  throw new Error('Participant already exists or no available spots');
};

meetUpRequestSchema.methods.removeParticipant = function(userId) {
  const index = this.participants.confirmedParticipants.findIndex(
    p => p.userId.toString() === userId.toString()
  );
  
  if (index !== -1) {
    this.participants.confirmedParticipants.splice(index, 1);
    return this.save();
  }
  
  throw new Error('Participant not found');
};

meetUpRequestSchema.methods.suggestAlternative = function(date, time) {
  this.response.alternativeDate = date;
  this.response.alternativeTime = time;
  return this.save();
};

// Pre-save middleware
meetUpRequestSchema.pre('save', function(next) {
  // Validate time format
  if (this.proposedTime.start >= this.proposedTime.end) {
    return next(new Error('End time must be after start time'));
  }
  
  // Auto-complete past meet-ups
  if (this.isPast && this.status === 'accepted') {
    this.status = 'completed';
  }
  
  next();
});

export default mongoose.model('MeetUpRequest', meetUpRequestSchema);
