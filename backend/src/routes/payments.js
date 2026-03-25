import express from 'express';
import Stripe from 'stripe';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import POSOrder from '../models/POSOrder.js';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
import { validate, schemas } from '../middleware/validation.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { CircuitBreaker } from '../utils/circuitBreaker.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const stripeBreaker = new CircuitBreaker({ name: 'stripe', failureThreshold: 5, resetTimeout: 30000, timeout: 30000 });

function requireStripe() {
  if (!stripe) {
    throw new ApplicationError('Payment processing is not configured. Set STRIPE_SECRET_KEY.', 503);
  }
  return stripe;
}

// Rate limiting for payment operations
const financialLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for financial operations
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many financial requests' } },
});

// All routes require authentication, rate limiting, and property access
router.use(financialLimiter);
router.use(authenticate);
router.use(ensureTenantContext);
router.use(ensurePropertyAccess);

/**
 * @swagger
 * /payments/intent:
 *   post:
 *     summary: Create payment intent
 *     tags: [Payments]
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
 *             properties:
 *               bookingId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: USD
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 */
router.post('/intent',
  authenticate,
  ensureTenantContext,
  validate(schemas.createPaymentIntent),
  catchAsync(async (req, res) => {
    const { bookingId, amount, currency = 'INR' } = req.body;

    // Get booking
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check if user owns the booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      throw new ApplicationError('You do not have permission to pay for this booking', 403);
    }

    // Check if booking is still valid for payment
    if (booking.status === 'cancelled') {
      throw new ApplicationError('Cannot pay for a cancelled booking', 400);
    }

    if (booking.paymentStatus === 'paid') {
      throw new ApplicationError('Booking has already been paid', 400);
    }

    // Always derive payment amount from server-side booking record
    const paymentAmount = Math.round(booking.totalAmount * 100); // Convert to cents

    // Support idempotency key to prevent duplicate payment intents
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    const stripeOptions = idempotencyKey ? { idempotencyKey } : {};

    // Create Stripe Payment Intent (with circuit breaker)
    const paymentIntent = await stripeBreaker.execute(
      () => requireStripe().paymentIntents.create({
        amount: Math.round(paymentAmount),
        currency: currency.toLowerCase(),
        metadata: {
          bookingId: bookingId,
          userId: req.user._id.toString(),
          bookingNumber: booking.bookingNumber
        },
        automatic_payment_methods: {
          enabled: true,
        },
      }, stripeOptions),
      () => { throw new Error('Payment service temporarily unavailable. Please try again.'); }
    );

    // Create payment record
    await Payment.create({
      bookingId,
      hotelId: booking.hotelId,
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentAmount / 100,
      currency: currency.toUpperCase(),
      status: 'pending'
    });

    res.json({
      status: 'success',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  })
);

/**
 * @swagger
 * /payments/confirm:
 *   post:
 *     summary: Confirm payment (server-side)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 */
router.post('/confirm',
  authenticate,
  ensureTenantContext,
  catchAsync(async (req, res) => {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      throw new ApplicationError('Payment Intent ID is required', 400);
    }

    // Retrieve payment intent from Stripe (with circuit breaker)
    const paymentIntent = await stripeBreaker.execute(
      () => requireStripe().paymentIntents.retrieve(paymentIntentId),
      () => { throw new Error('Payment service temporarily unavailable. Please try again.'); }
    );

    if (paymentIntent.status === 'succeeded') {
      // Find and update payment record
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentId },
        {
          status: 'succeeded',
          processedAt: new Date()
        },
        { new: true }
      );

      if (payment) {
        const paymentType = payment.metadata?.get('paymentType');

        if (paymentType === 'extra_person_charges') {
          // Handle extra person charges payment atomically
          const chargeDetails = payment.metadata?.get('chargeDetails');
          if (chargeDetails) {
            const charges = JSON.parse(chargeDetails);

            // For each charge, try to update existing or push new
            for (const charge of charges) {
              // First try to update existing charge
              const updatedBooking = await Booking.findOneAndUpdate(
                {
                  _id: payment.bookingId,
                  'extraPersonCharges.personId': charge.personId
                },
                {
                  $set: {
                    'extraPersonCharges.$.paymentStatus': 'paid',
                    'extraPersonCharges.$.stripePaymentId': paymentIntentId
                  }
                },
                { new: true }
              );

              // If no existing charge found, push new one
              if (!updatedBooking) {
                await Booking.findByIdAndUpdate(
                  payment.bookingId,
                  {
                    $push: {
                      extraPersonCharges: {
                        personId: charge.personId,
                        baseCharge: charge.amount,
                        totalCharge: charge.amount,
                        currency: payment.currency,
                        description: charge.description || 'Extra person charge',
                        paymentStatus: 'paid',
                        stripePaymentId: paymentIntentId,
                        paidAt: new Date()
                      }
                    }
                  },
                  { new: true }
                );
              }
            }
          }
        } else if (paymentType === 'settlement') {
          // Handle settlement payment atomically
          const settlementId = payment.metadata?.get('settlementId');
          if (settlementId) {
            const Settlement = (await import('../models/Settlement.js')).default;

            // Push payment and read back to compute status
            const settlement = await Settlement.findByIdAndUpdate(
              settlementId,
              {
                $push: {
                  payments: {
                    paymentId: payment._id,
                    stripePaymentIntentId: paymentIntentId,
                    amount: payment.amount,
                    method: 'stripe',
                    paidBy: payment.metadata?.get('paidBy'),
                    paidAt: new Date()
                  }
                }
              },
              { new: true }
            );

            if (settlement) {
              // Compute and update status atomically
              const totalPaid = settlement.payments.reduce((sum, p) => sum + p.amount, 0);
              const remainingBalance = settlement.finalAmount - totalPaid;

              const statusUpdate = {
                outstandingBalance: Math.max(0, remainingBalance)
              };
              if (remainingBalance <= 0) {
                statusUpdate.status = 'completed';
                statusUpdate.completedAt = new Date();
              } else {
                statusUpdate.status = 'partial';
              }

              await Settlement.findByIdAndUpdate(settlementId, { $set: statusUpdate },
                { new: true });
            }
          }
        } else {
          // Standard booking payment
          await Booking.findByIdAndUpdate(payment.bookingId, {
            status: 'confirmed',
            paymentStatus: 'paid',
            stripePaymentId: paymentIntentId
          },
            { new: true }
          );
        }
      }

      res.json({
        status: 'success',
        data: {
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            paymentType: paymentIntent.metadata?.paymentType || 'booking'
          }
        }
      });
    } else {
      throw new ApplicationError('Payment has not been completed', 400);
    }
  })
);

