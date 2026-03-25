import express from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import { validate, schemas } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { ensurePropertyAccess } from '../middleware/propertyAccess.js';
import { authorizePolicy } from '../middleware/rbacPolicy.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

function setAuthCookies(res, accessToken, refreshToken, csrfToken) {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000
  });
}

function clearAuthCookies(res) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  res.clearCookie('csrfToken');
}

async function createRefreshToken(userId) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const family = uuidv4();

  await RefreshToken.create({
    tokenHash,
    userId,
    family,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  return { rawToken, family };
}
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many failed attempts, please try again after 1 hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();
const mutationBaselineSchema = Joi.object({}).unknown(true).optional();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [guest, staff, admin]
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.post('/register', authLimiter, validate(schemas.register), catchAsync(async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    throw new ApplicationError('User with this email already exists', 400);
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: 'guest'
  });

  // Generate access token
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, hotelId: user.hotelId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // Generate refresh token
  const { rawToken: refreshToken } = await createRefreshToken(user._id);
  const csrfToken = crypto.randomBytes(32).toString('hex');

  // Set httpOnly cookies
  setAuthCookies(res, accessToken, refreshToken, csrfToken);

  // Send welcome email (don't wait for it to complete)
  emailService.sendWelcomeEmail(user).catch(error => {
    logger.error('Failed to send welcome email', { userId: user._id, error: error.message });
  });

  res.status(201).json({
    status: 'success',
    token: accessToken,
    user
  });
}));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.post('/login', authLimiter, strictAuthLimiter, validate(schemas.login), catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Check for user and password
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.comparePassword(password))) {
    throw new ApplicationError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new ApplicationError('Account has been deactivated', 401);
  }

  // Update last login atomically
  await User.findByIdAndUpdate(user._id, { $set: { lastLogin: new Date() } },
    { new: true });

  // Generate access token
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, hotelId: user.hotelId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // Generate refresh token
  const { rawToken: refreshToken } = await createRefreshToken(user._id);
  const csrfToken = crypto.randomBytes(32).toString('hex');

  // Set httpOnly cookies
  setAuthCookies(res, accessToken, refreshToken, csrfToken);

  // Remove password from output
  user.password = undefined;

  res.json({
    status: 'success',
    token: accessToken,
    user
  });
}));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.get('/me', authenticate, authorizePolicy('auth', 'baseAccess'), catchAsync(async (req, res) => {
  res.json({
    status: 'success',
    user: req.user
  });
}));

/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               preferences:
 *                 type: object
 *                 properties:
 *                   bedType:
 *                     type: string
 *                     enum: [single, double, queen, king]
 *                   floor:
 *                     type: string
 *                   smokingAllowed:
 *                     type: boolean
 *                   other:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch('/profile', authenticate, ensurePropertyAccess, authorizePolicy('auth', 'baseAccess'), validate(schemas.updateProfile), catchAsync(async (req, res) => {
  const { name, phone, preferences } = req.body;
  
  const updateData = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (preferences) updateData.preferences = preferences;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  );

  res.json({
    status: 'success',
    user
  });
}));

/**
 * @swagger
 * /auth/change-password:
 *   patch:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.patch('/change-password', authenticate, ensurePropertyAccess, authorizePolicy('auth', 'baseAccess'), validate(schemas.changePassword), catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw new ApplicationError('Current password is incorrect', 401);
  }

  // Password hashing is handled by the pre-save hook, so we must use save()
  // here. The race window is acceptable because password changes are
  // user-specific and serialized by the authentication check above.
  user.password = newPassword;
  await user.save();

  res.json({
    status: 'success',
    message: 'Password updated successfully'
  });
}));

// Refresh access token using refresh token cookie
router.post('/refresh', validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;

  if (!rawRefreshToken) {
    throw new ApplicationError('No refresh token provided', 401);
  }

  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const storedToken = await RefreshToken.findOne({ tokenHash });

  if (!storedToken) {
    throw new ApplicationError('Invalid refresh token', 401);
  }

  if (storedToken.expiresAt < new Date()) {
    await RefreshToken.deleteOne({ _id: storedToken._id });
    clearAuthCookies(res);
    throw new ApplicationError('Refresh token expired', 401);
  }

  // Replay attack detection: if token was already used, invalidate entire family
  if (storedToken.isUsed) {
    logger.warn('Refresh token replay detected, invalidating family', {
      userId: storedToken.userId,
      family: storedToken.family
    });
    await RefreshToken.deleteMany({ family: storedToken.family });
    clearAuthCookies(res);
    throw new ApplicationError('Token reuse detected. Please login again.', 401);
  }

  // Mark current token as used atomically
  const markedToken = await RefreshToken.findOneAndUpdate(
    { _id: storedToken._id, isUsed: false },
    { $set: { isUsed: true } },
    { new: true }
  );

  // If the atomic update failed, another request already used this token (replay)
  if (!markedToken) {
    logger.warn('Refresh token concurrent reuse detected, invalidating family', {
      userId: storedToken.userId,
      family: storedToken.family
    });
    await RefreshToken.deleteMany({ family: storedToken.family });
    clearAuthCookies(res);
    throw new ApplicationError('Token reuse detected. Please login again.', 401);
  }

  // Verify user still exists and is active
  const user = await User.findById(storedToken.userId).select('+role').lean();
  if (!user || !user.isActive) {
    await RefreshToken.deleteMany({ family: storedToken.family });
    clearAuthCookies(res);
    throw new ApplicationError('User no longer valid', 401);
  }

  // Issue new token pair (same family for rotation tracking)
  const newAccessToken = jwt.sign(
    { id: user._id, role: user.role, hotelId: user.hotelId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
  const newTokenHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');

  await RefreshToken.create({
    tokenHash: newTokenHash,
    userId: user._id,
    family: storedToken.family,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  const csrfToken = crypto.randomBytes(32).toString('hex');
  setAuthCookies(res, newAccessToken, newRawRefreshToken, csrfToken);

  res.json({
    status: 'success',
    user
  });
}));

// Logout -- clear cookies and invalidate refresh token family
router.post('/logout', validate(mutationBaselineSchema), catchAsync(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;

  if (rawRefreshToken) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const storedToken = await RefreshToken.findOne({ tokenHash }).lean();
    if (storedToken) {
      // Invalidate entire token family
      await RefreshToken.deleteMany({ family: storedToken.family });
    }
  }

  clearAuthCookies(res);

  res.json({
    status: 'success',
    message: 'Logged out successfully'
  });
}));

export default router;
