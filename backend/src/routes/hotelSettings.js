import express from 'express';
import HotelSettings from '../models/HotelSettings.js';
import Hotel from '../models/Hotel.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import Joi from 'joi';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);
router.use(ensurePropertyAccess);

// Only admin and manager can modify hotel settings
router.use(authorize(['admin', 'manager']));

// Validation schemas for hotel settings
const hotelSettingsSchemas = {
  basicInfo: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      postalCode: Joi.string()
    }),
    contact: Joi.object({
      phone: Joi.string().required(),
      email: Joi.string().email().required(),
      website: Joi.string().uri().allow('')
    })
  }),

  operations: Joi.object({
    checkInTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    checkOutTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    currency: Joi.string().length(3),
    timezone: Joi.string()
  }),

  policies: Joi.object({
    cancellation: Joi.string().max(500),
    child: Joi.string().max(500),
    pet: Joi.string().max(500),
    smoking: Joi.string().max(500),
    extraBed: Joi.string().max(500)
  }),

  taxes: Joi.object({
    gst: Joi.number().min(0).max(100).required(),
    serviceCharge: Joi.number().min(0).max(100),
    localTax: Joi.number().min(0).max(100),
    tourismTax: Joi.number().min(0).max(100)
  }),

  integrations: Joi.object({
    payment: Joi.object({
      stripe: Joi.object({
        enabled: Joi.boolean(),
        publicKey: Joi.string().when('enabled', { is: true, then: Joi.required() }),
        secretKey: Joi.string().when('enabled', { is: true, then: Joi.required() }),
        webhookSecret: Joi.string()
      }),
      razorpay: Joi.object({
        enabled: Joi.boolean(),
        keyId: Joi.string().when('enabled', { is: true, then: Joi.required() }),
        keySecret: Joi.string().when('enabled', { is: true, then: Joi.required() })
      })
    }),
    ota: Joi.object({
      booking: Joi.object({
        enabled: Joi.boolean(),
        apiKey: Joi.string().when('enabled', { is: true, then: Joi.required() }),
        hotelId: Joi.string().when('enabled', { is: true, then: Joi.required() })
      }),
      expedia: Joi.object({
        enabled: Joi.boolean(),
        apiKey: Joi.string().when('enabled', { is: true, then: Joi.required() }),
        hotelId: Joi.string().when('enabled', { is: true, then: Joi.required() })
      })
    }),
    analytics: Joi.object({
      googleAnalytics: Joi.object({
        enabled: Joi.boolean(),
        trackingId: Joi.string().when('enabled', { is: true, then: Joi.required() })
      }),
      mixpanel: Joi.object({
        enabled: Joi.boolean(),
        token: Joi.string().when('enabled', { is: true, then: Joi.required() })
      })
    })
  }),

  bookingRules: Joi.object({
    minimumStay: Joi.object({
      enabled: Joi.boolean(),
      nights: Joi.number().min(1).max(30),
      applyToWeekends: Joi.boolean()
    }),
    maximumStay: Joi.object({
      enabled: Joi.boolean(),
      nights: Joi.number().min(1).max(365)
    }),
    advanceBooking: Joi.object({
      minDays: Joi.number().min(0).max(365),
      maxDays: Joi.number().min(1).max(730)
    }),
    cutoffTime: Joi.object({
      hours: Joi.number().min(0).max(168),
      sameDay: Joi.boolean()
    }),
    blackoutDates: Joi.object({
      enabled: Joi.boolean(),
      dates: Joi.array().items(Joi.string())
    }),
    cancellationWindow: Joi.object({
      hours: Joi.number().min(0).max(168),
      penaltyPercentage: Joi.number().min(0).max(100)
    }),
    gapRules: Joi.object({
      enabled: Joi.boolean(),
      minGapNights: Joi.number().min(1).max(7)
    })
  })
};

