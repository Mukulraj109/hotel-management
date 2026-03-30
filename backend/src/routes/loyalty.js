import express from 'express';
import Loyalty from '../models/Loyalty.js';
import Offer from '../models/Offer.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { ensureTenantContext } from '../middleware/tenantIsolation.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { validate, schemas } from '../middleware/validation.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Helper to check tier hierarchy (replicates model logic for use with lean docs)
const TIER_VALUES = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
function getTierValue(tier) {
  return TIER_VALUES[tier] || 0;
}

// Helper to check if a lean offer doc is currently valid
function isOfferValid(offer) {
  const now = new Date();
  if (!offer.isActive) return false;
  if (offer.validFrom && now < new Date(offer.validFrom)) return false;
  if (offer.validUntil && now > new Date(offer.validUntil)) return false;
  if (offer.maxRedemptions && offer.currentRedemptions >= offer.maxRedemptions) return false;
  return true;
}

// Helper to check if a user can redeem a lean offer doc
function canRedeemOffer(offer, userTier, userPoints) {
  if (!isOfferValid(offer)) return false;
  if (getTierValue(userTier) < getTierValue(offer.minTier)) return false;
  if (userPoints < offer.pointsRequired) return false;
  return true;
}

// Apply authentication, tenant isolation, and property access to all loyalty routes
router.use(authenticate);
router.use(ensureTenantContext);
router.use(ensurePropertyAccess);
router.use(authorizePolicy('loyalty', 'baseAccess'));

/**
 * @swagger
 * /loyalty/dashboard:
 *   get:
 *     summary: Get user loyalty dashboard
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loyalty dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         points:
 *                           type: number
 *                         tier:
 *                           type: string
 *                         nextTier:
 *                           type: string
 *                         pointsToNextTier:
 *                           type: number
 *                     recentTransactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Loyalty'
 *                     availableOffers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Offer'
 */
router.get('/dashboard', catchAsync(async (req, res) => {
  // Get user with loyalty data
  const user = await User.findById(req.user._id).select('+loyalty').lean();

  if (!user || !user.loyalty) {
    throw new ApplicationError('Loyalty data not found for user', 404);
  }

  // Get recent transactions (scoped to user)
  const recentTransactions = await Loyalty.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('bookingId', 'bookingNumber checkIn checkOut totalAmount')
    .populate('offerId', 'title category')
    .populate('hotelId', 'name').lean();

  // FIX: Use paginated query instead of static method that returns up to 1000 docs
  const userTier = user.loyalty.tier;
  const hotelId = user.hotelId;
  const tierValue = getTierValue(userTier);
  const eligibleTiers = Object.entries(TIER_VALUES)
    .filter(([, v]) => v <= tierValue)
    .map(([k]) => k);

  const availableOffers = await Offer.find({
    hotelId,
    isActive: true,
    minTier: { $in: eligibleTiers },
    $or: [
      { validUntil: { $gt: new Date() } },
      { validUntil: { $exists: false } },
      { validUntil: null }
    ]
  })
    .sort({ pointsRequired: 1, createdAt: -1 })
    .limit(20)
    .lean();

  res.json({
    status: 'success',
    data: {
      user: {
        points: user.loyalty.points,
        tier: user.loyalty.tier,
        nextTier: getNextTier(user.loyalty.points),
        pointsToNextTier: getPointsToNextTier(user.loyalty.points)
      },
      recentTransactions,
      availableOffers
    }
  });
}));

/**
 * @swagger
 * /loyalty/offers:
 *   get:
 *     summary: Get available loyalty offers
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [room, dining, spa, transport, general]
 *         description: Filter offers by category
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Available offers
 */
// FIX: Added pagination to the offers endpoint
router.get('/offers', catchAsync(async (req, res) => {
  const { category, page = 1, limit = 20 } = req.query;
  const parsedPage = parseInt(page) || 1;
  const parsedLimit = Math.min(parseInt(limit) || 20, 100);
  const skip = (parsedPage - 1) * parsedLimit;

  const user = await User.findById(req.user._id).select('+loyalty').lean();

  if (!user || !user.loyalty) {
    throw new ApplicationError('Loyalty data not found for user', 404);
  }

  // FIX: Build proper query with hotelId and tier-based filtering instead of broken $lte string compare
  const userTier = user.loyalty.tier;
  const tierValue = getTierValue(userTier);
  const eligibleTiers = Object.entries(TIER_VALUES)
    .filter(([, v]) => v <= tierValue)
    .map(([k]) => k);

  const query = {
    hotelId: user.hotelId,
    isActive: true,
    minTier: { $in: eligibleTiers },
    $or: [
      { validUntil: { $gt: new Date() } },
      { validUntil: { $exists: false } },
      { validUntil: null }
    ]
  };

  if (category) {
    query.category = category;
  }

  const [offers, total] = await Promise.all([
    Offer.find(query)
      .sort({ pointsRequired: 1, createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate('hotelId', 'name')
      .lean(),
    Offer.countDocuments(query)
  ]);

  res.json({
    status: 'success',
    data: {
      offers,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit) || 1,
        totalItems: total,
        itemsPerPage: parsedLimit,
        hasNext: parsedPage * parsedLimit < total,
        hasPrev: parsedPage > 1
      }
    }
  });
}));

