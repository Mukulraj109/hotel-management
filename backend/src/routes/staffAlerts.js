import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
import StaffAlert from '../models/StaffAlert.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import logger from '../utils/logger.js';
import websocketService from '../services/websocketService.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { validate } from '../middleware/validation.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import Joi from 'joi';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();
const ALLOWED_ASSIGNEE_ROLES = ['staff', 'admin', 'manager', 'frontdesk'];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Ensure tenant context is pinned for all alert routes
router.use(authenticate);
router.use(ensureTenantContext);
router.use(ensurePropertyAccess);

const validateAssignedUser = async (assignedTo, hotelId) => {
  if (!assignedTo) return;

  const assignee = await User.findOne({
    _id: assignedTo,
    hotelId,
    role: { $in: ALLOWED_ASSIGNEE_ROLES }
  }).select('_id');

  if (!assignee) {
    throw new ApplicationError('Assigned user must belong to the same hotel and have an allowed role', 400);
  }
};

// @desc    Get recent staff alerts for dropdown (last N active alerts)
// @route   GET /api/v1/staff/alerts/recent
// @access  Private (staff, admin, manager)
router.get('/recent', authorizePolicy('staffAlerts', 'staffAccess'), asyncHandler(async (req, res) => {
  const { hotelId } = req.user;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || 5));

  const alerts = await StaffAlert.find({
    hotelId,
    status: { $in: ['active', 'acknowledged', 'in_progress'] }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')
    .lean();

  res.status(200).json({
    status: 'success',
    data: { alerts }
  });
}));

