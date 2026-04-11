const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/banner.controller');

/**
 * @swagger
 * /api/banners:
 *   get:
 *     summary: بنرات التطبيق (أعلى/أسفل/قطع غيار/غسيلCars) — Public banners for mobile app
 *     description: |
 *       - بدون `position`: يعيد `{ top: Banner[], bottom: Banner[], autoParts: Banner[], carWash: Banner[] }`
 *       - مع `position=TOP|BOTTOM|AUTO_PARTS|CAR_WASH`: يعيد `Banner[]` لمكان معيّن
 *     tags: [Banners]
 *     parameters:
 *       - in: query
 *         name: position
 *         required: false
 *         schema:
 *           type: string
 *           enum: [TOP, BOTTOM, AUTO_PARTS, CAR_WASH]
 *     responses:
 *       200:
 *         description: |
 *           - If `position` is provided: returns array `Banner[]`
 *           - If `position` is omitted: returns object `{ top: Banner[], bottom: Banner[], autoParts: Banner[], carWash: Banner[] }`
 */
router.get('/', ctrl.getPublic);

module.exports = router;

