/**
 * Marketplace order statuses (from Prisma schema).
 * Used by GET /api/marketplace-orders/my-orders and related endpoints.
 */

/** Order status enum – lifecycle of the order */
const ORDER_STATUS = [
  'PENDING',     // طلب جديد، لم يُؤكد
  'CONFIRMED',   // تم التأكيد
  'PROCESSING',  // قيد المعالجة/التجهيز
  'SHIPPED',     // تم الشحن
  'DELIVERED',   // تم التوصيل
  'CANCELLED',   // ملغى
  'REFUNDED',    // تم الاسترداد
];

/** Payment status (string on MarketplaceOrder model) */
const PAYMENT_STATUS = [
  'PENDING',   // لم يُدفع
  'PAID',      // مدفوع
  'FAILED',    // فشل الدفع
];

/** Payment method (optional, from schema comment) */
const PAYMENT_METHOD = [
  'CARD',
  'CASH',
  'WALLET',
];

module.exports = {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
};
