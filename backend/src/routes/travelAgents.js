import express from 'express';
import {
  registerTravelAgent,
  getAllTravelAgents,
  getTravelAgentById,
  updateTravelAgent,
  updateTravelAgentStatus,
  getTravelAgentPerformance,
  getMyTravelAgentProfile,
  getMyBookings,
  validateAgentCode
} from '../controllers/travelAgentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { catchAsync } from '../utils/catchAsync.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const registerTravelAgentSchema = Joi.object({
  userId: Joi.string().required(),
  agentCode: Joi.string().min(3).max(10).uppercase(),
  companyName: Joi.string().required().min(2).max(200),
  contactPerson: Joi.string().required().min(2).max(100),
  phone: Joi.string().required().pattern(/^\+?[\d\s-()]+$/),
  email: Joi.string().email().required(),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    zipCode: Joi.string()
  }),
  businessDetails: Joi.object({
    licenseNumber: Joi.string(),
    gstNumber: Joi.string(),
    establishedYear: Joi.number().min(1900).max(new Date().getFullYear()),
    businessType: Joi.string().valid('domestic', 'international', 'both')
  }),
  commissionStructure: Joi.object({
    defaultRate: Joi.number().min(0).max(50),
    roomTypeRates: Joi.array().items(Joi.object({
      roomTypeId: Joi.string(),
      commissionRate: Joi.number().min(0).max(50)
    })),
    seasonalRates: Joi.array().items(Joi.object({
      season: Joi.string().valid('peak', 'high', 'low', 'off'),
      commissionRate: Joi.number().min(0).max(50),
      validFrom: Joi.date(),
      validTo: Joi.date()
    }))
  }),
  bookingLimits: Joi.object({
    maxBookingsPerDay: Joi.number().min(1),
    maxRoomsPerBooking: Joi.number().min(1),
    maxAdvanceBookingDays: Joi.number().min(1)
  }),
  paymentTerms: Joi.object({
    creditLimit: Joi.number().min(0),
    paymentDueDays: Joi.number().min(1),
    preferredPaymentMethod: Joi.string().valid('bank_transfer', 'cheque', 'online', 'cash')
  }),
  hotelId: Joi.string()
});

const updateTravelAgentSchema = Joi.object({
  companyName: Joi.string().min(2).max(200),
  contactPerson: Joi.string().min(2).max(100),
  phone: Joi.string().pattern(/^\+?[\d\s-()]+$/),
  email: Joi.string().email(),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    zipCode: Joi.string()
  }),
  businessDetails: Joi.object({
    licenseNumber: Joi.string(),
    gstNumber: Joi.string(),
    establishedYear: Joi.number().min(1900).max(new Date().getFullYear()),
    businessType: Joi.string().valid('domestic', 'international', 'both')
  }),
  commissionStructure: Joi.object({
    defaultRate: Joi.number().min(0).max(50),
    roomTypeRates: Joi.array().items(Joi.object({
      roomTypeId: Joi.string(),
      commissionRate: Joi.number().min(0).max(50)
    })),
    seasonalRates: Joi.array().items(Joi.object({
      season: Joi.string().valid('peak', 'high', 'low', 'off'),
      commissionRate: Joi.number().min(0).max(50),
      validFrom: Joi.date(),
      validTo: Joi.date()
    }))
  }),
  bookingLimits: Joi.object({
    maxBookingsPerDay: Joi.number().min(1),
    maxRoomsPerBooking: Joi.number().min(1),
    maxAdvanceBookingDays: Joi.number().min(1)
  }),
  paymentTerms: Joi.object({
    creditLimit: Joi.number().min(0),
    paymentDueDays: Joi.number().min(1),
    preferredPaymentMethod: Joi.string().valid('bank_transfer', 'cheque', 'online', 'cash')
  }),
  notes: Joi.string().max(1000)
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'suspended', 'pending_approval').required(),
  reason: Joi.string().max(500)
});

// Apply authentication to all routes
router.use(authenticate);

// Public route for agent code validation (no auth required)
router.get('/validate-code/:code', validateAgentCode);

// Travel agent specific routes
router.get('/me', getMyTravelAgentProfile);
router.get('/me/bookings', getMyBookings);

// Admin/Staff routes for managing travel agents
router.post('/',
  authorize('admin', 'manager'),
  validate(registerTravelAgentSchema),
  registerTravelAgent
);

router.get('/',
  authorize('admin', 'manager', 'staff'),
  getAllTravelAgents
);

router.get('/:id',
  authorize('admin', 'manager', 'staff', 'travel_agent'),
  getTravelAgentById
);

router.put('/:id',
  authorize('admin', 'manager', 'travel_agent'),
  validate(updateTravelAgentSchema),
  updateTravelAgent
);

router.patch('/:id/status',
  authorize('admin', 'manager'),
  validate(updateStatusSchema),
  updateTravelAgentStatus
);

router.get('/:id/performance',
  authorize('admin', 'manager', 'staff', 'travel_agent'),
  getTravelAgentPerformance
);

export default router;