import express from 'express';
import Joi from 'joi';
import * as guestController from '../controllers/guestController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext, requireTenantInBulkOps } from '../middleware/tenantIsolation.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

// Apply authentication and property access to all routes
router.use(authenticate);
router.use(ensureTenantContext);
router.use(ensurePropertyAccess);
router.use(authorizePolicy('guests', 'baseAccess'));

// Public routes (for guest self-service)
router.get('/:id', guestController.getGuest);
router.get('/:id/bookings', guestController.getGuest);
router.patch('/:id', validate(mutationBaselineSchema), guestController.updateGuest);

// Admin/Staff routes
router.use(authorize('admin', 'manager', 'staff'));

// Enhanced guest management routes
router.route('/')
  .get(guestController.getAllGuests)
  .post(guestController.createGuest);

router.route('/analytics')
  .get(guestController.getGuestAnalytics);

router.route('/search')
  .post(guestController.searchGuests);

router.route('/export')
  .get(guestController.exportGuests);

router.route('/bulk-update')
  .patch(requireTenantInBulkOps, guestController.bulkUpdateGuests);

router.route('/:id')
  .get(guestController.getGuest)
  .patch(guestController.updateGuest)
  .delete(guestController.deleteGuest);

export default router;
