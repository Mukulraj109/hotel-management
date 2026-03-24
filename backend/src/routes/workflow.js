import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import WorkflowController from '../controllers/workflowController.js';

const router = express.Router();

// Workflow routes
router.post('/bulk-checkin', optionalAuth, ensurePropertyAccess, WorkflowController.bulkCheckIn);
router.post('/bulk-checkout', optionalAuth, ensurePropertyAccess, WorkflowController.bulkCheckOut);
router.post('/housekeeping', optionalAuth, ensurePropertyAccess, WorkflowController.scheduleHousekeeping);
router.post('/maintenance', optionalAuth, ensurePropertyAccess, WorkflowController.requestMaintenance);
router.post('/room-status', optionalAuth, ensurePropertyAccess, WorkflowController.updateRoomStatus);

// Analytics routes
router.get('/actions', optionalAuth, ensurePropertyAccess, WorkflowController.getWorkflowActions);
router.get('/analytics/floor/:floorId', optionalAuth, ensurePropertyAccess, WorkflowController.getFloorAnalytics);
router.get('/analytics/predictive', optionalAuth, ensurePropertyAccess, WorkflowController.getPredictiveAnalytics);

// Upgrade Processing routes
router.get('/upgrades/suggestions', optionalAuth, ensurePropertyAccess, WorkflowController.generateUpgradeSuggestions);
router.post('/upgrades/process', optionalAuth, ensurePropertyAccess, WorkflowController.processUpgrade);
router.get('/upgrades/analytics', optionalAuth, ensurePropertyAccess, WorkflowController.getUpgradeAnalytics);

export default router;
