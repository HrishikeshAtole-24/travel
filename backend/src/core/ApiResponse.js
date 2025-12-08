// Standardized API Response Handler
class ApiResponse {
  static success(data, statusCode = 200, message = 'Success') {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  static error(message, statusCode = 500, errors = null) {
    return {
      success: false,
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString()
    };
  }

  static paginated(data, page, limit, total) {
    return {
      success: true,
      statusCode: 200,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ApiResponse;
