import Joi from 'joi';
import { AppError } from '../utils/appError.js';

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(message, 400));
    }
    
    next();
  };
};

// Common validation schemas
export const schemas = {
  register: Joi.object({
    name: Joi.string().required().min(2).max(100),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/),
    role: Joi.string().valid('guest', 'staff', 'admin').default('guest')
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createRoom: Joi.object({
    hotelId: Joi.string().required(),
    roomNumber: Joi.string().required(),
    type: Joi.string().valid('single', 'double', 'suite', 'deluxe').required(),
    baseRate: Joi.number().min(0).required(),
    currentRate: Joi.number().min(0),
    floor: Joi.number().min(1),
    capacity: Joi.number().min(1).default(2),
    amenities: Joi.array().items(Joi.string()),
    images: Joi.array().items(Joi.string().uri()),
    description: Joi.string().max(500)
  }),

  createBooking: Joi.object({
    hotelId: Joi.string().required(),
    userId: Joi.string().optional(), // Allow admin to specify userId for manual bookings
    roomIds: Joi.array().items(Joi.string()).min(1).required(),
    checkIn: Joi.date().iso().custom((value, helpers) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(value) < today) {
        return helpers.error('date.min', { limit: 'today' });
      }
      return value;
    }).required(),
    checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required(),
    guestDetails: Joi.object({
      adults: Joi.number().min(1).required(),
      children: Joi.number().min(0).default(0),
      specialRequests: Joi.string().allow('')
    }),
    totalAmount: Joi.number().optional(), // Allow admin to specify total amount
    currency: Joi.string().optional(),
    paymentStatus: Joi.string().valid('pending', 'paid').optional(),
    status: Joi.string().valid('pending', 'confirmed', 'checked_in').optional(),
    idempotencyKey: Joi.string().required()
  }),

  createPaymentIntent: Joi.object({
    bookingId: Joi.string().required(),
    amount: Joi.number().min(1).required(),
    currency: Joi.string().length(3).uppercase().default('INR')
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/),
    preferences: Joi.object({
      bedType: Joi.string().valid('single', 'double', 'queen', 'king'),
      floor: Joi.string(),
      smokingAllowed: Joi.boolean(),
      other: Joi.string().max(500)
    })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  }),

  redeemPoints: Joi.object({
    offerId: Joi.string().required().messages({
      'string.empty': 'Offer ID is required',
      'any.required': 'Offer ID is required'
    })
  }),

  createServiceBooking: Joi.object({
    bookingDate: Joi.date().iso().greater('now').required().messages({
      'date.greater': 'Booking date must be in the future',
      'any.required': 'Booking date is required'
    }),
    numberOfPeople: Joi.number().integer().min(1).required().messages({
      'number.min': 'At least 1 person is required',
      'any.required': 'Number of people is required'
    }),
    specialRequests: Joi.string().max(500).optional().messages({
      'string.max': 'Special requests cannot exceed 500 characters'
    })
  }),

  cancelServiceBooking: Joi.object({
    reason: Joi.string().required().max(200).messages({
      'string.empty': 'Cancellation reason is required',
      'any.required': 'Cancellation reason is required',
      'string.max': 'Cancellation reason cannot exceed 200 characters'
    })
  }),

  // Notification validation schemas
  markNotificationsRead: Joi.object({
    notificationIds: Joi.array().items(Joi.string().required()).min(1).required().messages({
      'array.min': 'At least one notification ID is required',
      'any.required': 'Notification IDs are required'
    })
  }),

  updateNotificationPreferences: Joi.object({
    channel: Joi.string().valid('email', 'sms', 'push', 'inApp').required().messages({
      'any.only': 'Channel must be one of: email, sms, push, inApp',
      'any.required': 'Channel is required'
    }),
    settings: Joi.object({
      enabled: Joi.boolean(),
      address: Joi.string().email().allow(''),
      number: Joi.string().pattern(/^\+?[\d\s-()]+$/).allow(''),
      token: Joi.string().allow(''),
      frequency: Joi.string().valid('immediate', 'hourly', 'daily', 'weekly'),
      quietHours: Joi.object({
        enabled: Joi.boolean(),
        start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      }),
      sound: Joi.boolean(),
      vibration: Joi.boolean(),
      showBadge: Joi.boolean()
    }).required().messages({
      'any.required': 'Settings are required'
    })
  }),

  updateNotificationType: Joi.object({
    enabled: Joi.boolean().required().messages({
      'any.required': 'Enabled status is required'
    })
  }),

                sendTestNotification: Joi.object({
                channel: Joi.string().valid('email', 'sms', 'push', 'in_app').required().messages({
                  'any.only': 'Channel must be one of: email, sms, push, in_app',
                  'any.required': 'Channel is required'
                }),
                type: Joi.string().valid('booking_confirmation', 'booking_reminder', 'booking_cancellation', 'payment_success', 'payment_failed', 'loyalty_points', 'service_booking', 'service_reminder', 'promotional', 'system_alert', 'welcome', 'check_in', 'check_out', 'review_request', 'special_offer').optional()
              }),
              generateDigitalKey: Joi.object({
                bookingId: Joi.string().required().messages({
                  'string.empty': 'Booking ID is required',
                  'any.required': 'Booking ID is required'
                }),
                type: Joi.string().valid('primary', 'temporary', 'emergency').optional().messages({
                  'any.only': 'Type must be one of: primary, temporary, emergency'
                }),
                maxUses: Joi.number().integer().min(-1).optional().messages({
                  'number.min': 'Max uses cannot be less than -1'
                }),
                securitySettings: Joi.object({
                  requirePin: Joi.boolean().optional(),
                  pin: Joi.string().pattern(/^\d{4,6}$/).optional().messages({
                    'string.pattern.base': 'PIN must be 4-6 digits'
                  }),
                  allowSharing: Joi.boolean().optional(),
                  maxSharedUsers: Joi.number().integer().min(0).optional().messages({
                    'number.min': 'Max shared users cannot be negative'
                  }),
                  requireApproval: Joi.boolean().optional()
                }).optional()
              }),
              shareDigitalKey: Joi.object({
                email: Joi.string().email().required().messages({
                  'string.email': 'Please provide a valid email address',
                  'any.required': 'Email is required'
                }),
                name: Joi.string().required().max(100).messages({
                  'string.empty': 'Name is required',
                  'any.required': 'Name is required',
                  'string.max': 'Name cannot exceed 100 characters'
                }),
                expiresAt: Joi.date().iso().greater('now').optional().messages({
                  'date.greater': 'Expiration date must be in the future'
                })
              }),
              createMeetUpRequest: Joi.object({
                targetUserId: Joi.string().required().messages({
                  'string.empty': 'Target user ID is required',
                  'any.required': 'Target user ID is required'
                }),
                hotelId: Joi.string().required().messages({
                  'string.empty': 'Hotel ID is required',
                  'any.required': 'Hotel ID is required'
                }),
                type: Joi.string().valid('casual', 'business', 'social', 'networking', 'activity').required().messages({
                  'any.only': 'Type must be one of: casual, business, social, networking, activity',
                  'any.required': 'Type is required'
                }),
                title: Joi.string().required().max(100).messages({
                  'string.empty': 'Title is required',
                  'any.required': 'Title is required',
                  'string.max': 'Title cannot exceed 100 characters'
                }),
                description: Joi.string().required().max(500).messages({
                  'string.empty': 'Description is required',
                  'any.required': 'Description is required',
                  'string.max': 'Description cannot exceed 500 characters'
                }),
                proposedDate: Joi.date().iso().greater('now').required().messages({
                  'date.greater': 'Proposed date must be in the future',
                  'any.required': 'Proposed date is required'
                }),
                proposedTime: Joi.object({
                  start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
                    'string.pattern.base': 'Start time must be in HH:MM format',
                    'any.required': 'Start time is required'
                  }),
                  end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
                    'string.pattern.base': 'End time must be in HH:MM format',
                    'any.required': 'End time is required'
                  })
                }).required().messages({
                  'any.required': 'Proposed time is required'
                }),
                location: Joi.object({
                  type: Joi.string().valid('hotel_lobby', 'restaurant', 'bar', 'meeting_room', 'outdoor', 'other').required().messages({
                    'any.only': 'Location type must be one of: hotel_lobby, restaurant, bar, meeting_room, outdoor, other',
                    'any.required': 'Location type is required'
                  }),
                  name: Joi.string().required().max(100).messages({
                    'string.empty': 'Location name is required',
                    'any.required': 'Location name is required',
                    'string.max': 'Location name cannot exceed 100 characters'
                  }),
                  details: Joi.string().max(200).optional().messages({
                    'string.max': 'Location details cannot exceed 200 characters'
                  })
                }).required().messages({
                  'any.required': 'Location is required'
                }),
                meetingRoomBooking: Joi.object({
                  roomId: Joi.string().optional(),
                  isRequired: Joi.boolean().default(false)
                }).optional(),
                participants: Joi.object({
                  maxParticipants: Joi.number().integer().min(2).max(20).default(2).messages({
                    'number.min': 'Minimum 2 participants required',
                    'number.max': 'Maximum 20 participants allowed'
                  })
                }).optional(),
                preferences: Joi.object({
                  interests: Joi.array().items(Joi.string().max(50)).optional().messages({
                    'string.max': 'Interest cannot exceed 50 characters'
                  }),
                  languages: Joi.array().items(Joi.string().max(20)).optional().messages({
                    'string.max': 'Language cannot exceed 20 characters'
                  }),
                  ageGroup: Joi.string().valid('18-25', '26-35', '36-45', '46-55', '55+', 'any').optional(),
                  gender: Joi.string().valid('male', 'female', 'any').optional()
                }).optional(),
                communication: Joi.object({
                  preferredMethod: Joi.string().valid('in_app', 'email', 'phone', 'whatsapp').default('in_app'),
                  contactInfo: Joi.object({
                    email: Joi.string().email().optional(),
                    phone: Joi.string().optional(),
                    whatsapp: Joi.string().optional()
                  }).optional()
                }).optional(),
                activity: Joi.object({
                  type: Joi.string().valid('coffee', 'lunch', 'dinner', 'drinks', 'walk', 'tour', 'game', 'other').optional(),
                  duration: Joi.number().integer().min(30).max(480).default(60).messages({
                    'number.min': 'Minimum duration is 30 minutes',
                    'number.max': 'Maximum duration is 8 hours'
                  }),
                  cost: Joi.number().min(0).default(0).messages({
                    'number.min': 'Cost cannot be negative'
                  }),
                  costSharing: Joi.boolean().default(false)
                }).optional(),
                safety: Joi.object({
                  verifiedOnly: Joi.boolean().default(false),
                  publicLocation: Joi.boolean().default(true),
                  hotelStaffPresent: Joi.boolean().default(false)
                }).optional(),
                metadata: Joi.object({
                  tags: Joi.array().items(Joi.string()).optional(),
                  category: Joi.string().valid('business', 'leisure', 'cultural', 'sports', 'food', 'entertainment').optional(),
                  difficulty: Joi.string().valid('easy', 'moderate', 'challenging').default('easy')
                }).optional()
              }),
              respondToMeetUpRequest: Joi.object({
                message: Joi.string().max(300).optional().messages({
                  'string.max': 'Response message cannot exceed 300 characters'
                })
              }),
              addParticipant: Joi.object({
                userId: Joi.string().required().messages({
                  'string.empty': 'User ID is required',
                  'any.required': 'User ID is required'
                }),
                name: Joi.string().required().messages({
                  'string.empty': 'Name is required',
                  'any.required': 'Name is required'
                }),
                email: Joi.string().email().required().messages({
                  'string.email': 'Please provide a valid email address',
                  'any.required': 'Email is required'
                })
              }),
              suggestAlternative: Joi.object({
                date: Joi.date().iso().greater('now').required().messages({
                  'date.greater': 'Alternative date must be in the future',
                  'any.required': 'Alternative date is required'
                }),
                time: Joi.object({
                  start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
                    'string.pattern.base': 'Start time must be in HH:MM format',
                    'any.required': 'Start time is required'
                  }),
                  end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
                    'string.pattern.base': 'End time must be in HH:MM format',
                    'any.required': 'End time is required'
                  })
                }).required().messages({
                  'any.required': 'Alternative time is required'
                })
              })
            };