/**
 * @swagger
 * /payments/extra-person-charges/intent:
 *   post:
 *     summary: Create payment intent for extra person charges
 *     tags: [Payments]
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
 *               - extraPersonCharges
 *             properties:
 *               bookingId:
 *                 type: string
 *               extraPersonCharges:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     personId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     description:
 *                       type: string
 *               currency:
 *                 type: string
 *                 default: INR
 *     responses:
 *       200:
 *         description: Payment intent created for extra person charges
 */
router.post('/extra-person-charges/intent',
  authenticate,
  ensureTenantContext,
  catchAsync(async (req, res) => {
    const { bookingId, extraPersonCharges, currency = 'INR' } = req.body;

    // Get booking
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      throw new ApplicationError('Booking not found', 404);
    }

    // Check permissions - only admin/staff can create extra person charge payments
    if (!['admin', 'staff'].includes(req.user.role)) {
      throw new ApplicationError('Only admin and staff can process extra person charges', 403);
    }

    // Calculate total extra person charges
    const totalExtraCharges = extraPersonCharges.reduce((sum, charge) => sum + charge.amount, 0);

    if (totalExtraCharges <= 0) {
      throw new ApplicationError('Extra person charges must be greater than 0', 400);
    }

    // Support idempotency key to prevent duplicate payment intents
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    const stripeOptions = idempotencyKey ? { idempotencyKey } : {};

    // Create Stripe Payment Intent (with circuit breaker)
    const paymentIntent = await stripeBreaker.execute(
      () => requireStripe().paymentIntents.create({
        amount: Math.round(totalExtraCharges * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          bookingId: bookingId,
          paymentType: 'extra_person_charges',
          processedBy: req.user._id.toString(),
          bookingNumber: booking.bookingNumber,
          extraPersonCount: extraPersonCharges.length.toString()
        },
        description: `Extra person charges for booking ${booking.bookingNumber}`,
        automatic_payment_methods: {
          enabled: true,
        },
      }, stripeOptions),
      () => { throw new Error('Payment service temporarily unavailable. Please try again.'); }
    );

    // Create payment record
    await Payment.create({
      bookingId,
      hotelId: booking.hotelId,
      stripePaymentIntentId: paymentIntent.id,
      amount: totalExtraCharges,
      currency: currency.toUpperCase(),
      status: 'pending',
      paymentMethod: 'card',
      metadata: new Map([
        ['paymentType', 'extra_person_charges'],
        ['processedBy', req.user._id.toString()],
        ['extraPersonCount', extraPersonCharges.length.toString()],
        ['chargeDetails', JSON.stringify(extraPersonCharges)]
      ])
    });

    res.json({
      status: 'success',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalExtraCharges,
        currency: currency.toUpperCase()
      }
    });
  })
);

