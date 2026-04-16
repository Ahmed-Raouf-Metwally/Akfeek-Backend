const prisma = require('../../utils/database/prisma');
const { getSettingsByCategory, updateSystemSetting } = require('../../utils/systemSettings');
const { AppError } = require('../middlewares/error.middleware');

class SettingsController {
    /**
     * Get all towing service settings
     * GET /api/admin/settings/towing
     */
    async getTowingSettings(req, res, next) {
        try {
            const settings = await getSettingsByCategory('TOWING');

            // Format for frontend
            const formattedSettings = settings.map(s => ({
                key: s.key,
                value: s.value,
                type: s.type,
                description: s.description,
                descriptionAr: s.descriptionAr,
                isEditable: s.isEditable,
                updatedAt: s.updatedAt
            }));

            res.json({
                success: true,
                data: formattedSettings
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update a system setting
     * PUT /api/admin/settings/:key
     */
    async updateSetting(req, res, next) {
        try {
            const { key } = req.params;
            const { value } = req.body;

            if (value === undefined || value === null) {
                throw new AppError('Value is required', 400, 'VALIDATION_ERROR');
            }

            const updated = await updateSystemSetting(key, value);

            res.json({
                success: true,
                message: 'Setting updated successfully',
                messageAr: 'تم تحديث الإعداد بنجاح',
                data: {
                    key: updated.key,
                    value: updated.value,
                    updatedAt: updated.updatedAt
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Initialize towing pricing & timing settings keys if missing
     * POST /api/admin/settings/towing/init
     */
    async initTowingPricingSettings(req, res, next) {
        try {
            const towingSettings = [
                {
                    key: 'TOWING_BASE_PRICE',
                    category: 'TOWING',
                    type: 'NUMBER',
                    value: 100,
                    description: 'Base towing price (SAR) added on every request',
                    descriptionAr: 'السعر الأساسي (ر.س) يضاف على كل طلب',
                    isEditable: true,
                },
                {
                    key: 'TOWING_PRICE_PER_KM',
                    category: 'TOWING',
                    type: 'NUMBER',
                    value: 2,
                    description: 'Towing price per kilometer (SAR/km)',
                    descriptionAr: 'سعر الكيلومتر (ر.س/كم) يضاف لكل كيلومتر',
                    isEditable: true,
                },
                {
                    key: 'TOWING_MIN_PRICE',
                    category: 'TOWING',
                    type: 'NUMBER',
                    value: 100,
                    description: 'Minimum final towing price (SAR) for a trip',
                    descriptionAr: 'الحد الأدنى (ر.س) أقل سعر للرحلة',
                    isEditable: true,
                },
                {
                    key: 'TOWING_MINUTES_PER_KM',
                    category: 'TOWING',
                    type: 'NUMBER',
                    value: 1,
                    description: 'Estimated time in minutes per kilometer for customer (minutes/km)',
                    descriptionAr: 'الوقت التقديري بالدقائق لكل كيلومتر قبل استقبال عروض الوينش',
                    isEditable: true,
                },
                {
                    key: 'TOWING_ADDITIONAL_MINUTES',
                    category: 'TOWING',
                    type: 'NUMBER',
                    value: 0,
                    description: 'Additional fixed minutes added to total estimated time',
                    descriptionAr: 'وقت إضافي ثابت يضاف للوقت الكلي المقدر',
                    isEditable: true,
                },
            ];

            for (const s of towingSettings) {
                await prisma.systemSettings.upsert({
                    where: { key: s.key },
                    update: {
                        category: s.category,
                        type: s.type,
                        isEditable: s.isEditable,
                        description: s.description,
                        descriptionAr: s.descriptionAr,
                        value: String(s.value),
                    },
                    create: {
                        key: s.key,
                        value: String(s.value),
                        type: s.type,
                        category: s.category,
                        isEditable: s.isEditable,
                        description: s.description,
                        descriptionAr: s.descriptionAr,
                    },
                });
            }

            res.json({
                success: true,
                message: 'Towing settings initialized successfully',
                messageAr: 'تم تهيئة إعدادات السطحة بنجاح',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all system settings (all categories)
     * GET /api /admin/settings
     */
    async getAllSettings(req, res, next) {
        try {
            const settings = await prisma.systemSettings.findMany({
                orderBy: [
                    { category: 'asc' },
                    { key: 'asc' }
                ]
            });

            // Group by category
            const grouped = settings.reduce((acc, setting) => {
                if (!acc[setting.category]) {
                    acc[setting.category] = [];
                }
                acc[setting.category].push({
                    key: setting.key,
                    value: setting.value,
                    type: setting.type,
                    description: setting.description,
                    descriptionAr: setting.descriptionAr,
                    isEditable: setting.isEditable,
                    updatedAt: setting.updatedAt
                });
                return acc;
            }, {});

            res.json({
                success: true,
                data: grouped
            });
        } catch (err) {
            // If table missing or DB error, return empty so Settings page still loads
            res.json({ success: true, data: {} });
        }
    }
}

module.exports = new SettingsController();
