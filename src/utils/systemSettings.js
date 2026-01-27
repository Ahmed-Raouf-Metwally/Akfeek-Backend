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

/**
 * Update system setting value
 * @param {string} key - Setting key
 * @param {*} value - New value
 * @returns {Promise<Object>} Updated setting
 */
async function updateSystemSetting(key, value) {
    const setting = await prisma.systemSettings.findUnique({
        where: { key }
    });

    if (!setting) {
        throw new Error(`Setting with key "${key}" not found`);
    }

    if (!setting.isEditable) {
        throw new Error(`Setting "${key}" is not editable`);
    }

    // Convert value to string based on type
    let stringValue = value.toString();
    if (setting.type === 'JSON') {
        stringValue = JSON.stringify(value);
    }

    return await prisma.systemSettings.update({
        where: { key },
        data: { value: stringValue }
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

module.exports = {
    getSystemSetting,
    updateSystemSetting,
    getSettingsByCategory
};
