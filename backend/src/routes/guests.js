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

// Middleware: enforce guest self-service ownership — guests can only access their own profile
const enforceGuestOwnership = (req, res, next) => {
  if (req.user.role === 'guest') {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Guests can only access their own profile'
      });
    }
  }
  next();
};

// Apply authentication and property access to all routes
router.use(authenticate);
router.use(ensureTenantContext);
router.use(ensurePropertyAccess);
router.use(authorizePolicy('guests', 'baseAccess'));

// Guest self-service routes — guests can only view/update their own profile
router.get('/:id', enforceGuestOwnership, guestController.getGuest);
router.get('/:id/bookings', enforceGuestOwnership, guestController.getGuest);
router.patch('/:id', enforceGuestOwnership, validate(mutationBaselineSchema), guestController.updateGuest);

// Admin/Staff routes (frontdesk also needs read access to manage guests on behalf of hotel)
router.use(authorize('admin', 'manager', 'staff', 'frontdesk'));

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
