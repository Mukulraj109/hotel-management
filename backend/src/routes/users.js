import express from 'express';
import Joi from 'joi';
import * as userManagementController from '../controllers/userManagementController.js';
import * as userCreationController from '../controllers/userCreationController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

// Apply authentication to all routes
router.use(authenticate);
router.use(authorizePolicy('users', 'baseAccess'));

// User creation and management routes (admin and manager only)
// Generate password endpoint (must come before :userId routes to avoid conflict)
router.get('/generate-password', authorize('admin', 'manager'), userCreationController.generatePassword);

// Create new user
router.post('/create', authorize('admin', 'manager'), validate(mutationBaselineSchema), userCreationController.createUser);

// Get list of users (frontdesk and staff can view guests for booking creation)
router.get('/', authorize('admin', 'manager', 'staff', 'frontdesk'), ensurePropertyAccess, userCreationController.getUsers);

// Get, update, delete specific user
router.route('/:userId')
  .get(authorize('admin', 'manager'), userCreationController.getUserById)
  .put(authorize('admin', 'manager'), userCreationController.updateUser)
  .delete(authorize('admin', 'manager'), userCreationController.deleteUser);

// User profile routes (guests can access their own, staff/admin can access any in their hotel)
router.route('/:userId/profile')
  .get(ensurePropertyAccess, userManagementController.getUserBillingDetails)
  .put(ensurePropertyAccess, userManagementController.updateUserProfile);

// User billing details routes
router.route('/:userId/billing')
  .get(ensurePropertyAccess, userManagementController.getUserBillingDetails)
  .put(ensurePropertyAccess, userManagementController.updateUserBillingDetails);

// GST validation utility
router.post('/validate-gst', validate(mutationBaselineSchema), userManagementController.validateGSTNumber);

export default router;