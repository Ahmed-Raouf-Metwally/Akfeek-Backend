const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/banner.controller');

/**
 * @swagger
 * /api/banners:
 *   get:
 *     summary: بنرات التطبيق (أعلى/أسفل) — Public banners for mobile app
 *     description: |
 *       - بدون `position`: يعيد `{ top: Banner[], bottom: Banner[] }`
 *       - مع `position=TOP|BOTTOM`: يعيد `Banner[]` لمكان معيّن
 *     tags: [Banners]
 *     parameters:
 *       - in: query
 *         name: position
 *         required: false
 *         schema:
 *           type: string
 *           enum: [TOP, BOTTOM]
 *     responses:
 *       200:
 *         description: Banners
 */
router.get('/', ctrl.getPublic);

module.exports = router;

