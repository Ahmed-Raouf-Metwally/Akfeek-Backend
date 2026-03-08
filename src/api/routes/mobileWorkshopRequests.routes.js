const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const reqCtrl = require('../controllers/mobileWorkshopRequest.controller');

router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Mobile Workshop Requests
 *   description: |
 *     طلبات الورش المتنقلة — العميل ينشئ طلباً، الورش المتطابقة ترسل عروضاً، العميل يختار عرضاً فيُنشأ الحجز والفاتورة.
 *     Mobile workshop request flow: customer creates request → workshops submit offers → customer selects offer → booking + invoice.
 */

/**
 * @swagger
 * /api/mobile-workshop-requests:
 *   post:
 *     summary: Create mobile workshop request (Customer)
 *     description: |
 *       إنشاء طلب ورشة متنقلة. يُبث للورش من نفس النوع والخدمة.
 *       Body: vehicleId, workshopTypeId, workshopTypeServiceId (optional), latitude, longitude, addressText, city.
 *     tags: [Mobile Workshop Requests, 5. الورش المتنقلة (Mobile Workshop)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, workshopTypeId]
 *             properties:
 *               vehicleId: { type: string, format: uuid }
 *               workshopTypeId: { type: string, format: uuid }
 *               workshopTypeServiceId: { type: string, format: uuid, nullable: true }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               addressText: { type: string }
 *               city: { type: string }
 *     responses:
 *       201:
 *         description: Request created; workshops notified
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', reqCtrl.createRequest);

/**
 * @swagger
 * /api/mobile-workshop-requests:
 *   get:
 *     summary: My mobile workshop requests (Customer)
 *     description: قائمة طلبات الورش المتنقلة للمستخدم الحالي (العميل).
 *     tags: [Mobile Workshop Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [BROADCASTING, OFFERS_RECEIVED, ASSIGNED, CANCELLED, EXPIRED]
 *     responses:
 *       200:
 *         description: List of my requests
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', reqCtrl.getMyRequests);

/**
 * @swagger
 * /api/mobile-workshop-requests/{id}:
 *   get:
 *     summary: Get mobile workshop request by ID
 *     description: تفاصيل طلب ورشة متنقلة (مع العروض إن وُجدت). للعميل صاحب الطلب.
 *     tags: [Mobile Workshop Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Request details with offers
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', reqCtrl.getRequestById);

/**
 * @swagger
 * /api/mobile-workshop-requests/{requestId}/select-offer:
 *   post:
 *     summary: Select offer (Customer) — create booking and invoice
 *     description: |
 *       اختيار عرض ورشة متنقلة. يُنشأ الحجز والفاتورة وغرفة المحادثة.
 *       Body: { offerId }. بعد الدفع يتفعّل التتبع والشات.
 *     tags: [Mobile Workshop Requests, 5. الورش المتنقلة (Mobile Workshop)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: requestId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [offerId]
 *             properties:
 *               offerId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Offer selected; booking and invoice created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 booking: { type: object }
 *                 invoice: { type: object }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:requestId/select-offer', reqCtrl.selectOffer);

module.exports = router;