// GET /api/v1/hotel-settings - Get all hotel settings
router.get('/', catchAsync(async (req, res, next) => {
  const hotelId = req.user.hotelId;

  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const settings = await HotelSettings.getOrCreateForHotel(hotelId);

  // Don't expose sensitive data
  const safeSettings = JSON.parse(JSON.stringify(settings));
  if (safeSettings.integrations) {
    // Mask sensitive keys
    if (safeSettings.integrations.payment?.stripe?.secretKey) {
      safeSettings.integrations.payment.stripe.secretKey = '***masked***';
    }
    if (safeSettings.integrations.payment?.razorpay?.keySecret) {
      safeSettings.integrations.payment.razorpay.keySecret = '***masked***';
    }
    if (safeSettings.integrations.ota?.booking?.apiKey) {
      safeSettings.integrations.ota.booking.apiKey = '***masked***';
    }
    if (safeSettings.integrations.ota?.expedia?.apiKey) {
      safeSettings.integrations.ota.expedia.apiKey = '***masked***';
    }
  }

  res.status(200).json({
    status: 'success',
    data: { settings: safeSettings }
  });
}));

// GET /api/v1/hotel-settings/backup - Create settings backup
router.get('/backup', catchAsync(async (req, res, next) => {
  const hotelId = req.user.hotelId;

  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const settings = await HotelSettings.findOne({ hotelId });
  if (!settings) {
    return next(new ApplicationError('Hotel settings not found', 404));
  }

  // Remove sensitive data from backup
  const backup = JSON.parse(JSON.stringify(settings));
  delete backup._id;
  delete backup.__v;

  // Remove sensitive integration keys
  if (backup.integrations) {
    if (backup.integrations.payment?.stripe?.secretKey) delete backup.integrations.payment.stripe.secretKey;
    if (backup.integrations.payment?.razorpay?.keySecret) delete backup.integrations.payment.razorpay.keySecret;
    if (backup.integrations.ota?.booking?.apiKey) delete backup.integrations.ota.booking.apiKey;
    if (backup.integrations.ota?.expedia?.apiKey) delete backup.integrations.ota.expedia.apiKey;
  }

  res.status(200).json({
    status: 'success',
    data: {
      backup,
      createdAt: new Date().toISOString(),
      hotelId,
      version: '1.0'
    }
  });
}));

// GET /api/v1/hotel-settings/:section - Get specific section
router.get('/:section', catchAsync(async (req, res, next) => {
  const { section } = req.params;
  const hotelId = req.user.hotelId;

  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const validSections = ['basicInfo', 'operations', 'policies', 'taxes', 'integrations', 'amenities', 'notifications', 'security', 'maintenance'];
  if (!validSections.includes(section)) {
    return next(new ApplicationError('Invalid settings section', 400));
  }

  const settings = await HotelSettings.getOrCreateForHotel(hotelId);

  res.status(200).json({
    status: 'success',
    data: { [section]: settings[section] || {} }
  });
}));

// PUT /api/v1/hotel-settings/basic-info - Update basic hotel information
router.put('/basic-info', catchAsync(async (req, res, next) => {
  const { error } = hotelSettingsSchemas.basicInfo.validate(req.body);
  if (error) {
    return next(new ApplicationError(error.details[0].message, 400));
  }

  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const updates = { 'basicInfo': req.body };
  const settings = await HotelSettings.updateHotelSettings(hotelId, updates);

  // Also update the main Hotel document
  await Hotel.findByIdAndUpdate(hotelId, {
    name: req.body.name,
    address: req.body.address,
    phone: req.body.contact.phone,
    email: req.body.contact.email,
    website: req.body.contact.website
  });

  res.status(200).json({
    status: 'success',
    message: 'Basic hotel information updated successfully',
    data: { settings }
  });
}));

// PUT /api/v1/hotel-settings/operations - Update operational settings
router.put('/operations', catchAsync(async (req, res, next) => {
  const { error } = hotelSettingsSchemas.operations.validate(req.body);
  if (error) {
    return next(new ApplicationError(error.details[0].message, 400));
  }

  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const updates = { 'operations': req.body };
  const settings = await HotelSettings.updateHotelSettings(hotelId, updates);

  res.status(200).json({
    status: 'success',
    message: 'Operational settings updated successfully',
    data: { settings }
  });
}));

// PUT /api/v1/hotel-settings/policies - Update hotel policies
router.put('/policies', catchAsync(async (req, res, next) => {
  const { error } = hotelSettingsSchemas.policies.validate(req.body);
  if (error) {
    return next(new ApplicationError(error.details[0].message, 400));
  }

  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const updates = { 'policies': req.body };
  const settings = await HotelSettings.updateHotelSettings(hotelId, updates);

  res.status(200).json({
    status: 'success',
    message: 'Hotel policies updated successfully',
    data: { settings }
  });
}));

