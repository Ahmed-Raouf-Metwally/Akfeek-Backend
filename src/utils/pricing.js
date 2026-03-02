const { getSystemSetting } = require('./systemSettings');

/**
 * Returns the VAT rate as a decimal (e.g. 0.15 for 15%).
 * Falls back to 0.15 if the setting is not found.
 */
async function getVatRate() {
  const pct = await getSystemSetting('vat_rate', 15);
  return pct / 100;
}

/**
 * Returns the global platform commission percentage (e.g. 10 for 10%).
 * Falls back to 10 if the setting is not found.
 */
async function getPlatformCommissionPercent() {
  return await getSystemSetting('platform_commission', 10);
}

module.exports = { getVatRate, getPlatformCommissionPercent };
