import express from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth.js';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  deleteServiceImage,
  bulkOperations,
  uploadImages,
  getServiceStaff,
  assignStaffToService,
  removeStaffFromService,
  getAvailableStaff
} from '../controllers/adminHotelServicesController.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorizePolicy('adminHotelServices', 'baseAccess'));
router.use(ensurePropertyAccess);

/**
 * @swagger
 * tags:
 *   name: Admin - Hotel Services
 *   description: Admin management of hotel services and experiences
 */

// Bulk operations
router.post('/bulk-operations', validate(mutationBaselineSchema), bulkOperations);

// Staff management
router.get('/available-staff', getAvailableStaff);

// CRUD operations
router.route('/')
  .get(getAllServices)
  .post(validate(mutationBaselineSchema), uploadImages, createService);

router.route('/:id')
  .get(getServiceById)
  .put(validate(mutationBaselineSchema), uploadImages, updateService)
  .delete(validate(mutationBaselineSchema), deleteService);

// Service status toggle
router.patch('/:id/toggle-status', validate(mutationBaselineSchema), toggleServiceStatus);

// Staff assignment routes
router.route('/:id/staff')
  .get(getServiceStaff)
  .post(validate(mutationBaselineSchema), assignStaffToService);

router.delete('/:id/staff/:staffId', validate(mutationBaselineSchema), removeStaffFromService);

// Image management
router.delete('/:id/images/:imageIndex', validate(mutationBaselineSchema), deleteServiceImage);

export default router;
