/**
 * Standardized API response helper.
 * Ensures consistent response format across all endpoints.
 */
class ApiResponseHelper {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created(res, data, message = 'Created successfully') {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1,
      },
    });
  }

  static error(res, message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    const response = {
      success: false,
      error: {
        code: errorCode,
        message,
      },
    };
    if (details) response.error.details = details;
    return res.status(statusCode).json(response);
  }

  static badRequest(res, message, details = null) {
    return ApiResponseHelper.error(res, message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return ApiResponseHelper.error(res, message, 401, 'UNAUTHORIZED');
  }

  static forbidden(res, message = 'Forbidden') {
    return ApiResponseHelper.error(res, message, 403, 'FORBIDDEN');
  }

  static notFound(res, resource = 'Resource') {
    return ApiResponseHelper.error(res, `${resource} not found`, 404, 'NOT_FOUND');
  }

  static conflict(res, message) {
    return ApiResponseHelper.error(res, message, 409, 'CONFLICT');
  }

  static tooManyRequests(res, message = 'Too many requests') {
    return ApiResponseHelper.error(res, message, 429, 'RATE_LIMITED');
  }
}

// Backward compatibility alias for files that import ApiResponse
const ApiResponse = ApiResponseHelper;

export { ApiResponseHelper, ApiResponse };
