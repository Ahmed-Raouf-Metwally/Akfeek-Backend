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
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        // err.meta.target is usually an array of fields
        const field = err.meta?.target ? err.meta.target.join(', ') : 'field';
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

  // Get language preference
  const language = req.language || req.user?.preferredLanguage || 'AR';

  // Bilingual error messages
  const errorMessages = {
    // Authentication errors
    UNAUTHORIZED: {
      en: 'Authentication required',
      ar: 'مطلوب مصادقة'
    },
    FORBIDDEN: {
      en: 'Access denied',
      ar: 'تم رفض الوصول'
    },
    INVALID_TOKEN: {
      en: 'Invalid or expired token',
      ar: 'رمز غير صالح أو منتهي الصلاحية'
    },

    // Validation errors
    VALIDATION_ERROR: {
      en: 'Validation failed',
      ar: 'فشل التحقق'
    },
    INVALID_INPUT: {
      en: 'Invalid input data',
      ar: 'بيانات إدخال غير صالحة'
    },

    // Resource errors
    NOT_FOUND: {
      en: 'Resource not found',
      ar: 'المورد غير موجود'
    },
    ROUTE_NOT_FOUND: {
      en: 'Route not found',
      ar: 'الصفحة غير موجودة'
    },
    ALREADY_EXISTS: {
      en: 'Resource already exists',
      ar: 'المورد موجود بالفعل'
    },

    // Specific Resource Errors
    OFFER_NOT_FOUND: {
      en: 'Offer not found',
      ar: 'العرض غير موجود'
    },
    BROADCAST_NOT_FOUND: {
      en: 'Broadcast not found',
      ar: 'طلب البث غير موجود' // "Broadcast request not found" or just "Request not found"
    },
    BOOKING_NOT_FOUND: {
      en: 'Booking not found',
      ar: 'الحجز غير موجود'
    },
    VEHICLE_NOT_FOUND: {
      en: 'Vehicle not found',
      ar: 'المركبة غير موجودة'
    },
    USER_NOT_FOUND: {
      en: 'User not found',
      ar: 'المستخدم غير موجود'
    },

    // Database errors
    DATABASE_ERROR: {
      en: 'Database operation failed',
      ar: 'فشلت عملية قاعدة البيانات'
    },

    // Payment errors
    PAYMENT_FAILED: {
      en: 'Payment processing failed',
      ar: 'فشلت معالجة الدفع'
    },
    INSUFFICIENT_BALANCE: {
      en: 'Insufficient wallet balance',
      ar: 'رصيد المحفظة غير كافٍ'
    },

    // Booking errors
    BOOKING_NOT_AVAILABLE: {
      en: 'Booking slot not available',
      ar: 'فترة الحجز غير متاحة'
    },
    INVALID_STATUS_TRANSITION: {
      en: 'Invalid status transition',
      ar: 'انتقال الحالة غير صالح'
    },

    // Generic errors
    INTERNAL_SERVER_ERROR: {
      en: 'Internal server error',
      ar: 'خطأ داخلي في الخادم'
    },
    SERVICE_UNAVAILABLE: {
      en: 'Service temporarily unavailable',
      ar: 'الخدمة غير متاحة مؤقتًا'
    },
    SERVICE_ERROR: {
      en: 'Service error',
      ar: 'خطأ في الخدمة - يرجى المحاولة لاحقاً'
    }
  };

  // Get error code
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  // Get bilingual message
  let bilingualMessage = errorMessages[errorCode];

  if (!bilingualMessage) {
    if (statusCode >= 400 && statusCode < 500) {
      bilingualMessage = errorMessages.INVALID_INPUT || { en: 'Invalid request', ar: 'طلب غير صالح' };
    } else {
      bilingualMessage = errorMessages.INTERNAL_SERVER_ERROR;
    }
  }

  // Build error response
  const errorResponse = {
    success: false,
    error: err.message || bilingualMessage.en,
    errorAr: bilingualMessage.ar,
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
