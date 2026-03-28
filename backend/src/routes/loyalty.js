import express from 'express';
import Loyalty from '../models/Loyalty.js';
import Offer from '../models/Offer.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
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

// Apply authentication and property access to all loyalty routes
router.use(authenticate);
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

  // Build query
  const query = { userId: req.user._id };
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

    // Update user points (now works because user is a Mongoose document)
    user.loyalty.points -= offer.pointsRequired;
    user.updateLoyaltyTier();
    await user.save();

    // Update offer redemption count (now works because offer is a Mongoose document)
    await offer.incrementRedemption();

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
        remainingPoints: user.loyalty.points,
        newTier: user.loyalty.tier
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

// Helper functions
function getNextTier(points) {
  if (points >= 10000) return null;
  if (points >= 5000) return 'platinum';
  if (points >= 1000) return 'gold';
  if (points >= 100) return 'silver';
  return 'bronze';
}

function getPointsToNextTier(points) {
  if (points >= 10000) return 0;
  if (points >= 5000) return 10000 - points;
  if (points >= 1000) return 5000 - points;
  if (points >= 100) return 1000 - points;
  return 100 - points;
}

export default router;