/**
 * @swagger
 * /payments/settlement/intent:
 *   post:
 *     summary: Create payment intent for settlement
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - settlementId
 *               - amount
 *             properties:
 *               settlementId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: INR
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment intent created for settlement
 */
router.post('/settlement/intent',
  authenticate,
  ensureTenantContext,
  ensurePropertyAccess,
  catchAsync(async (req, res) => {
    const { settlementId, amount, currency = 'INR', description = '' } = req.body;

    // Import Settlement model
    const Settlement = (await import('../models/Settlement.js')).default;

    // Get settlement with full booking details including hotel
    const settlement = await Settlement.findById(settlementId).populate({
      path: 'bookingId',
      populate: { path: 'hotelId' }
    }).lean();

    if (!settlement) {
      throw new ApplicationError('Settlement not found', 404);
    }

    // CRITICAL FIX: Multi-property validation using checkPropertyAccess
    const { checkPropertyAccess } = await import('../middleware/propertyAccess.js');
    const hasAccess = await checkPropertyAccess(
      req.user._id,
      settlement.bookingId.hotelId._id,
      req.user
    );

    // Check permissions - only admin/staff with property access or booking owner
    const isBookingOwner = settlement.bookingId.userId.toString() === req.user._id.toString();
    const isStaffWithAccess = ['admin', 'staff'].includes(req.user.role) && hasAccess;

    if (!isBookingOwner && !isStaffWithAccess) {
      throw new ApplicationError('You do not have permission to pay this settlement', 403);
    }

    if (amount <= 0) {
      throw new ApplicationError('Settlement amount must be greater than 0', 400);
    }

    // CRITICAL FIX: Proper rounding for INR (smallest unit = paisa = 1/100 rupee)
    // Stripe expects amount in smallest currency unit (paisa for INR)
    const amountInPaisa = Math.round(amount * 100);

    // Support idempotency key to prevent duplicate payment intents
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    const stripeOptions = idempotencyKey ? { idempotencyKey } : {};

    // Create Stripe Payment Intent (with circuit breaker)
    const paymentIntent = await stripeBreaker.execute(
      () => requireStripe().paymentIntents.create({
        amount: amountInPaisa,
        currency: currency.toLowerCase(),
        metadata: {
          settlementId: settlementId,
          bookingId: settlement.bookingId._id.toString(),
          paymentType: 'settlement',
          paidBy: req.user._id.toString(),
          bookingNumber: settlement.bookingId.bookingNumber
        },
        description: description || `Settlement payment for booking ${settlement.bookingId.bookingNumber}`,
        automatic_payment_methods: {
          enabled: true,
        },
      }, stripeOptions),
      () => { throw new Error('Payment service temporarily unavailable. Please try again.'); }
    );

    // Create payment record
    await Payment.create({
      bookingId: settlement.bookingId._id,
      hotelId: settlement.bookingId.hotelId,
      stripePaymentIntentId: paymentIntent.id,
      amount: amount,
      currency: currency.toUpperCase(),
      status: 'pending',
      paymentMethod: 'card',
      metadata: new Map([
        ['paymentType', 'settlement'],
        ['settlementId', settlementId],
        ['paidBy', req.user._id.toString()]
      ])
    });

    res.json({
      status: 'success',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency: currency.toUpperCase()
      }
    });
  })
);

/**
 * @swagger
 * /payments/refund:
 *   post:
 *     summary: Create refund
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund created successfully
 */
