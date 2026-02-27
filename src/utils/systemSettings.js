const prisma = require('./database/prisma');
const logger = require('./logger/logger');

/**
 * Get system setting value by key
 * @param {string} key - Setting key
 * @param {*} defaultValue - Default value if setting not found
 * @returns {Promise<*>} Setting value (parsed if number/json)
 */
async function getSystemSetting(key, defaultValue = null) {
    try {
        const setting = await prisma.systemSettings.findUnique({
            where: { key }
        });

        if (!setting) {
            return defaultValue;
        }

        // Parse value based on type
        switch (setting.type) {
            case 'NUMBER':
                return parseFloat(setting.value);
            case 'BOOLEAN':
                return setting.value === 'true';
            case 'JSON':
                return JSON.parse(setting.value);
            default:
                return setting.value;
        }
    } catch (error) {
        logger.error('Error fetching system setting', { key, error: error?.message });
        return defaultValue;
    }
}

/** Known PRICING keys that can be created on first update (upsert) if missing */
const PRICING_UPSERT_DEFAULTS = {
    VAT_RATE: {
        value: '14.5',
        type: 'NUMBER',
        description: 'VAT % (e.g. 14.5 for Saudi Arabia). Stored as percentage, not decimal.',
        descriptionAr: 'نسبة ضريبة القيمة المضافة بالمئة (مثلاً 14.5 للسعودية)',
        category: 'PRICING',
        isEditable: true
    },
    PLATFORM_COMMISSION_PERCENT: {
        value: '10',
        type: 'NUMBER',
        description: 'Platform commission percent (0-100) applied to service subtotal before VAT',
        descriptionAr: 'نسبة عمولة التطبيق من مبلغ الخدمة قبل الضريبة',
        category: 'PRICING',
        isEditable: true
    }
};

/**
 * Update system setting value. For PRICING keys (VAT_RATE, PLATFORM_COMMISSION_PERCENT), creates if not found.
 * @param {string} key - Setting key
 * @param {*} value - New value
 * @returns {Promise<Object>} Updated or created setting
 */
async function updateSystemSetting(key, value) {
    const stringValue = value !== undefined && value !== null ? value.toString() : '';

    const setting = await prisma.systemSettings.findUnique({
        where: { key }
    });

    if (setting) {
        if (!setting.isEditable) {
            throw new Error(`Setting "${key}" is not editable`);
        }
        const finalValue = setting.type === 'JSON' ? JSON.stringify(value) : stringValue;
        return await prisma.systemSettings.update({
            where: { key },
            data: { value: finalValue }
        });
    }

    // Upsert: create if allowed (PRICING keys)
    const defaults = PRICING_UPSERT_DEFAULTS[key];
    if (!defaults) {
        throw new Error(`Setting with key "${key}" not found`);
    }

    return await prisma.systemSettings.create({
        data: {
            key,
            value: stringValue || defaults.value,
            type: defaults.type,
            description: defaults.description,
            descriptionAr: defaults.descriptionAr,
            category: defaults.category,
            isEditable: defaults.isEditable
        }
    });
}

/**
 * Get all settings by category
 * @param {string} category - Category name (e.g., "TOWING")
 * @returns {Promise<Array>} Array of settings
 */
async function getSettingsByCategory(category) {
    return await prisma.systemSettings.findMany({
        where: { category },
        orderBy: { key: 'asc' }
    });
}

/**
 * Ensure VAT_RATE and PLATFORM_COMMISSION_PERCENT exist in DB. Creates only if missing; does NOT overwrite existing values.
 * Call from seed or POST /admin/settings/pricing/init.
 * @returns {Promise<Array>} Created or existing settings
 */
async function ensurePricingSettings() {
    const results = [];
    for (const key of Object.keys(PRICING_UPSERT_DEFAULTS)) {
        const d = PRICING_UPSERT_DEFAULTS[key];
        const existing = await prisma.systemSettings.findUnique({ where: { key } });
        if (existing) {
            // موجود مسبقاً: لا نغيّر القيمة، فقط نحدّث الوصف إن احتجت لاحقاً
            results.push(existing);
            continue;
        }
        const row = await prisma.systemSettings.create({
            data: {
                key,
                value: d.value,
                type: d.type,
                description: d.description,
                descriptionAr: d.descriptionAr,
                category: d.category,
                isEditable: d.isEditable
            }
        });
        results.push(row);
    }
    return results;
}

module.exports = {
    getSystemSetting,
    updateSystemSetting,
    getSettingsByCategory,
    ensurePricingSettings,
    PRICING_UPSERT_DEFAULTS
};
