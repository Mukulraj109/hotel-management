import express from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { validate } from '../middleware/validation.js';
import WorkflowController from '../controllers/workflowController.js';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

// Workflow routes
router.post('/bulk-checkin', authenticate, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.bulkCheckIn);
router.post('/bulk-checkout', authenticate, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.bulkCheckOut);
router.post('/housekeeping', authenticate, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.scheduleHousekeeping);
router.post('/maintenance', authenticate, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.requestMaintenance);
router.post('/room-status', authenticate, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.updateRoomStatus);

// Analytics routes
router.get('/actions', authenticate, ensurePropertyAccess, WorkflowController.getWorkflowActions);
router.get('/analytics/floor/:floorId', authenticate, ensurePropertyAccess, WorkflowController.getFloorAnalytics);
router.get('/analytics/predictive', authenticate, ensurePropertyAccess, WorkflowController.getPredictiveAnalytics);

// Upgrade Processing routes
router.get('/upgrades/suggestions', authenticate, ensurePropertyAccess, WorkflowController.generateUpgradeSuggestions);
router.post('/upgrades/process', authenticate, ensurePropertyAccess, validate(mutationBaselineSchema), WorkflowController.processUpgrade);
router.get('/upgrades/analytics', authenticate, ensurePropertyAccess, WorkflowController.getUpgradeAnalytics);

export default router;