/**
 * @swagger
 * /loyalty/transactions:
 *   get:
 *     summary: Get user loyalty transaction history
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [earned, redeemed, expired]
 *         description: Filter by transaction type
 *     responses:
 *       200:
 *         description: Transaction history
 */
router.get('/transactions', catchAsync(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const parsedLimit = Math.min(parseInt(limit) || 20, 100);
  const parsedPage = parseInt(page) || 1;
  const skip = (parsedPage - 1) * parsedLimit;

  // Build query - FIX: Include hotelId for tenant isolation
  const query = { userId: req.user._id };
  if (req.user.hotelId) {
    query.hotelId = req.user.hotelId;
  }
  if (type) {
    query.type = type;
  }

  // Get transactions with pagination
  const [transactions, total] = await Promise.all([
    Loyalty.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate('bookingId', 'bookingNumber checkIn checkOut totalAmount')
      .populate('offerId', 'title category')
      .populate('hotelId', 'name').lean(),
    Loyalty.countDocuments(query)
  ]);

  res.json({
    status: 'success',
    data: {
      transactions,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit) || 1,
        totalItems: total,
        itemsPerPage: parsedLimit,
        hasNext: parsedPage * parsedLimit < total,
        hasPrev: parsedPage > 1
      }
    }
  });
}));

/**
 * @swagger
 * /loyalty/redeem:
 *   post:
 *     summary: Redeem points for an offer
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - offerId
 *             properties:
 *               offerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Points redeemed successfully
 *       400:
 *         description: Invalid redemption request
 */
router.post('/redeem',
  validate(schemas.redeemPoints),
  catchAsync(async (req, res) => {
    logger.debug('Loyalty redeem - starting redemption process', { userId: req.user?._id });

    const { offerId } = req.body;

    // FIX: Do NOT use .lean() -- we need Mongoose documents for instance methods
    const offer = await Offer.findById(offerId);
    if (!offer) {
      logger.debug('Offer not found for redemption', { offerId });
      throw new ApplicationError('Offer not found', 404);
    }
    logger.debug('Offer found for redemption', { offerId, title: offer.title, pointsRequired: offer.pointsRequired });

    // FIX: Do NOT use .lean() -- we need the user document for .save() and .updateLoyaltyTier()
    const user = await User.findById(req.user._id).select('+loyalty');
    if (!user || !user.loyalty) {
      throw new ApplicationError('User loyalty data not found', 404);
    }
    logger.debug('User loyalty status', { userFound: !!user, points: user.loyalty.points, tier: user.loyalty.tier });

    // Validate redemption using the Mongoose document instance method
    logger.debug('Validating redemption eligibility', {
      userPoints: user.loyalty.points,
      userTier: user.loyalty.tier,
      pointsRequired: offer.pointsRequired,
      minTier: offer.minTier,
      isActive: offer.isActive,
      isValid: offer.isValid
    });

    const redeemable = offer.canRedeem(user.loyalty.tier, user.loyalty.points);

    if (!redeemable) {
      const now = new Date();
      logger.debug('Cannot redeem offer', {
        pointsCheck: user.loyalty.points >= offer.pointsRequired,
        activeCheck: offer.isActive,
        timeValid: (!offer.validUntil || now <= offer.validUntil),
        redemptionsAvailable: (!offer.maxRedemptions || offer.currentRedemptions < offer.maxRedemptions)
      });

      throw new ApplicationError('Cannot redeem this offer. Check tier requirements and available points.', 400);
    }

    // FIX: Use atomic $inc to prevent race conditions on concurrent redemptions.
    // This ensures two simultaneous requests cannot both deduct points from the same balance.
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        'loyalty.points': { $gte: offer.pointsRequired }
      },
      { $inc: { 'loyalty.points': -offer.pointsRequired } },
      { new: true, select: '+loyalty' }
    );

    if (!updatedUser) {
      throw new ApplicationError('Insufficient points or concurrent redemption detected. Please try again.', 400);
    }

    // Update tier based on new points
    updatedUser.updateLoyaltyTier();
    await updatedUser.save();

    // Atomically increment offer redemption count
    const updatedOffer = await Offer.findOneAndUpdate(
      {
        _id: offer._id,
        $or: [
          { maxRedemptions: { $exists: false } },
          { maxRedemptions: null },
          { $expr: { $lt: ['$currentRedemptions', '$maxRedemptions'] } }
        ]
      },
      { $inc: { currentRedemptions: 1 } },
      { new: true }
    );

    if (!updatedOffer) {
      // Rollback: restore user points since offer couldn't be redeemed
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'loyalty.points': offer.pointsRequired }
      });
      throw new ApplicationError('This offer has reached its maximum redemption limit.', 400);
    }

    // Create redemption transaction
    const loyaltyTransaction = await Loyalty.create({
      userId: req.user._id,
      hotelId: offer.hotelId,
      type: 'redeemed',
      points: -offer.pointsRequired,
      description: `Redeemed: ${offer.title}`,
      offerId: offer._id
    });
    logger.debug('Loyalty transaction created', { transactionId: loyaltyTransaction._id });

    // Populate transaction data
    await loyaltyTransaction.populate([
      { path: 'offerId', select: 'title category' },
      { path: 'hotelId', select: 'name' }
    ]);

    res.json({
      status: 'success',
      data: {
        message: 'Points redeemed successfully',
        transaction: loyaltyTransaction,
        remainingPoints: updatedUser.loyalty.points,
        newTier: updatedUser.loyalty.tier
      }
    });
  })
);

