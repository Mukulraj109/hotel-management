import express from 'express';
import Inventory from '../models/Inventory.js';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { validate } from '../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

// Get inventory items
router.get('/', authenticate, ensureTenantContext, authorizePolicy('inventory', 'readWriteAccess'), ensurePropertyAccess, catchAsync(async (req, res) => {
  const {
    category,
    lowStock,
    page = 1,
    limit = 10
  } = req.query;

  const query = { isActive: true };
  
  if (req.user.hotelId) {
    query.hotelId = req.user.hotelId;
  }
  
  if (category) query.category = category;
  
  if (lowStock === 'true') {
    query.$expr = { $lte: ['$quantity', '$minimumThreshold'] };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const items = await Inventory.find(query)
    .sort({ name: 1 })
    .skip(skip)
    .limit(parseInt(limit)).lean();

  const total = await Inventory.countDocuments(query);

  res.json({
    status: 'success',
    results: items.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { items }
  });
}));

// Create inventory item
router.post('/', authenticate, ensureTenantContext, authorizePolicy('inventory', 'manageAccess'), ensurePropertyAccess, validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const itemData = {
    ...req.body,
    hotelId: req.user.hotelId
  };

  const item = await Inventory.create(itemData);

  res.status(201).json({
    status: 'success',
    data: { item }
  });
}));

// Update inventory item
router.patch('/:id', authenticate, ensureTenantContext, authorizePolicy('inventory', 'readWriteAccess'), ensurePropertyAccess, validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const item = await Inventory.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!item) {
    throw new ApplicationError('Inventory item not found', 404);
  }

  res.json({
    status: 'success',
    data: { item }
  });
}));

// Create supply request
router.post('/request', authenticate, ensureTenantContext, authorizePolicy('inventory', 'requestAccess'), ensurePropertyAccess, validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { itemId, quantity, reason } = req.body;

  const item = await Inventory.findByIdAndUpdate(
    itemId,
    {
      $push: {
        requests: {
          userId: req.user._id,
          quantity,
          reason,
          status: 'pending'
        }
      }
    },
    { new: true, runValidators: true }
  );

  if (!item) {
    throw new ApplicationError('Inventory item not found', 404);
  }

  res.status(201).json({
    status: 'success',
    data: {
      item,
      message: 'Supply request submitted successfully'
    }
  });
}));

// Approve/reject supply request
router.patch('/request/:itemId/:requestId',
  authenticate,
  ensureTenantContext,
  authorizePolicy('inventory', 'manageAccess'),
  ensurePropertyAccess,
  validate(mutationBaselineSchema),
  catchAsync(async (req, res) => {
    const { itemId, requestId } = req.params;
    const { status } = req.body; // 'approved', 'rejected', 'fulfilled'

    // First, read to get request quantity if we need to fulfill
    const existingItem = await Inventory.findById(itemId).lean();

    if (!existingItem) {
      throw new ApplicationError('Inventory item not found', 404);
    }

    const request = existingItem.requests && existingItem.requests.find(
      r => r._id.toString() === requestId
    );

    if (!request) {
      throw new ApplicationError('Request not found', 404);
    }

    // Build atomic update
    const updateOps = {
      $set: {
        'requests.$[req].status': status,
        'requests.$[req].approvedBy': req.user._id,
        'requests.$[req].processedAt': new Date()
      }
    };

    // If fulfilled, atomically increment inventory quantity
    if (status === 'fulfilled') {
      updateOps.$inc = { quantity: request.quantity };
    }

    const item = await Inventory.findByIdAndUpdate(
      itemId,
      updateOps,
      {
        new: true,
        runValidators: true,
        arrayFilters: [{ 'req._id': requestId }]
      }
    );

    res.json({
      status: 'success',
      data: { item }
    });
  })
);

export default router;
