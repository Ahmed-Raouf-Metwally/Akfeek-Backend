const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/banner.controller');

/**
 * @swagger
 * /api/banners:
 *   get:
 *     summary: بنرات التطبيق (أعلى/أسفل/قطع غيار) — Public banners for mobile app
 *     description: |
 *       - بدون `position`: يعيد `{ top: Banner[], bottom: Banner[], autoParts: Banner[] }`
 *       - مع `position=TOP|BOTTOM|AUTO_PARTS`: يعيد `Banner[]` لمكان معيّن
 *     tags: [Banners]
 *     parameters:
 *       - in: query
 *         name: position
 *         required: false
 *         schema:
 *           type: string
 *           enum: [TOP, BOTTOM, AUTO_PARTS]
 *     responses:
 *       200:
 *         description: |
 *           - If `position` is provided: returns array `Banner[]`
 *           - If `position` is omitted: returns object `{ top: Banner[], bottom: Banner[], autoParts: Banner[] }`
 */
router.get('/', ctrl.getPublic);

module.exports = router;

