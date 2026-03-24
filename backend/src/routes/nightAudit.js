import express from 'express';
import NightAudit from '../models/NightAudit.js';
import nightAuditService from '../services/nightAuditService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';

const router = express.Router();

router.use(authenticate);
router.use(ensurePropertyAccess);

// Run night audit manually
router.post('/run', authorize('admin'), catchAsync(async (req, res) => {
  const hotelId = req.body.hotelId || req.user.hotelId;
  const auditDate = req.body.date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: yesterday

  if (!hotelId) {
    throw new ApplicationError('Hotel ID is required', 400);
  }

  const audit = await nightAuditService.runFullAudit(hotelId, auditDate, req.user._id, 'manual');

  res.json({
    status: 'success',
    data: { audit }
  });
}));

// Get audit for specific date
router.get('/:date', catchAsync(async (req, res) => {
  const hotelId = req.query.hotelId || req.user.hotelId;
  const auditDate = new Date(req.params.date);
  auditDate.setUTCHours(0, 0, 0, 0);

  const audit = await NightAudit.findOne({ hotelId, auditDate })
    .populate('initiatedByUser', 'name')
    .populate('lockedBy', 'name');

  if (!audit) {
    throw new ApplicationError('Night audit not found for this date', 404);
  }

  res.json({
    status: 'success',
    data: { audit }
  });
}));

// List audit history
router.get('/', catchAsync(async (req, res) => {
  const hotelId = req.query.hotelId || req.user.hotelId;
  const { page = 1, limit = 20 } = req.query;

  const [audits, total] = await Promise.all([
    NightAudit.find({ hotelId })
      .sort({ auditDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('initiatedByUser', 'name')
      .lean(),
    NightAudit.countDocuments({ hotelId })
  ]);

  res.json({
    status: 'success',
    data: { audits },
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
  });
}));

// Lock an audit day
router.post('/:id/lock', authorize('admin'), catchAsync(async (req, res) => {
  const audit = await NightAudit.findById(req.params.id);

  if (!audit) {
    throw new ApplicationError('Night audit not found', 404);
  }

  if (audit.status !== 'completed') {
    throw new ApplicationError('Only completed audits can be locked', 400);
  }

  audit.locked = true;
  audit.lockedAt = new Date();
  audit.lockedBy = req.user._id;
  await audit.save();

  res.json({
    status: 'success',
    data: { audit }
  });
}));

export default router;
