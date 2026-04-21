const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/serviceOffers.controller');

/**
 * @swagger
 * tags:
 *   name: Service Offers
 *   description: |
 *     عروض الخصم المتاحة للعملاء — Active discount offers visible to customers.
 *     - Public endpoint, no authentication required.
 *     - Only returns offers that are currently active and within their validity window.
 */

/**
 * @swagger
 * /api/service-offers:
 *   get:
 *     summary: List active service offers (Customer)
 *     description: |
 *       يجلب قائمة العروض النشطة والسارية حالياً للعملاء.
 *       Returns only offers where `isActive=true`, `validFrom <= now <= validUntil`.
 *     tags: [Service Offers]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: vendorId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: Filter by vendor (e.g. a specific workshop or provider)
 *       - in: query
 *         name: targetType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [SERVICE, CERTIFIED_WORKSHOP_SERVICE, MOBILE_WORKSHOP_SERVICE]
 *         description: Filter by service type
 *       - in: query
 *         name: targetId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: Filter by a specific service id
 *     responses:
 *       200:
 *         description: List of active offers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       vendorId: { type: string, format: uuid }
 *                       targetType:
 *                         type: string
 *                         enum: [SERVICE, CERTIFIED_WORKSHOP_SERVICE, MOBILE_WORKSHOP_SERVICE]
 *                       targetId: { type: string, format: uuid }
 *                       discountPercent: { type: integer, example: 15 }
 *                       validFrom: { type: string, format: date-time }
 *                       validUntil: { type: string, format: date-time }
 *                       isActive: { type: boolean, example: true }
 *                       title: { type: string, nullable: true }
 *                       titleAr: { type: string, nullable: true }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 *                       vendor:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           businessName: { type: string }
 *                           businessNameAr: { type: string, nullable: true }
 *                           vendorType: { type: string }
 *                       targetDetails:
 *                         type: object
 *                         nullable: true
 *                         description: |
 *                           تفاصيل الخدمة المرتبطة بالعرض مع الأسعار قبل وبعد الخصم.
 *                           Service/workshop details with pricing before and after discount.
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [SERVICE, CERTIFIED_WORKSHOP_SERVICE, MOBILE_WORKSHOP_SERVICE]
 *                           id: { type: string, format: uuid }
 *                           name: { type: string }
 *                           nameAr: { type: string, nullable: true }
 *                           description: { type: string, nullable: true }
 *                           currency: { type: string, example: SAR }
 *       400:
 *         description: Invalid query params
 */
router.get('/', ctrl.listPublic);

/**
 * @swagger
 * /api/service-offers/{id}:
 *   get:
 *     summary: Get service offer details (Customer) — تفاصيل العرض
 *     description: |
 *       يجلب تفاصيل عرض واحد للعميل.\n
 *       Returns the offer only if it is currently active and within validity window (`validFrom <= now <= validUntil`).\n
 *       Includes `targetDetails` (service/workshop/mobile-workshop service info + price before/after the offer).\n
 *       Public endpoint, no authentication required.
 *     tags: [Service Offers]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Offer ID
 *     responses:
 *       200:
 *         description: Offer details
 *       404:
 *         description: Offer not found (or not active / expired)
 */
router.get('/:id', ctrl.getPublicById);

module.exports = router;
