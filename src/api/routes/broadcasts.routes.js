const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const broadcastController = require('../controllers/broadcast.controller');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Broadcasts
 *   description: |
 *     بث الوظائف — بث السحب (تويينج) + طلبات الورش المتنقلة. قائمة موحدة للمسؤول.
 *     Job broadcasts (towing) and mobile workshop requests. Admin list.
 */

/**
 * @swagger
 * /api/broadcasts:
 *   get:
 *     summary: List all broadcasts (Admin)
 *     description: |
 *       قائمة بث السحب (JobBroadcast) وطلبات الورش المتنقلة (MobileWorkshopRequest). يمكن تصفية حسب النوع.
 *       List towing broadcasts and mobile workshop requests. Filter by type.
 *     tags: [Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: type
 *         in: query
 *         description: نوع البث - towing فقط، mobile-workshop فقط، أو all (الافتراضي)
 *         schema:
 *           type: string
 *           enum: [towing, mobile-workshop, all]
 *           default: all
 *       - name: status
 *         in: query
 *         description: Filter by status (optional)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of broadcasts (each item has type 'towing' or 'mobile_workshop')
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
 *                       type: { type: string, enum: [towing, mobile_workshop], description: نوع العنصر }
 *                       id: { type: string, format: uuid }
 *                       customer: { type: object, description: بيانات العميل }
 *                       status: { type: string }
 *                       createdAt: { type: string, format: date-time }
 *                       offersCount: { type: integer }
 *                       description: { type: string, nullable: true }
 *                       locationAddress: { type: string, nullable: true }
 *                       workshopType: { type: object, nullable: true, description: لنوع mobile_workshop }
 *                       workshopTypeService: { type: object, nullable: true }
 *                       booking: { type: object, nullable: true, description: لنوع towing }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/', requireRole('ADMIN'), broadcastController.getAllBroadcasts);

/**
 * @swagger
 * /api/broadcasts/{id}:
 *   get:
 *     summary: Get broadcast by ID (towing or mobile workshop request)
 *     description: |
 *       تفاصيل بث واحد — يدعم معرف بث السحب (JobBroadcast) أو معرف طلب ورشة متنقلة (MobileWorkshopRequest).
 *       Returns type 'towing' or 'mobile_workshop' with full details.
 *     tags: [Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Broadcast details (towing or mobile_workshop)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     type: { type: string, enum: [towing, mobile_workshop] }
 *                     id: { type: string, format: uuid }
 *                     customer: { type: object }
 *                     offers: { type: array }
 *                     booking: { type: object, nullable: true }
 *                     workshopType: { type: object, nullable: true }
 *                     workshopTypeService: { type: object, nullable: true }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', requireRole('ADMIN'), broadcastController.getBroadcastById);

module.exports = router;
