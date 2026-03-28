import express from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { catchAsync } from '../utils/catchAsync.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import { validate } from '../middleware/validation.js';
import OfferFavorite from '../models/OfferFavorite.js';

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

// Apply authentication to all routes
router.use(authenticate);
router.use(ensurePropertyAccess);

/**
 * Get user's favorite offers
 */
router.get('/', authorizePolicy('offerFavorites', 'memberAccess'), catchAsync(async (req, res) => {
    const userId = req.user._id;
    const {
        page = 1,
        limit = 20,
        category,
        type,
        sortBy = 'createdAt',
        sortOrder = -1
    } = req.query;

    const clampedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const pageNum = Math.max(parseInt(page) || 1, 1);

    const result = await OfferFavorite.getUserFavorites(userId, {
        page: pageNum,
        limit: clampedLimit,
        category,
        type,
        sortBy,
        sortOrder: parseInt(sortOrder) || -1
    });

    res.status(200).json({
        status: 'success',
        data: result.favorites,
        pagination: result.pagination
    });
}));

/**
 * Add offer to favorites
 */
router.post('/:offerId', authorizePolicy('offerFavorites', 'memberAccess'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
    const userId = req.user._id;
    const { offerId } = req.params;
    const hotelId = req.user.hotelId;
    const { notifyOnExpiry, notifyOnUpdate, notes } = req.body;

    // Check if already favorited
    const existing = await OfferFavorite.findOne({ userId, offerId }).lean();
    if (existing) {
        return res.status(409).json({
            status: 'error',
            message: 'Offer is already in favorites'
        });
    }

    const favorite = await OfferFavorite.create({
        userId,
        offerId,
        hotelId,
        notifyOnExpiry: notifyOnExpiry !== undefined ? notifyOnExpiry : true,
        notifyOnUpdate: notifyOnUpdate !== undefined ? notifyOnUpdate : false,
        notes
    });

    const populated = await OfferFavorite.findById(favorite._id).populate('offerId').lean();

    res.status(201).json({
        status: 'success',
        message: 'Offer added to favorites',
        data: populated
    });
}));

/**
 * Remove offer from favorites
 */
router.delete('/:offerId', authorizePolicy('offerFavorites', 'memberAccess'), validate(mutationBaselineSchema), catchAsync(async (req, res) => {
    const userId = req.user._id;
    const { offerId } = req.params;

    const deleted = await OfferFavorite.findOneAndDelete({ userId, offerId });

    if (!deleted) {
        return res.status(404).json({
            status: 'error',
            message: 'Offer not found in favorites'
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'Offer removed from favorites'
    });
}));

export default router;