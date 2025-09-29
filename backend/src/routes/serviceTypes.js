import express from 'express';
import {
  getServiceTypes,
  getServiceTypeById,
  createServiceType,
  updateServiceType,
  deleteServiceType,
  addVariation,
  addTemplate,
  calculatePrice,
  getServiceTypeStats
} from '../controllers/serviceTypeController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRoles } from '../middleware/roleValidation.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin - Service Types
 *   description: Service type management endpoints for hotel administrators
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * Service Type CRUD Operations
 */

// GET /admin/service-types - Get all service types for a hotel
router.get('/', getServiceTypes);

// GET /admin/service-types/stats - Get service type statistics
router.get('/stats', getServiceTypeStats);

// GET /admin/service-types/:id - Get specific service type
router.get('/:id', getServiceTypeById);

// POST /admin/service-types - Create new service type (Manager+ only)
router.post('/', validateRoles(['admin', 'manager']), createServiceType);

// PUT /admin/service-types/:id - Update service type (Manager+ only)
router.put('/:id', validateRoles(['admin', 'manager']), updateServiceType);

// DELETE /admin/service-types/:id - Delete service type (Manager+ only)
router.delete('/:id', validateRoles(['admin', 'manager']), deleteServiceType);

/**
 * Service Type Variations
 */

// POST /admin/service-types/:id/variations - Add variation to service type
router.post('/:id/variations', validateRoles(['admin', 'manager']), addVariation);

/**
 * Service Type Templates
 */

// POST /admin/service-types/:id/templates - Add template to service type
router.post('/:id/templates', validateRoles(['admin', 'manager']), addTemplate);

/**
 * Pricing Calculations
 */

// POST /admin/service-types/:type/calculate-price - Calculate price with variations
router.post('/:type/calculate-price', calculatePrice);

export default router;