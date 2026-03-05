const express = require('express');
const router = express.Router();
const towingController = require('../controllers/towing.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: 4. الوينشات (Towing/Winch)
 *   description: "فلو الوينش — فيندور الوينش هو المتحكم. العميل يطلب من أين إلى أين، فيندور الوينش يرسل عرضاً، العميل يوافق ويدفع (إيداع حصة الفيندور وخصم عمولة المنصة) ثم يتفتح السوكت للتتبع."
 */

/**
 * @swagger
 * /api/bookings/towing/request:
 *   post:
 *     summary: "1. إنشاء طلب سحب (ونش) — Create towing request"
 *     description: |
 *       العميل يحدد موقع الالتقاط (من أين) والجهة/الوجهة (إلى أين) مع إحداثيات كل منهما (latitude, longitude, address).
 *       المسافة تُحسب من الإحداثيات، وعندما فيندور الوينش يوافق يُرد عليه السعر المحسوب من (basePrice + مسافة الرحلة × pricePerKm).
 *       يُنشأ الحجز والبث ويُرسل push للوينشات القريبة عبر Socket (winch:new_request). ثم GET offers ثم POST accept.
 *     tags: [4. الوينشات (Winches/Towing)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - pickupLocation
 *               - destinationLocation
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               pickupLocation:
 *                 type: object
 *                 description: "موقع الالتقاط — إحداثيات وعنوان (لحساب المسافة والسعر عند موافقة الفيندور)"
 *                 required: [latitude, longitude, address]
 *                 properties:
 *                   latitude: { type: number, example: 24.7136, description: "خط العرض" }
 *                   longitude: { type: number, example: 46.6753, description: "خط الطول" }
 *                   address: { type: string, example: "King Fahd Road, Riyadh" }
 *               destinationLocation:
 *                 type: object
 *                 description: "الجهة/الوجهة — إحداثيات وعنوان (لحساب مسافة الرحلة والسعر)"
 *                 required: [latitude, longitude, address]
 *                 properties:
 *                   latitude: { type: number, example: 24.7500, description: "خط العرض" }
 *                   longitude: { type: number, example: 46.7000, description: "خط الطول" }
 *                   address: { type: string, example: "Workshop, Riyadh" }
 *               vehicleCondition:
 *                 type: string
 *                 enum: [NOT_STARTING, ACCIDENT, FLAT_TIRE, ENGINE_FAILURE, OTHER]
 *                 example: "NOT_STARTING"
 *               urgency:
 *                 type: string
 *                 enum: [NORMAL, HIGH]
 *                 default: "NORMAL"
 *               notes: { type: string }
 *               estimatedBudget: { type: number }
 *     responses:
 *       201:
 *         description: تم إنشاء الطلب والبث للوينشات القريبة (مع push عبر Socket)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 messageAr: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId: { type: string, format: uuid }
 *                     broadcastId: { type: string, format: uuid }
 *                     status: { type: string, example: "BROADCASTING" }
 *                     estimatedDistanceKm: { type: number }
 *                     estimatedDurationMinutes: { type: number }
 *                     estimatedPrice: { type: number }
 *                     broadcastUntil: { type: string, format: date-time }
 *                     nearbyWinchesCount: { type: number, description: "عدد الوينشات القريبة التي استلمت الطلب" }
 *       404:
 *         description: Vehicle not found or no winches available in area
 */
router.post('/request', authMiddleware, towingController.createRequest);

/**
 * @swagger
 * /api/bookings/towing/{broadcastId}/offers:
 *   get:
 *     summary: "4. عرض عروض الوينشات (أسعارها) — Get offers for towing request"
 *     description: |
 *       قائمة العروض من الوينشات/الفنيين مع السعر (bidAmount) لكل عرض. العميل يختار الأنسب ثم يستدعي POST accept.
 *       كل عرض قد يكون من ونش (winch + vendorName) أو من فني (technician).
 *     tags: [4. الوينشات (Winches/Towing)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: broadcastId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Broadcast ID من استجابة create request
 *     responses:
 *       200:
 *         description: العروض مع السعر وبيانات الوينش/الفني
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     broadcast:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         status: { type: string }
 *                         pickupLocation: { type: object }
 *                         destinationLocation: { type: object }
 *                         expiresAt: { type: string, format: date-time }
 *                     offers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           winch: { type: object, description: "إن كان العرض من ونش", properties: { id, name, nameAr, vendorName, vendorNameAr, distance, estimatedArrival, averageRating, totalTrips } }
 *                           technician: { type: object, description: "إن كان العرض من فني", properties: { id, name, avatar, rating, distance, estimatedArrival } }
 *                           bidAmount: { type: number, description: "السعر المعروض" }
 *                           message: { type: string }
 *                           status: { type: string }
 *                           createdAt: { type: string, format: date-time }
 */
router.get('/:broadcastId/offers', authMiddleware, towingController.getOffers);

/**
 * @swagger
 * /api/bookings/towing/{broadcastId}/offers/{offerId}/accept:
 *   post:
 *     summary: "4. قبول عرض الوينش — Accept winch offer"
 *     description: |
 *       العميل يوافق على عرض فيندور الوينش. يُربط الحجز بفيندور الوينش ويُسجّل نسبة عمولة المنصة وقت الحجز، ويُنشأ فاتورة (PENDING).
 *       الدفع: PATCH /api/invoices/{id}/mark-paid — إيداع حصة الفيندور في محفظته وخصم عمولة المنصة (النسبة المسجلة وقت الحجز)، ثم يتفتح السوكت للتتبع. استخدم data.invoice.id.
 *     tags: [4. الوينشات (Winches/Towing)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: broadcastId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: تم قبول العرض وإنشاء الفاتورة — ادفع الفاتورة لفتح السوكت
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     booking:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         bookingNumber: { type: string }
 *                         status: { type: string, example: "TECHNICIAN_ASSIGNED" }
 *                         technician: { type: object, properties: { id, name, phone, avatar } }
 *                         winch: { type: object, properties: { id, name, vendorName, vendorNameAr } }
 *                         agreedPrice: { type: number }
 *                     invoice:
 *                       type: object
 *                       description: "ادفع هذه الفاتورة لفتح التتبع والمحادثة"
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         invoiceNumber: { type: string }
 *                         totalAmount: { type: number }
 *                         status: { type: string, example: "PENDING" }
 *                         message: { type: string }
 *                         messageAr: { type: string }
 */
router.post('/:broadcastId/offers/:offerId/accept', authMiddleware, towingController.acceptOffer);

module.exports = router;
