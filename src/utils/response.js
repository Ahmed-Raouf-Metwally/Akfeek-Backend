/**
 * Unified API response helpers
 * All success responses: { success: true, message?, data }
 */

/**
 * Send success response
 * @param {object} res - Express response
 * @param {*} data - Response payload (object or array)
 * @param {object} options - { message, messageAr, statusCode, pagination }
 */
function success(res, data = {}, options = {}) {
  const { message = '', messageAr = '', statusCode = 200, pagination } = options;
  const payload = {
    success: true,
    ...(message && { message }),
    ...(messageAr && { messageAr }),
    data: data ?? {},
    ...(pagination && { pagination }),
  };
  res.status(statusCode).json(payload);
}

module.exports = { success };
