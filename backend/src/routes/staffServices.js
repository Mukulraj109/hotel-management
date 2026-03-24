import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import {
  getMyAssignedServices,
  getMyServiceRequests,
  getServiceRequestDetails,
  updateServiceRequestStatus,
  addNotesToRequest,
  getStaffServiceDashboard
} from '../controllers/staffServicesController.js';

const router = express.Router();

// Apply authentication and staff authorization to all routes
router.use(authenticate);
router.use(ensurePropertyAccess);
router.use(authorize('staff'));

/**
 * @swagger
 * tags:
 *   name: Staff - Services
 *   description: Staff service management and request handling
 */

// Dashboard
router.get('/dashboard', getStaffServiceDashboard);

// Staff's assigned services
router.get('/my-services', getMyAssignedServices);

// Staff's service requests
router.get('/my-requests', getMyServiceRequests);

// Individual request management
router.route('/requests/:id')
  .get(getServiceRequestDetails)
  .patch(updateServiceRequestStatus);

// Request actions
router.patch('/requests/:id/update-status', updateServiceRequestStatus);
router.patch('/requests/:id/add-notes', addNotesToRequest);

export default router;