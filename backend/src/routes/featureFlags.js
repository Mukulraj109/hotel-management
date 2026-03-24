import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import featureFlagService from '../services/featureFlagService.js';

const router = express.Router();

router.use(authenticate);

// Get all feature flags
router.get('/', catchAsync(async (req, res) => {
  const flags = await featureFlagService.getAll();
  res.json({ status: 'success', data: { flags } });
}));

// Check specific flag
router.get('/:flagName', catchAsync(async (req, res) => {
  const hotelId = req.query.hotelId || req.user.hotelId;
  const enabled = await featureFlagService.isEnabled(req.params.flagName, hotelId);
  res.json({ status: 'success', data: { flag: req.params.flagName, enabled } });
}));

// Toggle flag (admin only)
router.post('/:flagName', authorize('admin'), catchAsync(async (req, res) => {
  const { enabled, hotelId } = req.body;
  if (enabled) {
    await featureFlagService.enable(req.params.flagName, hotelId);
  } else {
    await featureFlagService.disable(req.params.flagName, hotelId);
  }
  res.json({ status: 'success', message: `Flag ${req.params.flagName} ${enabled ? 'enabled' : 'disabled'}` });
}));

export default router;
