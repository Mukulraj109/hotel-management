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
  })
};