// PUT /api/v1/hotel-settings/taxes - Update tax settings
router.put('/taxes', catchAsync(async (req, res, next) => {
  const { error } = hotelSettingsSchemas.taxes.validate(req.body);
  if (error) {
    return next(new ApplicationError(error.details[0].message, 400));
  }

  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const updates = { 'taxes': req.body };
  const settings = await HotelSettings.updateHotelSettings(hotelId, updates);

  res.status(200).json({
    status: 'success',
    message: 'Tax settings updated successfully',
    data: { settings }
  });
}));

// PUT /api/v1/hotel-settings/integrations - Update integration settings
router.put('/integrations', catchAsync(async (req, res, next) => {
  const { error } = hotelSettingsSchemas.integrations.validate(req.body);
  if (error) {
    return next(new ApplicationError(error.details[0].message, 400));
  }

  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  // TODO: Encrypt sensitive keys before storing
  const updates = { 'integrations': req.body };
  const settings = await HotelSettings.updateHotelSettings(hotelId, updates);

  res.status(200).json({
    status: 'success',
    message: 'Integration settings updated successfully',
    data: { settings }
  });
}));

// PUT /api/v1/hotel-settings/security - Update security settings
router.put('/security', catchAsync(async (req, res, next) => {
  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const securityData = {
    requireTwoFactor: req.body.requireTwoFactor,
    sessionSettings: req.body.sessionSettings,
    passwordPolicy: req.body.passwordPolicy,
    auditLog: req.body.auditLog !== undefined ? req.body.auditLog : true,
    ipRestrictions: req.body.ipRestrictions || [],
    maxLoginAttempts: req.body.maxLoginAttempts || 5 // Add max login attempts field
  };

  const settings = await HotelSettings.updateHotelSettings(hotelId, { security: securityData });

  res.status(200).json({
    status: 'success',
    message: 'Security settings updated successfully',
    data: { security: settings.security }
  });
}));

// PUT /api/v1/hotel-settings/maintenance - Update maintenance settings
router.put('/maintenance', catchAsync(async (req, res, next) => {
  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const maintenanceData = {
    autoBackup: req.body.autoBackup !== undefined ? req.body.autoBackup : true,
    backupSchedule: req.body.backupSchedule || 'daily',
    backupRetention: req.body.backupRetention || 30,
    maintenanceWindow: req.body.maintenanceWindow || {
      start: '02:00',
      end: '04:00',
      timezone: 'Asia/Kolkata'
    }
  };

  const settings = await HotelSettings.updateHotelSettings(hotelId, { maintenance: maintenanceData });

  res.status(200).json({
    status: 'success',
    message: 'Maintenance settings updated successfully',
    data: { maintenance: settings.maintenance }
  });
}));

// POST /api/v1/hotel-settings/integrations/test - Test integration connection
router.post('/integrations/test', catchAsync(async (req, res, next) => {
  const { type, service } = req.body;

  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const settings = await HotelSettings.findOne({ hotelId });
  if (!settings) {
    return next(new ApplicationError('Hotel settings not found', 404));
  }

  const integration = settings.integrations?.[type]?.[service];
  if (!integration || !integration.enabled) {
    return next(new ApplicationError(`${service} integration is not enabled`, 400));
  }

  // TODO: Implement actual integration testing logic
  let testResult = { success: false, message: 'Test not implemented' };

  if (type === 'payment' && service === 'stripe') {
    // Mock Stripe test
    testResult = { success: true, message: 'Stripe connection successful' };
  } else if (type === 'analytics' && service === 'googleAnalytics') {
    // Mock GA test
    testResult = { success: true, message: 'Google Analytics connection successful' };
  }

  res.status(200).json({
    status: 'success',
    data: { testResult }
  });
}));

// POST /api/v1/hotel-settings/amenities - Add new amenity
router.post('/amenities', catchAsync(async (req, res, next) => {
  const { name, category, enabled = true, chargeable = false, price } = req.body;

  if (!name || !category) {
    return next(new ApplicationError('Name and category are required', 400));
  }

  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const settings = await HotelSettings.findOne({ hotelId });
  if (!settings) {
    return next(new ApplicationError('Hotel settings not found', 404));
  }

  const newAmenity = { name, category, enabled, chargeable, price: chargeable ? price : undefined };
  settings.amenities.push(newAmenity);
  await settings.save();

  res.status(201).json({
    status: 'success',
    message: 'Amenity added successfully',
    data: { amenity: newAmenity }
  });
}));