router.post('/refund',
  authenticate,
  ensureTenantContext,
  catchAsync(async (req, res) => {
    const { paymentIntentId, amount, reason } = req.body;

    if (!paymentIntentId) {
      throw new ApplicationError('Payment Intent ID is required', 400);
    }

    // Find payment record
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId })
      .populate('bookingId');

    if (!payment) {
      throw new ApplicationError('Payment not found', 404);
    }

    // Check permissions (admin/staff or booking owner)
    if (req.user.role === 'guest' && 
        payment.bookingId.userId.toString() !== req.user._id.toString()) {
      throw new ApplicationError('You do not have permission to refund this payment', 403);
    }

    // Create refund in Stripe (with circuit breaker)
    const refund = await stripeBreaker.execute(
      () => requireStripe().refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
        reason: reason || 'requested_by_customer',
        metadata: {
          bookingId: payment.bookingId._id.toString(),
          refundedBy: req.user._id.toString()
        }
      }),
      () => { throw new Error('Payment service temporarily unavailable. Please try again.'); }
    );

    // Update payment record atomically
    const newStatus = refund.amount === payment.amount * 100 ? 'refunded' : 'partially_refunded';
    await Payment.findByIdAndUpdate(
      payment._id,
      {
        $push: {
          refunds: {
            stripeRefundId: refund.id,
            amount: refund.amount / 100,
            reason: refund.reason
          }
        },
        $set: { status: newStatus }
      },
      { new: true }
    );

    // Update booking status
    await Booking.findByIdAndUpdate(payment.bookingId._id, {
      paymentStatus: newStatus
    },
      { new: true }
    );

    res.json({
      status: 'success',
      data: {
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status
        }
      }
    });
  })
);

// Food ordering payment methods

// Process room charge payment for food orders
router.post('/room-charge', authenticate, ensureTenantContext, catchAsync(async (req, res) => {
  const { orderId, amount, currency = 'INR', roomNumber, bookingId, items } = req.body;

  if (!amount || !bookingId) {
    throw new ApplicationError('Amount and booking ID are required', 400);
  }

  // Verify booking exists and check permissions (lean read)
  const bookingCheck = await Booking.findById(bookingId).lean();
  if (!bookingCheck) {
    throw new ApplicationError('Booking not found', 404);
  }

  if (req.user.role === 'guest' && bookingCheck.userId.toString() !== req.user._id.toString()) {
    throw new ApplicationError('Access denied', 403);
  }

  const reference = `RC-${Date.now()}`;
  const paymentData = {
    method: 'room_charge',
    status: 'paid',
    paymentDetails: { roomChargeReference: reference, roomNumber, bookingId }
  };

  // Atomic POS order update
  if (orderId) {
    await POSOrder.findByIdAndUpdate(orderId, { $set: { payment: paymentData } },
      { new: true });
  }

  const serviceCharge = {
    type: 'service_charge',
    amount: parseFloat(amount),
    description: `Room service order - ${items?.length || 0} items`,
    appliedBy: {
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role === 'guest' ? 'staff' : req.user.role
    }
  };

  // Atomic booking update: push adjustment and increment totalAmount
  await Booking.findByIdAndUpdate(
    bookingId,
    {
      $push: { 'settlementTracking.adjustments': serviceCharge },
      $inc: { totalAmount: parseFloat(amount) }
    },
    { new: true }
  );

  res.json({
    success: true,
    message: 'Amount added to room charges successfully',
    data: { transactionId: reference, amount, currency, paymentMethod: 'room_charge', status: 'paid' }
  });
}));

// Process cash on delivery for food orders
router.post('/cash-on-delivery', authenticate, ensureTenantContext, catchAsync(async (req, res) => {
  const { orderId, amount, currency = 'INR', roomNumber } = req.body;

  if (!amount) {
    throw new ApplicationError('Amount is required', 400);
  }

  const reference = `COD_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const paymentData = {
    method: 'cash',
    status: 'pending',
    paymentDetails: { reference, deliveryAddress: roomNumber ? `Room ${roomNumber}` : 'Guest location' }
  };

  // Atomic POS order update
  if (orderId) {
    await POSOrder.findByIdAndUpdate(orderId, { $set: { payment: paymentData } },
      { new: true });
  }

  res.json({
    success: true,
    message: 'Cash on delivery order created successfully',
    data: { transactionId: reference, amount: parseFloat(amount), currency, paymentMethod: 'cash', status: 'pending' }
  });
}));

export default router;