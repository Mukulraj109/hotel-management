import express from 'express';
import Loyalty from '../models/Loyalty.js';
import Offer from '../models/Offer.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

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
router.get('/dashboard', authenticate, catchAsync(async (req, res) => {
  // Get user with loyalty data
  const user = await User.findById(req.user._id).select('+loyalty');
  
  // Get recent transactions
  const recentTransactions = await Loyalty.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('bookingId', 'bookingNumber checkIn checkOut totalAmount')
    .populate('offerId', 'title category')
    .populate('hotelId', 'name');
  
  // Get available offers
  const availableOffers = await Offer.getAvailableOffers(
    req.user._id,
    user.loyalty.tier,
    user.hotelId
  );

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
 *     responses:
 *       200:
 *         description: Available offers
 */
router.get('/offers', authenticate, catchAsync(async (req, res) => {
  const { category } = req.query;
  const user = await User.findById(req.user._id).select('+loyalty');
  
  let offers;
  if (category) {
    offers = await Offer.getOffersByCategory(category, user.hotelId);
  } else {
    offers = await Offer.getAvailableOffers(req.user._id, user.loyalty.tier, user.hotelId);
  }

  res.json({
    status: 'success',
    data: offers
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
router.get('/transactions', authenticate, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const skip = (page - 1) * limit;
  
  // Build query
  const query = { userId: req.user._id };
  if (type) {
    query.type = type;
  }
  
  // Get transactions with pagination
  const transactions = await Loyalty.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('bookingId', 'bookingNumber checkIn checkOut totalAmount')
    .populate('offerId', 'title category')
    .populate('hotelId', 'name');
  
  // Get total count
  const total = await Loyalty.countDocuments(query);
  
  res.json({
    status: 'success',
    data: {
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
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
  authenticate, 
  validate(schemas.redeemPoints),
  catchAsync(async (req, res) => {
    const { offerId } = req.body;

    // Get the offer
    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new AppError('Offer not found', 404);
    }

    // Get user with loyalty data
    const user = await User.findById(req.user._id).select('+loyalty');

    // Validate redemption
    if (!offer.canRedeem(user.loyalty.tier, user.loyalty.points)) {
      throw new AppError('Cannot redeem this offer. Check tier requirements and available points.', 400);
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

    // Update user points
    user.loyalty.points -= offer.pointsRequired;
    user.loyalty.updateLoyaltyTier();
    await user.save();

    // Update offer redemption count
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
router.get('/history', authenticate, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit)
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
router.get('/points', authenticate, catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select('+loyalty');
  
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
router.get('/offers/:offerId', authenticate, catchAsync(async (req, res) => {
  const { offerId } = req.params;
  
  const offer = await Offer.findById(offerId)
    .populate('hotelId', 'name');
    
  if (!offer) {
    throw new AppError('Offer not found', 404);
  }

  const user = await User.findById(req.user._id).select('+loyalty');
  const canRedeem = offer.canRedeem(user.loyalty.tier, user.loyalty.points);

  res.json({
    status: 'success',
    data: {
      offer,
      canRedeem,
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