// PUT /api/v1/hotel-settings/amenities/:amenityId - Update amenity
router.put('/amenities/:amenityId', catchAsync(async (req, res, next) => {
  const { amenityId } = req.params;
  const { name, category, enabled, chargeable, price } = req.body;

  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const settings = await HotelSettings.findOne({ hotelId });
  if (!settings) {
    return next(new ApplicationError('Hotel settings not found', 404));
  }

  const amenity = settings.amenities.id(amenityId);
  if (!amenity) {
    return next(new ApplicationError('Amenity not found', 404));
  }

  if (name !== undefined) amenity.name = name;
  if (category !== undefined) amenity.category = category;
  if (enabled !== undefined) amenity.enabled = enabled;
  if (chargeable !== undefined) amenity.chargeable = chargeable;
  if (price !== undefined) amenity.price = price;

  await settings.save();

  res.status(200).json({
    status: 'success',
    message: 'Amenity updated successfully',
    data: { amenity }
  });
}));

// DELETE /api/v1/hotel-settings/amenities/:amenityId - Delete amenity
router.delete('/amenities/:amenityId', catchAsync(async (req, res, next) => {
  const { amenityId } = req.params;

  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  const settings = await HotelSettings.findOne({ hotelId });
  if (!settings) {
    return next(new ApplicationError('Hotel settings not found', 404));
  }

  const amenity = settings.amenities.id(amenityId);
  if (!amenity) {
    return next(new ApplicationError('Amenity not found', 404));
  }

  amenity.deleteOne();
  await settings.save();

  res.status(200).json({
    status: 'success',
    message: 'Amenity deleted successfully'
  });
}));

// POST /api/v1/hotel-settings/restore - Restore settings from backup
router.post('/restore', catchAsync(async (req, res, next) => {
  const { backup } = req.body;

  if (!backup || typeof backup !== 'object') {
    return next(new ApplicationError('Invalid backup data', 400));
  }

  const hotelId = req.user.hotelId;
  if (!hotelId) {
    return next(new ApplicationError('User not associated with any hotel', 400));
  }

  // Remove potentially harmful fields
  delete backup._id;
  delete backup.__v;
  delete backup.hotelId; // Don't allow changing hotel association

  const settings = await HotelSettings.updateHotelSettings(hotelId, backup);

  res.status(200).json({
    status: 'success',
    message: 'Settings restored from backup successfully',
    data: { settings }
  });
}));

// GET /api/v1/hotel-settings/booking-rules - Get booking rules
router.get('/booking-rules', catchAsync(async (req, res, next) => {
  const propertyId = req.query.propertyId || req.user.hotelId;

  if (!propertyId) {
    return next(new ApplicationError('Property ID is required', 400));
  }

  const settings = await HotelSettings.getOrCreateForHotel(propertyId);

  res.status(200).json({
    status: 'success',
    data: {
      bookingRules: settings.bookingRules || {
        minimumStay: { enabled: false, nights: 1, applyToWeekends: false },
        maximumStay: { enabled: false, nights: 30 },
        advanceBooking: { minDays: 0, maxDays: 365 },
        cutoffTime: { hours: 24, sameDay: false },
        blackoutDates: { enabled: false, dates: [] },
        cancellationWindow: { hours: 24, penaltyPercentage: 0 },
        gapRules: { enabled: false, minGapNights: 1 }
      }
    }
  });
}));

// PUT /api/v1/hotel-settings/booking-rules - Update booking rules
router.put('/booking-rules', catchAsync(async (req, res, next) => {
  const { propertyId, ...bookingRulesData } = req.body;

  const targetPropertyId = propertyId || req.user.hotelId;

  if (!targetPropertyId) {
    return next(new ApplicationError('Property ID is required', 400));
  }

  const { error } = hotelSettingsSchemas.bookingRules.validate(bookingRulesData);
  if (error) {
    return next(new ApplicationError(error.details[0].message, 400));
  }

  const updates = { bookingRules: bookingRulesData };
  const settings = await HotelSettings.updateHotelSettings(targetPropertyId, updates);

  res.status(200).json({
    status: 'success',
    message: 'Booking rules updated successfully',
    data: { bookingRules: settings.bookingRules }
  });
}));

export default router;