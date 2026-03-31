import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import CheckoutInventory from '../models/CheckoutInventory.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { validate } from '../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

// All routes require authentication
router.use(authenticate);
router.use(ensurePropertyAccess);

/**
 * @swagger
 * /api/v1/checkout-inventory/booking/{bookingId}:
 *   get:
 *     summary: Get checkout inventory check by booking ID
 *     tags: [Checkout Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checkout inventory check for booking
 */
router.get('/booking/:bookingId', authorizePolicy('checkoutInventory', 'staffAccess'), catchAsync(async (req, res) => {
  const checkoutInventory = await CheckoutInventory.findOne({
    bookingId: req.params.bookingId,
    hotelId: req.user.hotelId
  }).populate([
    { path: 'bookingId', select: 'bookingNumber checkIn checkOut totalAmount' },
    { path: 'roomId', select: 'roomNumber type' },
    { path: 'checkedBy', select: 'name email' }
  ]);

  if (!checkoutInventory) {
    throw new ApplicationError('Checkout inventory check not found for this booking', 404);
  }

  res.status(200).json({
    status: 'success',
    data: { checkoutInventory }
  });
}));

/**
 * @swagger
 * /api/v1/checkout-inventory:
 *   post:
 *     summary: Create a new checkout inventory check
 *     tags: [Checkout Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - roomId
 *               - items
 *             properties:
 *               bookingId:
 *                 type: string
 *               roomId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemName:
 *                       type: string
 *                     category:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *                     status:
 *                       type: string
 *                     notes:
 *                       type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Checkout inventory check created successfully
 */
router.post('/', authorizePolicy('checkoutInventory', 'staffAccess'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { bookingId, roomId, items, notes } = req.body;
  const { _id: checkedBy, hotelId } = req.user;

  logger.debug('Creating checkout inventory', { bookingId, roomId, itemsCount: items?.length });

  // Hotel-scoped booking lookup
  const booking = await Booking.findOne({ _id: bookingId, hotelId }).lean();
  if (!booking) {
    logger.debug('Booking not found for checkout inventory', { bookingId });
    throw new ApplicationError('Booking not found', 404);
  }

  logger.debug('Booking found for checkout inventory', { id: booking._id, status: booking.status });

  if (booking.status !== 'checked_in') {
    logger.debug('Invalid booking status for checkout inventory', { status: booking.status });
    throw new ApplicationError('Booking must be checked in to perform inventory check', 400);
  }

  // Duplicate guard: only one checkout inventory per booking+room
  const existing = await CheckoutInventory.findOne({ bookingId, roomId, hotelId }).lean();
  if (existing) {
    throw new ApplicationError('A checkout inventory check already exists for this booking and room', 409);
  }

  // Verify room exists and belongs to the booking
  const room = await Room.findById(roomId).lean();
  if (!room) {
    throw new ApplicationError('Room not found', 404);
  }

  const bookingRoom = booking.rooms.find(r => r.roomId.toString() === roomId);
  if (!bookingRoom) {
    throw new ApplicationError('Room does not belong to this booking', 400);
  }

  // Calculate total price for each item
  const processedItems = items.map(item => ({
    ...item,
    totalPrice: item.quantity * item.unitPrice
  }));

  logger.debug('Creating CheckoutInventory record', { bookingId, roomId, itemsCount: processedItems.length });

  const checkoutInventory = await CheckoutInventory.create({
    hotelId,
    bookingId,
    roomId,
    checkedBy,
    items: processedItems,
    notes
  });

  logger.debug('CheckoutInventory created successfully', { id: checkoutInventory._id });

  await checkoutInventory.populate([
    { path: 'bookingId', select: 'bookingNumber checkIn checkOut totalAmount' },
    { path: 'roomId', select: 'roomNumber type' },
    { path: 'checkedBy', select: 'name email' }
  ]);

  res.status(201).json({
    status: 'success',
    data: { checkoutInventory }
  });
}));

/**
 * @swagger
 * /api/v1/checkout-inventory:
 *   get:
 *     summary: Get all checkout inventory checks
 *     tags: [Checkout Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: bookingId
 *         schema:
 *           type: string
 *         description: Filter by booking ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of checkout inventory checks
 */
