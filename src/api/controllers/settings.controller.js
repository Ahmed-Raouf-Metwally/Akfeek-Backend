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
     * GET /api/admin/settings/about  — get about-page content
     * GET /api/about                 — public version for mobile app
     */
    async getAboutSettings(req, res, next) {
        try {
            const settings = await getSettingsByCategory('ABOUT');
            const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

            // Parse VALUES JSON safely
            let values = [];
            try { values = JSON.parse(map.ABOUT_VALUES || '[]'); } catch (_) { values = []; }

            res.json({
                success: true,
                data: {
                    taglineAr:    map.ABOUT_TAGLINE_AR    || '',
                    taglineEn:    map.ABOUT_TAGLINE_EN    || '',
                    bodyAr:       map.ABOUT_BODY_AR       || '',
                    bodyEn:       map.ABOUT_BODY_EN       || '',
                    values,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/admin/settings/about  — update about-page content (batch)
     */
    async updateAboutSettings(req, res, next) {
        try {
            const { taglineAr, taglineEn, bodyAr, bodyEn, values } = req.body;

            const entries = [
                { key: 'ABOUT_TAGLINE_AR', value: taglineAr ?? '', type: 'STRING', description: 'About page tagline (Arabic)',  descriptionAr: 'شعار صفحة من نحن (عربي)' },
                { key: 'ABOUT_TAGLINE_EN', value: taglineEn ?? '', type: 'STRING', description: 'About page tagline (English)', descriptionAr: 'شعار صفحة من نحن (إنجليزي)' },
                { key: 'ABOUT_BODY_AR',    value: bodyAr    ?? '', type: 'STRING', description: 'About page body text (Arabic)',  descriptionAr: 'نص صفحة من نحن (عربي)' },
                { key: 'ABOUT_BODY_EN',    value: bodyEn    ?? '', type: 'STRING', description: 'About page body text (English)', descriptionAr: 'نص صفحة من نحن (إنجليزي)' },
                { key: 'ABOUT_VALUES',     value: JSON.stringify(Array.isArray(values) ? values : []), type: 'JSON', description: 'About page core values', descriptionAr: 'القيم الأساسية' },
            ];

            for (const e of entries) {
                await prisma.systemSettings.upsert({
                    where:  { key: e.key },
                    update: { value: String(e.value), category: 'ABOUT', type: e.type, description: e.description, descriptionAr: e.descriptionAr },
                    create: { key: e.key, value: String(e.value), category: 'ABOUT', type: e.type, isEditable: true, description: e.description, descriptionAr: e.descriptionAr },
                });
            }

            res.json({ success: true, message: 'About settings updated', messageAr: 'تم تحديث محتوى صفحة من نحن' });
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
