/**
 * Standardized API Response class
 */
export class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

/**
 * Helper functions to create common API responses
 */
export const createApiResponse = {
  success: (data, message = 'Success') => new ApiResponse(200, data, message),
  created: (data, message = 'Created successfully') => new ApiResponse(201, data, message),
  accepted: (data, message = 'Accepted') => new ApiResponse(202, data, message),
  noContent: (message = 'No content') => new ApiResponse(204, null, message),

  // Error responses
  badRequest: (message = 'Bad Request') => new ApiResponse(400, null, message),
  unauthorized: (message = 'Unauthorized') => new ApiResponse(401, null, message),
  forbidden: (message = 'Forbidden') => new ApiResponse(403, null, message),
  notFound: (message = 'Not Found') => new ApiResponse(404, null, message),
  conflict: (message = 'Conflict') => new ApiResponse(409, null, message),
  validationError: (errors, message = 'Validation Error') => new ApiResponse(422, { errors }, message),
  internalServer: (message = 'Internal Server Error') => new ApiResponse(500, null, message)
};

export default ApiResponse;