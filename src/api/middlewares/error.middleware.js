const logger = require('../../utils/logger/logger');

/**
 * Global error handling middleware
 * Handles all errors thrown in the application
 */
module.exports = (err, req, res, next) => {
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
    ALREADY_EXISTS: {
      en: 'Resource already exists',
      ar: 'المورد موجود بالفعل'
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
    }
  };

  // Get error code
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  
  // Get bilingual message
  const bilingualMessage = errorMessages[errorCode] || errorMessages.INTERNAL_SERVER_ERROR;
  
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
