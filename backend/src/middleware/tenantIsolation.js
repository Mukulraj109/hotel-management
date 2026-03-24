/**
 * Tenant Isolation Middleware
 * Ensures all database queries are scoped to the authenticated user's hotel.
 * Prevents cross-tenant data leakage in multi-property deployments.
 */

/**
 * Middleware that attaches hotelId to req for downstream use.
 * Must be used AFTER authentication middleware.
 */
const ensureTenantContext = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  // Extract hotelId from authenticated user
  const hotelId = req.user.hotelId || req.user.hotel;
  if (!hotelId) {
    return res.status(403).json({ success: false, error: { code: 'NO_TENANT', message: 'User is not associated with any property' } });
  }

  // Attach to request for easy access
  req.tenantId = hotelId;

  // CRITICAL: Override any client-provided hotelId to prevent IDOR
  if (req.body && typeof req.body === 'object') {
    req.body.hotelId = hotelId;
    req.body.hotel = hotelId;
  }
  if (req.query) {
    req.query.hotelId = hotelId;
  }

  next();
};

/**
 * Higher-order middleware for verifying resource ownership.
 * Ensures the requested resource belongs to the user's hotel.
 *
 * Usage: router.get('/:id', authenticate, ensureTenantContext, verifyResourceOwnership(Booking), getBooking);
 */
const verifyResourceOwnership = (Model, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      if (!resourceId) return next();

      const resource = await Model.findById(resourceId).select('hotelId hotel').lean();
      if (!resource) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      const resourceHotelId = (resource.hotelId || resource.hotel || '').toString();
      const userHotelId = req.tenantId.toString();

      if (resourceHotelId && resourceHotelId !== userHotelId) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Build a tenant-scoped query filter.
 * Use in controllers: const filter = tenantFilter(req, { status: 'active' });
 */
const tenantFilter = (req, additionalFilters = {}) => {
  return {
    hotelId: req.tenantId,
    ...additionalFilters,
  };
};

/**
 * Middleware to validate that bulk operations include tenant scope.
 * Apply before any bulk update/delete endpoints.
 */
const requireTenantInBulkOps = (req, res, next) => {
  if (req.method === 'DELETE' || (req.method === 'PUT' && req.path.includes('bulk'))) {
    if (!req.body?.hotelId && !req.query?.hotelId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Bulk operations must include hotelId filter for safety' },
      });
    }
  }
  next();
};

export {
  ensureTenantContext,
  verifyResourceOwnership,
  tenantFilter,
  requireTenantInBulkOps,
};
