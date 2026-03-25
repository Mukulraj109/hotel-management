import express from 'express';
import Joi from 'joi';
import { optionalAuth } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { validate } from '../middleware/validation.js';
import WorkflowController from '../controllers/workflowController.js';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

// Workflow routes
router.post('/bulk-checkin', optionalAuth, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.bulkCheckIn);
router.post('/bulk-checkout', optionalAuth, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.bulkCheckOut);
router.post('/housekeeping', optionalAuth, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.scheduleHousekeeping);
router.post('/maintenance', optionalAuth, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.requestMaintenance);
router.post('/room-status', optionalAuth, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.updateRoomStatus);

// Analytics routes
router.get('/actions', optionalAuth, ensurePropertyAccess, WorkflowController.getWorkflowActions);
router.get('/analytics/floor/:floorId', optionalAuth, ensurePropertyAccess, WorkflowController.getFloorAnalytics);
router.get('/analytics/predictive', optionalAuth, ensurePropertyAccess, WorkflowController.getPredictiveAnalytics);

// Upgrade Processing routes
router.get('/upgrades/suggestions', optionalAuth, ensurePropertyAccess, WorkflowController.generateUpgradeSuggestions);
router.post('/upgrades/process', optionalAuth, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.processUpgrade);
router.get('/upgrades/analytics', optionalAuth, ensurePropertyAccess, WorkflowController.getUpgradeAnalytics);

export default router;