router.get('/', authorizePolicy('checkoutInventory', 'staffAccess'), catchAsync(async (req, res) => {
  const { status, paymentStatus, bookingId } = req.query;
  const { hotelId } = req.user;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 1000);

  const filter = { hotelId };
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (bookingId) filter.bookingId = bookingId;

  const skip = (page - 1) * limit;

  const [checkoutInventories, total] = await Promise.all([
    CheckoutInventory.find(filter)
      .populate([
        { 
          path: 'bookingId', 
          select: 'bookingNumber checkIn checkOut totalAmount',
          match: { hotelId }
        },
        { path: 'roomId', select: 'roomNumber type' },
        { path: 'checkedBy', select: 'name email' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CheckoutInventory.countDocuments(filter)
  ]);

  // Filter out results where bookingId is null (due to hotelId mismatch)
  const filteredInventories = checkoutInventories.filter(inv => inv.bookingId);

  res.status(200).json({
    status: 'success',
    data: {
      checkoutInventories: filteredInventories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

/**
 * @swagger
 * /api/v1/checkout-inventory/{id}:
 *   get:
 *     summary: Get checkout inventory check by ID
 *     tags: [Checkout Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checkout inventory check details
 */
router.get('/:id', authorizePolicy('checkoutInventory', 'staffAccess'), catchAsync(async (req, res) => {
  const checkoutInventory = await CheckoutInventory.findById(req.params.id)
    .populate([
      { path: 'bookingId', select: 'bookingNumber checkIn checkOut totalAmount userId' },
      { path: 'roomId', select: 'roomNumber type' },
      { path: 'checkedBy', select: 'name email' }
    ]).lean();

  if (!checkoutInventory) {
    throw new ApplicationError('Checkout inventory check not found', 404);
  }

  // Tenant isolation: verify user has access to this hotel's data
  const userHotelId = req.user.hotelId?.toString();
  if (checkoutInventory.hotelId && userHotelId && checkoutInventory.hotelId.toString() !== userHotelId) {
    throw new ApplicationError('Access denied to this checkout inventory', 403);
  }

  res.status(200).json({
    status: 'success',
    data: { checkoutInventory }
  });
}));

/**
 * @swagger
 * /api/v1/checkout-inventory/{id}:
 *   patch:
 *     summary: Update checkout inventory check
 *     tags: [Checkout Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout inventory check updated successfully
 */
router.patch('/:id', authorizePolicy('checkoutInventory', 'staffAccess'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { items, status, notes } = req.body;

  const checkoutInventory = await CheckoutInventory.findOne({
    _id: req.params.id,
    hotelId: req.user.hotelId
  });

  if (!checkoutInventory) {
    throw new ApplicationError('Checkout inventory check not found or access denied', 404);
  }

  if (items) {
    checkoutInventory.items = items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice
    }));
  }

  if (status) checkoutInventory.status = status;
  if (notes) checkoutInventory.notes = notes;

  // .save() triggers the pre-save hook that recomputes subtotal/tax/totalAmount
  await checkoutInventory.save();

  await checkoutInventory.populate([
    { path: 'bookingId', select: 'bookingNumber checkIn checkOut totalAmount' },
    { path: 'roomId', select: 'roomNumber type' },
    { path: 'checkedBy', select: 'name email' }
  ]);

  res.status(200).json({
    status: 'success',
    data: { checkoutInventory }
  });
}));

/**
 * @swagger
 * /api/v1/checkout-inventory/{id}/complete:
 *   post:
 *     summary: Mark checkout inventory as completed (ready for payment)
 *     tags: [Checkout Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Checkout inventory ID
 *     responses:
 *       200:
 *         description: Inventory check marked as completed
 */
router.post('/:id/complete', authorizePolicy('checkoutInventory', 'staffAccess'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  // Atomic update: only update if status is 'pending'
  const checkoutInventory = await CheckoutInventory.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.user.hotelId, status: 'pending' },
    { $set: { status: 'completed' } },
    { new: true, runValidators: true }
  );

  if (!checkoutInventory) {
    // Determine the reason for failure
    const existing = await CheckoutInventory.findById(req.params.id).lean();
    if (!existing) {
      throw new ApplicationError('Checkout inventory check not found', 404);
    }
    throw new ApplicationError('Only pending inventory checks can be marked as completed', 400);
  }

  // Mark the room as 'dirty' for housekeeping after checkout
  if (checkoutInventory.roomId) {
    try {
      const roomId = checkoutInventory.roomId._id || checkoutInventory.roomId;
      await Room.findByIdAndUpdate(roomId, { status: 'dirty' }, { new: true });
    } catch (err) {
      logger.warn('Failed to update room status to dirty after checkout', { error: err.message });
    }
  }

  await checkoutInventory.populate([
    { path: 'bookingId', select: 'bookingNumber checkIn checkOut totalAmount' },
    { path: 'roomId', select: 'roomNumber type' },
    { path: 'checkedBy', select: 'name email' }
  ]);

  res.status(200).json({
    status: 'success',
    data: { checkoutInventory },
    message: 'Inventory check marked as completed. Customer can now proceed to payment.'
  });
}));

/**
 * @swagger
 * /api/v1/checkout-inventory/{id}/payment:
 *   post:
 *     summary: Process payment for checkout inventory
 *     tags: [Checkout Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, upi, bank_transfer]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed successfully
 */
router.post('/:id/payment', authorizePolicy('checkoutInventory', 'staffAccess'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const { paymentMethod, notes } = req.body;

  // Atomic update: require status=completed AND not already paid
  const updateFields = {
    paymentMethod,
    paymentStatus: 'paid',
    status: 'paid',
    paidAt: new Date()
  };
  if (notes) updateFields.notes = notes;

  const checkoutInventory = await CheckoutInventory.findOneAndUpdate(
    {
      _id: req.params.id,
      hotelId: req.user.hotelId,
      status: 'completed',
      paymentStatus: { $ne: 'paid' }
    },
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  if (!checkoutInventory) {
    const existing = await CheckoutInventory.findOne({
      _id: req.params.id,
      hotelId: req.user.hotelId
    }).lean();
    if (!existing) {
      throw new ApplicationError('Checkout inventory check not found', 404);
    }
    if (existing.paymentStatus === 'paid') {
      throw new ApplicationError('Payment already processed', 400);
    }
    throw new ApplicationError('Inventory check must be completed before payment can be processed', 400);
  }

  // Update booking status to checked out
  const booking = await Booking.findByIdAndUpdate(checkoutInventory.bookingId, {
    status: 'checked_out',
    checkOutTime: new Date()
  }, { new: true });

  // Add billing history to user account if user exists
  if (booking && booking.userId) {
    await User.findByIdAndUpdate(booking.userId, {
      $push: {
        billingHistory: {
          type: 'checkout_charges',
          bookingId: checkoutInventory.bookingId,
          roomId: checkoutInventory.roomId,
          description: 'Room checkout inventory charges',
          items: checkoutInventory.items.filter(item => item.totalPrice > 0).map(item => ({
            name: item.itemName,
            category: item.category,
            status: item.status,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes
          })),
          subtotal: checkoutInventory.subtotal,
          tax: checkoutInventory.tax,
          totalAmount: checkoutInventory.totalAmount,
          paymentMethod: checkoutInventory.paymentMethod,
          paymentStatus: checkoutInventory.paymentStatus,
          paidAt: checkoutInventory.paidAt,
          checkoutInventoryId: checkoutInventory._id,
          createdAt: new Date()
        }
      }
    },
      { new: true }
    );
  }

  await checkoutInventory.populate([
    { path: 'bookingId', select: 'bookingNumber checkIn checkOut totalAmount' },
    { path: 'roomId', select: 'roomNumber type' },
    { path: 'checkedBy', select: 'name email' }
  ]);

  res.status(200).json({
    status: 'success',
    data: { checkoutInventory },
    message: 'Payment processed and guest checked out successfully'
  });
}));

export default router;
