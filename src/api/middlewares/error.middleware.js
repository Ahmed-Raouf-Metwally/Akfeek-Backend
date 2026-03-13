const logger = require('../../utils/logger/logger');

/**
 * Global error handling middleware
 * Handles all errors thrown in the application
 */
// Global error handling middleware
module.exports = (err, req, res, next) => {
  // --- transform known errors to AppError ---

  // Handle Prisma Errors
  if (err.code) {
    try {
      switch (err.code) {
        case 'P2002': // Unique constraint violation
          const target = err.meta?.target;
          const field = Array.isArray(target) ? target.join(', ') : (target && typeof target === 'object' ? Object.keys(target).join(', ') : String(target || 'field'));
          err = new AppError(`Value for ${field} already exists`, 409, 'ALREADY_EXISTS');
          break;
        case 'P2025': // Record not found
          err = new AppError('Record not found', 404, 'NOT_FOUND');
          break;
        case 'P2003': // Foreign key constraint failed
          err = new AppError('Related record validation failed', 400, 'VALIDATION_ERROR');
          break;
        case 'P2001': // Record validation error
          err = new AppError('Record validation failed', 404, 'NOT_FOUND');
          break;
      }
    } catch (transformErr) {
      logger.error('Error middleware: failed to transform Prisma error', { original: err.message, transform: transformErr.message });
    }
  }

  // Handle JWT Errors (if they bubble up)
  if (err.name === 'JsonWebTokenError') {
    err = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    err = new AppError('Token expired', 401, 'INVALID_TOKEN');
  }

  // Log the error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  const errorMessages = {
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    INVALID_TOKEN: 'Invalid or expired token',
    VALIDATION_ERROR: 'Validation failed',
    INVALID_INPUT: 'Invalid input data',
    NOT_FOUND: 'Resource not found',
    ROUTE_NOT_FOUND: 'Route not found',
    ALREADY_EXISTS: 'Resource already exists',
    OFFER_NOT_FOUND: 'Offer not found',
    BROADCAST_NOT_FOUND: 'Broadcast not found',
    BOOKING_NOT_FOUND: 'Booking not found',
    VEHICLE_NOT_FOUND: 'Vehicle not found',
    USER_NOT_FOUND: 'User not found',
    ADDRESS_NOT_FOUND: 'Address not found',
    DATABASE_ERROR: 'Database operation failed',
    PAYMENT_FAILED: 'Payment processing failed',
    INSUFFICIENT_BALANCE: 'Insufficient wallet balance',
    BOOKING_NOT_AVAILABLE: 'Booking slot not available',
    INVALID_STATUS_TRANSITION: 'Invalid status transition',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    SERVICE_ERROR: 'Service error',
  };

  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = errorMessages[errorCode];
  if (!message) {
    message = statusCode >= 400 && statusCode < 500 ? 'Invalid request' : 'Internal server error';
  }

  const errorResponse = {
    success: false,
    error: err.message || message,
    code: errorCode,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  };

  // Add validation details if present
  if (err.details) {
    errorResponse.details = err.details;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports.AppError = AppError;
