const { getSystemSetting } = require('./systemSettings');

/** نسبة ضريبة القيمة المضافة بالمئة (السعودية 14.5%) — المخزّن في الإعدادات كنسبة مئوية */
const DEFAULT_VAT_PERCENT = 14.5;

/** نسبة عمولة التطبيق من مبلغ الخدمة (قبل الضريبة) — يمكن تغييرها من إعدادات النظام */
const DEFAULT_PLATFORM_COMMISSION_PERCENT = 10;

/**
 * Get VAT rate for calculation (0–1). Reads VAT_RATE from settings (stored as % e.g. 14.5) and converts to 0.145.
 * @returns {Promise<number>} rate between 0 and 1
 */
async function getVatRate() {
  const raw = await getSystemSetting('VAT_RATE', DEFAULT_VAT_PERCENT);
  const num = typeof raw === 'number' ? raw : parseFloat(raw);
  if (Number.isNaN(num)) return DEFAULT_VAT_PERCENT / 100;
  // إذا القيمة أكبر من 1 فمعناها نسبة مئوية (14.5)، وإلا قديمة (0.145) للتوافق
  return num > 1 ? num / 100 : num;
}

/**
 * Get platform commission percent (0–100). From system setting PLATFORM_COMMISSION_PERCENT
 * @returns {Promise<number>}
 */
async function getPlatformCommissionPercent() {
  const pct = await getSystemSetting('PLATFORM_COMMISSION_PERCENT', DEFAULT_PLATFORM_COMMISSION_PERCENT);
  return typeof pct === 'number' ? pct : parseFloat(pct) || DEFAULT_PLATFORM_COMMISSION_PERCENT;
}

/**
 * Compute tax amount from subtotal (before VAT)
 * @param {number} subtotal - Amount before tax
 * @param {number} [vatRate] - Optional VAT rate 0–1 (if not provided, fetched from settings)
 * @returns {Promise<number>} Rounded tax amount
 */
async function computeTax(subtotal, vatRate = null) {
  const rate = vatRate != null ? vatRate : await getVatRate();
  return Math.round(subtotal * rate * 100) / 100;
}

/**
 * Breakdown for a service/booking: ما يراه العميل وما يأخذه الفيندور وما تأخذه المنصة
 * @param {number} subtotal - مجموع الخدمات (قبل الضريبة والخصم)
 * @param {Object} [options]
 * @param {number} [options.discount=0]
 * @param {number} [options.flatFee=0] - e.g. delivery/flatbed
 * @param {number} [options.vatRate] - override
 * @param {number} [options.commissionPercent] - override
 * @returns {Promise<Object>} { subtotal, discount, afterDiscount, tax, taxRate, totalForCustomer, platformCommission, platformCommissionPercent, vendorEarnings }
 */
async function computeServiceBreakdown(subtotal, options = {}) {
  const discount = Number(options.discount) || 0;
  const flatFee = Number(options.flatFee) || 0;
  const afterDiscount = Math.max(0, subtotal - discount);

  const vatRate = options.vatRate != null ? options.vatRate : await getVatRate();
  const commissionPercent = options.commissionPercent != null ? options.commissionPercent : await getPlatformCommissionPercent();

  const tax = Math.round(afterDiscount * vatRate * 100) / 100;
  const totalForCustomer = afterDiscount + flatFee + tax;

  const platformCommission = Math.round((afterDiscount * commissionPercent / 100) * 100) / 100;
  const vendorEarnings = Math.round((afterDiscount - platformCommission) * 100) / 100;

  return {
    subtotal,
    discount,
    afterDiscount,
    tax,
    taxRate: vatRate,
    flatFee,
    totalForCustomer,
    platformCommission,
    platformCommissionPercent: commissionPercent,
    vendorEarnings,
  };
}

module.exports = {
  DEFAULT_VAT_RATE: DEFAULT_VAT_PERCENT / 100,
  DEFAULT_VAT_PERCENT,
  DEFAULT_PLATFORM_COMMISSION_PERCENT,
  getVatRate,
  getPlatformCommissionPercent,
  computeTax,
  computeServiceBreakdown,
};
