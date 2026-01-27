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
     * Get all system settings (all categories)
     * GET /api /admin/settings
     */
    async getAllSettings(req, res, next) {
        try {
            const prisma = require('../../utils/database/prisma');
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
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SettingsController();
