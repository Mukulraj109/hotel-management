import express from 'express';
import {
  getTravelDashboardOverview,
  getTravelAnalytics,
  getPendingCommissions,
  getTravelAgentRates,
  exportTravelData
} from '../controllers/adminTravelDashboardController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply authorization - only admin, manager, and staff can access travel dashboard
router.use(authorize('admin', 'manager', 'staff'));

// Travel dashboard routes
router.get('/', getTravelDashboardOverview);
router.get('/analytics', getTravelAnalytics);
router.get('/pending-commissions', getPendingCommissions);
router.get('/rates', getTravelAgentRates);
router.get('/export', exportTravelData);

export default router;