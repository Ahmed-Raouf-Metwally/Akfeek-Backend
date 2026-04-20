const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const { requireAdminOrPermission } = require('../../middlewares/permission.middleware');
const ctrl = require('../../controllers/admin/serviceOffers.admin.controller');

/**
 * @swagger
 * tags:
 *   name: Admin Service Offers
 *   description: |
 *     Admin endpoints to create and manage percentage discounts for specific services per vendor.
 *
 *     - Requires Bearer token (JWT)
 *     - Requires admin role or `settings` permission
 */

router.use(auth);
router.use(requireAdminOrPermission('settings'));

/**
 * @swagger
 * /api/admin/service-offers:
 *   get:
 *     summary: (Admin) List service offers
 *     tags: [Admin Service Offers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: vendorId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: Filter by vendor id
 *       - in: query
 *         name: targetType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [SERVICE, CERTIFIED_WORKSHOP_SERVICE, MOBILE_WORKSHOP_SERVICE]
 *         description: Filter by target type
 *       - in: query
 *         name: isActive
 *         required: false
 *         schema: { type: boolean }
 *         description: Filter by active state
 *     responses:
 *       200:
 *         description: List offers
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
 *                       discountPercent: { type: integer, example: 5 }
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
 *       400:
 *         description: Invalid query params
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', ctrl.list);

/**
 * @swagger
 * /api/admin/service-offers:
 *   post:
 *     summary: (Admin) Create a service offer
 *     tags: [Admin Service Offers]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vendorId, targetType, targetId, discountPercent, validUntil]
 *             properties:
 *               vendorId: { type: string, format: uuid }
 *               targetType:
 *                 type: string
 *                 enum: [SERVICE, CERTIFIED_WORKSHOP_SERVICE, MOBILE_WORKSHOP_SERVICE]
 *               targetId:
 *                 type: string
 *                 format: uuid
 *                 description: The target service id (depends on targetType)
 *               discountPercent:
 *                 type: number
 *                 example: 5
 *                 description: Must be 1..100 (stored as integer percent)
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Defaults to now when omitted
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *                 nullable: true
 *                 default: true
 *               title:
 *                 type: string
 *                 nullable: true
 *                 description: Optional title (English)
 *               titleAr:
 *                 type: string
 *                 nullable: true
 *                 description: Optional title (Arabic)
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     vendorId: { type: string, format: uuid }
 *                     targetType:
 *                       type: string
 *                       enum: [SERVICE, CERTIFIED_WORKSHOP_SERVICE, MOBILE_WORKSHOP_SERVICE]
 *                     targetId: { type: string, format: uuid }
 *                     discountPercent: { type: integer, example: 5 }
 *                     validFrom: { type: string, format: date-time }
 *                     validUntil: { type: string, format: date-time }
 *                     isActive: { type: boolean, example: true }
 *                     title: { type: string, nullable: true }
 *                     titleAr: { type: string, nullable: true }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor/target not found
 */
router.post('/', ctrl.create);

/**
 * @swagger
 * /api/admin/service-offers/{id}:
 *   delete:
 *     summary: (Admin) Delete a service offer
 *     tags: [Admin Service Offers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted: { type: boolean, example: true }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Offer not found
 */
router.delete('/:id', ctrl.remove);

module.exports = router;