/**
 * @swagger
 * /loyalty/history:
 *   get:
 *     summary: Get loyalty transaction history
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [earned, redeemed, expired, bonus]
 *         description: Filter by transaction type
 *     responses:
 *       200:
 *         description: Transaction history
 */
router.get('/history', catchAsync(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;

  const options = {
    page: parseInt(page) || 1,
    limit: Math.min(parseInt(limit) || 20, 100)
  };

  if (type) {
    options.type = type;
  }

  const result = await Loyalty.getUserHistory(req.user._id, options);

  res.json({
    status: 'success',
    data: result
  });
}));

/**
 * @swagger
 * /loyalty/points:
 *   get:
 *     summary: Get user's current points and tier
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's loyalty status
 */
router.get('/points', catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select('+loyalty').lean();

  if (!user || !user.loyalty) {
    throw new ApplicationError('Loyalty data not found for user', 404);
  }

  // Get active points (not expired)
  const activePoints = await Loyalty.getUserActivePoints(req.user._id);

  res.json({
    status: 'success',
    data: {
      totalPoints: user.loyalty.points,
      activePoints,
      tier: user.loyalty.tier,
      nextTier: getNextTier(user.loyalty.points),
      pointsToNextTier: getPointsToNextTier(user.loyalty.points)
    }
  });
}));

/**
 * @swagger
 * /loyalty/offers/{offerId}:
 *   get:
 *     summary: Get specific offer details
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offer details
 *       404:
 *         description: Offer not found
 */
router.get('/offers/:offerId', catchAsync(async (req, res) => {
  const { offerId } = req.params;

  // FIX: Use .lean() and local helper instead of instance method
  const offer = await Offer.findById(offerId)
    .populate('hotelId', 'name').lean();

  if (!offer) {
    throw new ApplicationError('Offer not found', 404);
  }

  const user = await User.findById(req.user._id).select('+loyalty').lean();

  if (!user || !user.loyalty) {
    throw new ApplicationError('Loyalty data not found for user', 404);
  }

  // FIX: Use local helper function instead of instance method on lean doc
  const redeemable = canRedeemOffer(offer, user.loyalty.tier, user.loyalty.points);

  res.json({
    status: 'success',
    data: {
      offer,
      canRedeem: redeemable,
      userPoints: user.loyalty.points,
      userTier: user.loyalty.tier
    }
  });
}));

// Tier thresholds - single source of truth matching User.updateLoyaltyTier()
const TIER_THRESHOLDS = {
  platinum: 10000,
  gold: 5000,
  silver: 1000,
  bronze: 0
};

// Helper functions
function getNextTier(points) {
  // FIX: Return the actual next tier, not the current tier.
  // Previously returned 'bronze' for <100 pts (which IS the current tier, not next).
  if (points >= TIER_THRESHOLDS.platinum) return null; // already at max
  if (points >= TIER_THRESHOLDS.gold) return 'platinum';
  if (points >= TIER_THRESHOLDS.silver) return 'gold';
  return 'silver'; // bronze users' next tier is silver
}

function getPointsToNextTier(points) {
  if (points >= TIER_THRESHOLDS.platinum) return 0;
  if (points >= TIER_THRESHOLDS.gold) return TIER_THRESHOLDS.platinum - points;
  if (points >= TIER_THRESHOLDS.silver) return TIER_THRESHOLDS.gold - points;
  return TIER_THRESHOLDS.silver - points;
}

export default router;
