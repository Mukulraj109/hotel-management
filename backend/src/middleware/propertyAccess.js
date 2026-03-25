import Hotel from '../models/Hotel.js';
import PropertyGroup from '../models/PropertyGroup.js';
import { ApplicationError } from './errorHandler.js';
import { catchAsync } from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

/**
 * Property Access Middleware
 *
 * Ensures users can only access properties they own.
 * Critical for multi-property security and data isolation.
 */

/**
 * Middleware: Ensure user has access to the specified property
 *
 * Checks if hotelId exists in query, params, body, or user object and verifies ownership.
 * Should be used on all property-specific endpoints.
 *
 * @example
 * router.get('/rooms', authenticate, ensurePropertyAccess, getRooms);
 * router.post('/rooms/:hotelId', authenticate, ensurePropertyAccess, createRoom);
 */
export const ensurePropertyAccess = catchAsync(async (req, res, next) => {
  // Extract hotelId from multiple possible sources
  const hotelId = req.params.hotelId ||
                  req.query.hotelId ||
                  req.body.hotelId ||
                  req.user?.hotelId;

  // If no hotelId specified, allow (will be filtered in controller)
  if (!hotelId) {
    return next();
  }

  // Admin users can view (GET) all properties for multi-property management
  // But can only modify (POST/PUT/DELETE) properties they own/have access to
  const isReadOnlyRequest = req.method === 'GET';
  const isAdmin = req.user?.role === 'admin';

  if (isReadOnlyRequest && isAdmin) {
    // Admin read access - still verify the admin has this property in their scope
    const property = await Hotel.findById(hotelId).lean();
    if (!property) {
      logger.warn(`Property not found: hotelId=${hotelId}, user=${req.user._id}, endpoint=${req.path}`);
      throw new ApplicationError(
        `Hotel with ID ${hotelId} not found in the system.`,
        404
      );
    }

    const hotelIdStr = hotelId.toString();
    const userProperties = req.user.properties?.map(p => p.toString()) || [];
    const allowedProperties = req.user.multiPropertyAccess?.allowedProperties?.map(p => p.toString()) || [];
    const primaryProperty = req.user.primaryProperty?.toString();
    const userHotelId = req.user.hotelId?.toString();

    const isOwner = property.ownerId?.toString() === req.user._id.toString() ||
                    property.createdBy?.toString() === req.user._id.toString();

    const hasPropertyAccess = isOwner ||
      userProperties.includes(hotelIdStr) ||
      allowedProperties.includes(hotelIdStr) ||
      primaryProperty === hotelIdStr ||
      userHotelId === hotelIdStr;

    if (!hasPropertyAccess) {
      logger.debug(
        `Admin access denied to property: hotelId=${hotelIdStr}, user=${req.user._id}, ` +
        `owned=${isOwner}, inProperties=${userProperties.includes(hotelIdStr)}, ` +
        `inAllowed=${allowedProperties.includes(hotelIdStr)}, primary=${primaryProperty}, userHotel=${userHotelId}`
      );
      throw new ApplicationError(
        `Access denied. You do not have permission to access hotel ${hotelIdStr}. ` +
        `Admin must own the property or have it in their multi-property access list.`,
        403
      );
    }

    req.property = property;
    return next();
  }

  // Check if user owns this property OR has it in their properties array
  const property = await Hotel.findOne({
    _id: hotelId,
    $or: [
      { ownerId: req.user._id },
      { createdBy: req.user._id }
    ]
  }).lean();

  // If user owns the property, allow access
  if (property) {
    req.property = property;
    return next();
  }

  // Check if property exists at all (for multi-property users)
  const propertyExists = await Hotel.findById(hotelId).lean();

  if (!propertyExists) {
    logger.warn(
      `Property access denied - property not found: hotelId=${hotelId}, ` +
      `user=${req.user._id}, role=${req.user.role}, method=${req.method}, path=${req.path}`
    );
    throw new ApplicationError(
      `Hotel with ID ${hotelId} not found in the system.`,
      404
    );
  }

  // Check if user has this property in their properties array or multiPropertyAccess
  const hotelIdStr = hotelId.toString();
  const userProperties = req.user.properties?.map(p => p.toString()) || [];
  const allowedProperties = req.user.multiPropertyAccess?.allowedProperties?.map(p => p.toString()) || [];
  const primaryProperty = req.user.primaryProperty?.toString();
  const userHotelId = req.user.hotelId?.toString();

  const hasAccess =
    userProperties.includes(hotelIdStr) ||
    allowedProperties.includes(hotelIdStr) ||
    primaryProperty === hotelIdStr ||
    userHotelId === hotelIdStr;

  if (!hasAccess) {
    logger.debug(
      `Property access denied for non-admin user: hotelId=${hotelIdStr}, user=${req.user._id}, ` +
      `role=${req.user.role}, inProperties=${userProperties.includes(hotelIdStr)}, ` +
      `inAllowed=${allowedProperties.includes(hotelIdStr)}`
    );
    throw new ApplicationError(
      `Access denied. You do not have permission to access hotel ${hotelIdStr}.`,
      403
    );
  }

  // User has access through multi-property, attach property
  req.property = propertyExists;

  next();
});

