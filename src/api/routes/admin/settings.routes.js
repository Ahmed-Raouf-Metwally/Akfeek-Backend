const express = require('express');
const router = express.Router();
const settingsController = require('../../controllers/settings.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/role.middleware');

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get all system settings
 *     tags: [⚙️ Admin | Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 */
router.get('/', authMiddleware, requireRole('ADMIN'), settingsController.getAllSettings);

/**
 * @swagger
 * /api/admin/settings/towing:
 *   get:
 *     summary: Get towing service settings
 *     tags: [⚙️ Admin | Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Towing settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                         example: "TOWING_SEARCH_RADIUS"
 *                       value:
 *                         type: string
 *                         example: "10"
 *                       type:
 *                         type: string
 *                         example: "NUMBER"
 *                       description:
 *                         type: string
 *                       descriptionAr:
 *                         type: string
 *                       isEditable:
 *                         type: boolean
 */
router.get('/towing', authMiddleware, requireRole('ADMIN'), settingsController.getTowingSettings);

/**
 * @swagger
 * /api/admin/settings/pricing:
 *   get:
 *     summary: Get pricing settings (VAT rate, platform commission %)
 *     tags: [⚙️ Admin | Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pricing settings (VAT_RATE, PLATFORM_COMMISSION_PERCENT)
 */
router.get('/pricing', authMiddleware, requireRole('ADMIN'), settingsController.getPricingSettings);

/**
 * @swagger
 * /api/admin/settings/pricing/init:
 *   post:
 *     summary: Create or reset VAT_RATE and PLATFORM_COMMISSION_PERCENT in DB
 *     tags: [⚙️ Admin | Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pricing settings initialized
 */
router.post('/pricing/init', authMiddleware, requireRole('ADMIN'), settingsController.initPricingSettings);

/**
 * @swagger
 * /api/admin/settings/{key}:
 *   put:
 *     summary: Update a system setting
 *     tags: [⚙️ Admin | Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         example: "TOWING_SEARCH_RADIUS"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: string
 *                 example: "15"
 *                 description: New value for the setting
 *     responses:
 *       200:
 *         description: Setting updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 messageAr:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 */
router.put('/:key', authMiddleware, requireRole('ADMIN'), settingsController.updateSetting);

module.exports = router;
