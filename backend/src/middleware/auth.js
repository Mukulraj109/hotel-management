import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApplicationError } from '../middleware/errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

export const authenticate = catchAsync(async (req, res, next) => {
  // Get token from cookies (primary) or Authorization header (API clients fallback)
  let token;
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApplicationError('You are not logged in! Please log in to get access.', 401));
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Check if user still exists and populate multi-property fields
  const currentUser = await User.findById(decoded.id)
    .select('+role')
    .populate({
      path: 'properties',
      select: 'name address',
      populate: { path: 'totalRooms' }
    })
    .populate({
      path: 'primaryProperty',
      select: 'name address',
      populate: { path: 'totalRooms' }
    });

  if (!currentUser) {
    return next(new ApplicationError('The user belonging to this token does no longer exist.', 401));
  }

  if (!currentUser.isActive) {
    
    return next(new ApplicationError('Your account has been deactivated. Please contact support.', 401));
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    // Flatten the roles array in case it's nested
    const flatRoles = Array.isArray(roles[0]) ? roles[0] : roles;
    logger.debug('Authorization check', { allowedRoles: flatRoles, userRole: req.user.role });
    if (!flatRoles.includes(req.user.role)) {
      return next(new ApplicationError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

export const optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id)
        .select('+role')
        .populate({
          path: 'properties',
          select: 'name address',
          populate: { path: 'totalRooms' }
        })
        .populate({
          path: 'primaryProperty',
          select: 'name address',
          populate: { path: 'totalRooms' }
        });

      if (currentUser && currentUser.isActive) {
        req.user = currentUser;
      }
    } catch (error) {
      // Invalid token, but continue without user
    }
  }

  next();
});