/**
 * Middleware: Ensure user has access to the property group
 *
 * Checks if user owns the specified property group.
 * Used on property group management endpoints.
 *
 * @example
 * router.put('/property-groups/:id', authenticate, ensureGroupAccess, updateGroup);
 */
export const ensureGroupAccess = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next();
  }

  // Check if user owns this property group
  const group = await PropertyGroup.findOne({
    _id: id,
    ownerId: req.user._id
  }).lean();

  if (!group) {
    throw new ApplicationError(
      'Access denied. You do not have permission to access this property group.',
      403
    );
  }

  // Attach group to request for use in controller
  req.propertyGroup = group;

  next();
});

/**
 * Middleware: Filter query to only user's properties
 *
 * Automatically adds property ownership filter to database queries.
 * Ensures users only see their own properties' data.
 *
 * Usage: Add to routes that should be automatically filtered
 *
 * @example
 * router.get('/bookings', authenticate, filterByUserProperties, getBookings);
 */
export const filterByUserProperties = catchAsync(async (req, res, next) => {
  // Extract hotelId from multiple possible sources
  const hotelId = req.params.hotelId ||
                  req.query.hotelId ||
                  req.body.hotelId;

  // If hotelId specified, verify access
  if (hotelId) {
    // First check if user owns the property
    const hasOwnership = await Hotel.exists({
      _id: hotelId,
      $or: [
        { ownerId: req.user._id },
        { createdBy: req.user._id }
      ]
    });

    if (hasOwnership) {
      return next();
    }

    // Check if user has access through multi-property
    const hotelIdStr = hotelId.toString();
    const userProperties = req.user.properties?.map(p => p.toString()) || [];
    const allowedProperties = req.user.multiPropertyAccess?.allowedProperties?.map(p => p.toString()) || [];
    const primaryProperty = req.user.primaryProperty?.toString();
    const userHotelId = req.user.hotelId?.toString();

    const hasAccess =
      userProperties.includes(hotelIdStr) ||
      allowedProperties.includes(hotelIdStr) ||
      primaryProperty === hotelIdStr ||
      userHotelId === hotelIdStr;

    if (!hasAccess) {
      throw new ApplicationError(
        'Access denied. You do not have permission to access this property.',
        403
      );
    }

    // User has access, allow the query
    return next();
  }

  // No hotelId specified - get all user's properties (owned + assigned)
  const ownedProperties = await Hotel.find({
    $or: [
      { ownerId: req.user._id },
      { createdBy: req.user._id }
    ]
  }).select('_id').lean().limit(1000);

  // Combine owned properties with user's assigned properties
  const ownedPropertyIds = ownedProperties.map(p => p._id.toString());
  const assignedPropertyIds = req.user.properties?.map(p => p.toString()) || [];
  const allowedPropertyIds = req.user.multiPropertyAccess?.allowedProperties?.map(p => p.toString()) || [];

  const allPropertyIds = [
    ...new Set([
      ...ownedPropertyIds,
      ...assignedPropertyIds,
      ...allowedPropertyIds,
      ...(req.user.primaryProperty ? [req.user.primaryProperty.toString()] : []),
      ...(req.user.hotelId ? [req.user.hotelId.toString()] : [])
    ])
  ];

  if (allPropertyIds.length === 0) {
    // User has no properties, return empty results
    req.userPropertyIds = [];
    return next();
  }

  // Attach user's property IDs to request
  req.userPropertyIds = allPropertyIds;

  next();
});

