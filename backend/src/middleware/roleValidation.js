import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware to validate user roles
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
export const validateRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.user.role)) {
        throw new ApiError(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = validateRoles(['admin']);

/**
 * Middleware to check if user is admin or manager
 */
export const requireAdminOrManager = validateRoles(['admin', 'manager']);

/**
 * Middleware to check if user is admin, manager, or staff
 */
export const requireStaffOrAbove = validateRoles(['admin', 'manager', 'staff']);

/**
 * Middleware to check hotel ownership
 * Ensures user can only access data from their own hotel
 */
export const validateHotelAccess = (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const userHotelId = req.user.hotelId;

    // Admin can access any hotel
    if (req.user.role === 'admin') {
      return next();
    }

    // Other roles can only access their own hotel
    if (hotelId && userHotelId && hotelId !== userHotelId.toString()) {
      throw new ApiError(403, 'Access denied. You can only access data from your own hotel');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate resource ownership
 * Ensures user can only modify resources they own or have permission to modify
 */
export const validateResourceOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    try {
      const resourceUserId = req.body[resourceUserIdField] || req.params[resourceUserIdField];
      const currentUserId = req.user._id || req.user.id;

      // Admin can modify any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Manager can modify resources in their hotel
      if (req.user.role === 'manager' && req.user.hotelId) {
        return next();
      }

      // User can only modify their own resources
      if (resourceUserId && resourceUserId !== currentUserId.toString()) {
        throw new ApiError(403, 'Access denied. You can only modify your own resources');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default {
  validateRoles,
  requireAdmin,
  requireAdminOrManager,
  requireStaffOrAbove,
  validateHotelAccess,
  validateResourceOwnership
};