// @desc    Get staff alerts summary
// @route   GET /api/v1/staff/alerts/summary
// @access  Private (staff, admin, manager)
router.get('/summary', authorizePolicy('staffAlerts', 'staffAccess'), asyncHandler(async (req, res) => {
  const { hotelId } = req.user;
  // Convert to ObjectId for aggregate $match to ensure index usage and type safety
  const hotelObjectId = new mongoose.Types.ObjectId(hotelId);
  const activeStatuses = ['active', 'acknowledged', 'in_progress'];

  // Get alert counts by status and priority
  const [
    totalAlerts,
    unacknowledgedAlerts,
    criticalAlerts,
    urgentAlerts,
    alertsByCategory
  ] = await Promise.all([
    StaffAlert.countDocuments({ hotelId, status: { $in: activeStatuses } }),
    StaffAlert.countDocuments({ hotelId, status: 'active' }),
    StaffAlert.countDocuments({ hotelId, priority: 'critical', status: { $in: activeStatuses } }),
    StaffAlert.countDocuments({ hotelId, priority: 'urgent', status: { $in: activeStatuses } }),
    StaffAlert.aggregate([
      { $match: { hotelId: hotelObjectId, status: { $in: activeStatuses } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalAlerts,
      unacknowledgedAlerts,
      criticalAlerts,
      urgentAlerts,
      alertsByCategory: alertsByCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    }
  });
}));

// @desc    Get all staff alerts
// @route   GET /api/v1/staff/alerts
// @access  Private (staff, admin, manager)
router.get('/', authorizePolicy('staffAlerts', 'staffAccess'), asyncHandler(async (req, res) => {
  const { hotelId } = req.user;
  const {
    status = 'all',
    priority = 'all',
    category = 'all',
    type,
    assignedTo,
    activeOnly,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT));
  const parsedSkip = Math.max(0, parseInt(req.query.skip) || 0);

  // Validate sortBy to prevent injection
  const allowedSortFields = ['createdAt', 'updatedAt', 'priority', 'status', 'title'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

  // Build filter
  const filter = { hotelId };

  if (status !== 'all' && status) {
    filter.status = status;
  } else if (activeOnly === 'true') {
    filter.status = { $in: ['active', 'acknowledged', 'in_progress'] };
  }

  if (priority !== 'all' && priority) {
    filter.priority = priority;
  }

  if (category !== 'all' && category) {
    filter.category = category;
  }

  if (type && type !== 'all') {
    filter.type = type;
  }

  // Filter by assigned staff member
  if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
    filter.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  }

  if (search) {
    const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { title: searchRegex },
      { message: searchRegex },
      { 'metadata.roomNumber': searchRegex },
      { 'metadata.guestName': searchRegex }
    ];
  }

  // Build sort
  const sort = {};
  sort[safeSortBy] = sortOrder === 'desc' ? -1 : 1;

  const [alerts, totalCount] = await Promise.all([
    StaffAlert.find(filter)
      .sort(sort)
      .limit(parsedLimit)
      .skip(parsedSkip)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .lean(),
    StaffAlert.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    results: alerts.length,
    total: totalCount,
    data: {
      alerts
    }
  });
}));

// @desc    Create new staff alert
// @route   POST /api/v1/staff/alerts
// @access  Private (staff, admin, manager)
router.post('/', authorizePolicy('staffAlerts', 'staffAccess'), validate(mutationBaselineSchema), asyncHandler(async (req, res) => {
  const { hotelId, _id: createdBy } = req.user;
  await validateAssignedUser(req.body.assignedTo, hotelId);

  const alertData = {
    ...req.body,
    hotelId,
    createdBy,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const alert = await StaffAlert.create(alertData);
  await alert.populate('assignedTo', 'name email role');
  await alert.populate('createdBy', 'name email role');

  // Emit real-time notification (event name 'staff-alert:new' matches frontend listeners)
  try {
    await websocketService.broadcastToHotel(hotelId, 'staff-alert:new', { alert });

    // Send to specific assigned user if specified
    if (alert.assignedTo) {
      await websocketService.sendToUser(alert.assignedTo._id, 'staff-alert:assigned', { alert, assignedToMe: true });
    }
  } catch (wsError) {
    logger.warn('Failed to broadcast staff alert creation', { error: wsError.message, alertId: alert._id });
  }

  res.status(201).json({
    status: 'success',
    data: {
      alert
    }
  });
}));

// @desc    Update staff alert
// @route   PUT /api/v1/staff/alerts/:id
// @access  Private (staff, admin, manager)
router.put('/:id', authorizePolicy('staffAlerts', 'staffAccess'), validate(mutationBaselineSchema), asyncHandler(async (req, res) => {
  const { hotelId, _id: userId } = req.user;
  await validateAssignedUser(req.body.assignedTo, hotelId);

  let alert = await StaffAlert.findOne({
    _id: req.params.id,
    hotelId
  }).lean();

  if (!alert) {
    return res.status(404).json({
      status: 'error',
      message: 'Staff alert not found'
    });
  }

  // Build update data, stripping hotelId to prevent override
  const { hotelId: _stripHotelId, createdBy: _stripCreatedBy, ...safeBody } = req.body;
  const updateData = {
    ...safeBody,
    updatedAt: new Date(),
    lastUpdatedBy: userId
  };

  // Set lifecycle timestamps based on status transitions
  if (safeBody.status === 'resolved' && alert.status !== 'resolved') {
    updateData.resolvedAt = new Date();
    updateData.resolvedBy = userId;
  }
  if (safeBody.status === 'acknowledged' && alert.status !== 'acknowledged') {
    updateData.acknowledgedAt = new Date();
    updateData.acknowledgedBy = userId;
  }
  if (safeBody.status === 'in_progress' && alert.status !== 'in_progress') {
    // Record when work started if not already acknowledged
    if (!alert.acknowledgedAt) {
      updateData.acknowledgedAt = new Date();
      updateData.acknowledgedBy = userId;
    }
  }

  // Escalation: bump priority to critical and record escalation
  if (safeBody.escalate) {
    updateData.priority = 'critical';
    updateData.escalationLevel = (alert.escalationLevel || 0) + 1;
    delete updateData.escalate;
  }

  alert = await StaffAlert.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  )
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')
    .populate('acknowledgedBy', 'name email role')
    .populate('resolvedBy', 'name email role')
    .populate('lastUpdatedBy', 'name email role');

  // Emit real-time notification with correct event names
  try {
    let eventName;
    if (safeBody.status === 'resolved') {
      eventName = 'staff-alert:resolved';
    } else if (safeBody.escalate) {
      eventName = 'staff-alert:escalated';
    } else {
      eventName = 'staff-alert:updated';
    }
    await websocketService.broadcastToHotel(hotelId, eventName, { alert });

    // Send to assigned user if specified
    if (alert.assignedTo) {
      await websocketService.sendToUser(alert.assignedTo._id, eventName, { alert });
    }
  } catch (wsError) {
    logger.warn('Failed to broadcast staff alert update', { error: wsError.message, alertId: alert._id });
  }

  res.status(200).json({
    status: 'success',
    data: {
      alert
    }
  });
}));

// @desc    Acknowledge staff alert
// @route   PATCH /api/v1/staff/alerts/:id/acknowledge
// @access  Private (staff, admin, manager)
router.patch('/:id/acknowledge', authorizePolicy('staffAlerts', 'staffAccess'), validate(mutationBaselineSchema), asyncHandler(async (req, res) => {
  const { hotelId, _id: userId } = req.user;

  // Verify alert exists for this hotel
  const existingAlert = await StaffAlert.findOne({
    _id: req.params.id,
    hotelId
  }).select('_id status').lean();

  if (!existingAlert) {
    return res.status(404).json({
      status: 'error',
      message: 'Staff alert not found'
    });
  }

  // Idempotent: if already past 'active', return the current document without re-writing
  if (existingAlert.status !== 'active') {
    const current = await StaffAlert.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('acknowledgedBy', 'name email role');
    return res.status(200).json({ status: 'success', data: { alert: current } });
  }

  // Atomic conditional update: only move from 'active' → 'acknowledged'.
  // If two concurrent requests race, only one write succeeds; the other falls
  // through to the race-condition branch and returns the latest document.
  let alert = await StaffAlert.findOneAndUpdate(
    { _id: req.params.id, hotelId, status: 'active' },
    {
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      acknowledgedBy: userId,
      updatedAt: new Date()
    },
    { new: true, runValidators: true }
  )
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')
    .populate('acknowledgedBy', 'name email role');

  // Race condition: another concurrent request already acknowledged — return latest state
  if (!alert) {
    alert = await StaffAlert.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('acknowledgedBy', 'name email role');
  }

  // Emit real-time notification (use 'staff-alert:updated' to match frontend listeners)
  try {
    await websocketService.broadcastToHotel(hotelId, 'staff-alert:updated', { alert });
  } catch (wsError) {
    logger.warn('Failed to broadcast staff alert acknowledgment', { error: wsError.message, alertId: alert._id });
  }

  res.status(200).json({
    status: 'success',
    data: {
      alert
    }
  });
}));

// @desc    Delete staff alert
// @route   DELETE /api/v1/staff/alerts/:id
// @access  Private (admin, manager)
router.delete('/:id', authorizePolicy('staffAlerts', 'manageAccess'), validate(mutationBaselineSchema), asyncHandler(async (req, res) => {
  const { hotelId } = req.user;

  const alert = await StaffAlert.findOne({
    _id: req.params.id,
    hotelId
  }).lean();

  if (!alert) {
    return res.status(404).json({
      status: 'error',
      message: 'Staff alert not found'
    });
  }

  await StaffAlert.findByIdAndDelete(req.params.id);

  // Emit real-time notification
  try {
    await websocketService.broadcastToHotel(hotelId, 'staff-alert:deleted', { alertId: req.params.id });
  } catch (wsError) {
    logger.warn('Failed to broadcast staff alert deletion', { error: wsError.message, alertId: req.params.id });
  }

  // 204 No Content — must send no body
  res.status(204).end();
}));

export default router;