/**
 * Helper: Check if user has access to specific property
 *
 * Can be called directly in controllers for custom logic.
 *
 * @param {string} userId - User ID
 * @param {string} hotelId - Property ID
 * @param {object} user - Full user object (optional, for multi-property check)
 * @returns {Promise<boolean>} - True if user has access
 */
export const checkPropertyAccess = async (userId, hotelId, user = null) => {
  try {
    if (!hotelId) {
      return false;
    }

    // Check ownership first
    const hasOwnership = await Hotel.exists({
      _id: hotelId,
      $or: [
        { ownerId: userId },
        { createdBy: userId }
      ]
    });

    if (hasOwnership) {
      return true;
    }

    // If user object provided, check multi-property access
    if (user) {
      const hotelIdStr = hotelId.toString();
      const userProperties = user.properties?.map(p => p.toString()) || [];
      const allowedProperties = user.multiPropertyAccess?.allowedProperties?.map(p => p.toString()) || [];
      const primaryProperty = user.primaryProperty?.toString();
      const userHotelId = user.hotelId?.toString();

      return (
        userProperties.includes(hotelIdStr) ||
        allowedProperties.includes(hotelIdStr) ||
        primaryProperty === hotelIdStr ||
        userHotelId === hotelIdStr
      );
    }

    return false;

  } catch (error) {
    console.error('Operation failed:', error.message);
    throw error;
  }
};

/**
 * Helper: Get all property IDs owned by user
 *
 * @param {string} userId - User ID
 * @param {object} user - Full user object (optional, for multi-property)
 * @returns {Promise<string[]>} - Array of property IDs
 */
export const getUserPropertyIds = async (userId, user = null) => {
  try {
    // Get owned properties
    const ownedProperties = await Hotel.find({
      $or: [
        { ownerId: userId },
        { createdBy: userId }
      ]
    }).select('_id').lean().limit(1000);

    const ownedPropertyIds = ownedProperties.map(p => p._id.toString());

    // If user object provided, include assigned properties
    if (user) {
      const assignedPropertyIds = user.properties?.map(p => p.toString()) || [];
      const allowedPropertyIds = user.multiPropertyAccess?.allowedProperties?.map(p => p.toString()) || [];

      const allPropertyIds = [
        ...new Set([
          ...ownedPropertyIds,
          ...assignedPropertyIds,
          ...allowedPropertyIds,
          ...(user.primaryProperty ? [user.primaryProperty.toString()] : []),
          ...(user.hotelId ? [user.hotelId.toString()] : [])
        ])
      ];

      return allPropertyIds;
    }

    return ownedPropertyIds;

  } catch (error) {
    console.error('Operation failed:', error.message);
    throw error;
  }
};

/**
 * Middleware: Ensure property belongs to group
 *
 * Used when performing group operations on properties.
 *
 * @example
 * router.post('/property-groups/:groupId/properties/:propertyId',
 *   authenticate,
 *   ensureGroupAccess,
 *   ensurePropertyInGroup,
 *   addPropertyToGroup
 * );
 */
export const ensurePropertyInGroup = catchAsync(async (req, res, next) => {
  const { groupId, propertyId } = req.params;

  if (!groupId || !propertyId) {
    return next();
  }

  // Check if property belongs to this group
  const property = await Hotel.findOne({
    _id: propertyId,
    propertyGroupId: groupId
  }).lean();

  if (!property) {
    throw new ApplicationError(
      'This property does not belong to the specified group.',
      400
    );
  }

  req.propertyInGroup = property;
  next();
});

export default {
  ensurePropertyAccess,
  ensureGroupAccess,
  filterByUserProperties,
  checkPropertyAccess,
  getUserPropertyIds,
  ensurePropertyInGroup
};
