const express = require('express');
const router = express.Router();
const towingController = require('../controllers/towing.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: 4. Towing
 *   description: "فلو السحب — فيندور الوينش هو المتحكم. العميل يطلب من أين إلى أين، الفيندور يرسل عرضاً، العميل يوافق ويدفع (إيداع حصة الفيندور وخصم عمولة المنصة) ثم يتفتح السوكت للتتبع."
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
 *       **رحلة أكفيك:** بعد الدفع اربط `bookingId` بـ `PATCH /api/akfeek-journey/{journeyId}/step/{INSURANCE_TOW|TOW_TO_WORKSHOP|POST_REPAIR_TOW_HOME}/link`.
 *     tags: [4. Towing, Akfeek Journey]
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
 *                 description: "معرف المركبة المراد سحبها"
 *               pickupLocation:
 *                 type: object
 *                 description: "موقع الالتقاط (من أين) — لحساب المسافة والسعر (basePrice + مسافة × pricePerKm)"
 *                 required: [latitude, longitude, address]
 *                 properties:
 *                   latitude: { type: number, description: "خط العرض" }
 *                   longitude: { type: number, description: "خط الطول" }
 *                   address: { type: string, description: "عنوان الموقع" }
 *               destinationLocation:
 *                 type: object
 *                 description: "الوجهة (إلى أين) — لحساب مسافة الرحلة"
 *                 required: [latitude, longitude, address]
 *                 properties:
 *                   latitude: { type: number, description: "خط العرض" }
 *                   longitude: { type: number, description: "خط الطول" }
 *                   address: { type: string, description: "عنوان الوجهة" }
 *               vehicleCondition:
 *                 type: string
 *                 enum: [NOT_STARTING, ACCIDENT, FLAT_TIRE, ENGINE_FAILURE, OTHER]
 *                 description: "حالة المركبة"
 *               urgency:
 *                 type: string
 *                 enum: [NORMAL, HIGH]
 *                 default: "NORMAL"
 *                 description: "درجة الاستعجال"
 *               notes: { type: string, description: "ملاحظات اختيارية" }
 *               estimatedBudget: { type: number, description: "ميزانية تقديرية (اختياري)" }
 *           example:
 *             vehicleId: "123e4567-e89b-12d3-a456-426614174000"
 *             pickupLocation:
 *               latitude: 24.7136
 *               longitude: 46.6753
 *               address: "طريق الملك فهد، نقطة الالتقاط، الرياض"
 *             destinationLocation:
 *               latitude: 24.75
 *               longitude: 46.7
 *               address: "ورشة الصيانة، العليا، الرياض"
 *             vehicleCondition: "NOT_STARTING"
 *             urgency: "NORMAL"
 *             notes: "السيارة لا تعمل"
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
 *                     nearbyWinchesCount: { type: number, description: "عدد مقدمي السحب القريبين الذين استلموا الطلب" }
 *       404:
 *         description: Vehicle not found or no winches available in area
 */
router.post('/request', authMiddleware, towingController.createRequest);

/**
 * @swagger
 * /api/bookings/towing/{broadcastId}:
 *   get:
 *     summary: "تفاصيل البث — Get broadcast details"
 *     description: |
 *       العميل يجلب تفاصيل طلب السحب (البث): موقع الالتقاط والوجهة، المركبة، الحالة، عدد العروض، وقت انتهاء البث.
 *       للعميل صاحب الطلب فقط.
 *     tags: [4. Towing]
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
 *         description: تفاصيل البث مع الموقع والمركبة والحالة وعدد العروض
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, description: "معرف البث" }
 *                     status: { type: string, description: "BROADCASTING | TECHNICIAN_SELECTED" }
 *                     broadcastUntil: { type: string, format: date-time }
 *                     createdAt: { type: string, format: date-time }
 *                     urgency: { type: string }
 *                     description: { type: string }
 *                     booking: { type: object, properties: { id, bookingNumber, status, totalPrice, vehicle } }
 *                     pickupLocation: { type: object, properties: { latitude, longitude, address } }
 *                     destinationLocation: { type: object, properties: { latitude, longitude, address } }
 *                     estimatedDistanceKm: { type: number }
 *                     estimatedDurationMinutes: { type: number }
 *                     vehicleCondition: { type: string }
 *                     offersCount: { type: integer }
 *       403:
 *         description: غير مصرح — الطلب ليس لصاحب الجلسة
 *       404:
 *         description: Broadcast not found
 */
router.get('/:broadcastId', authMiddleware, towingController.getBroadcastDetails);

/**
 * @swagger
 * /api/bookings/towing/{broadcastId}/offers:
 *   get:
 *     summary: "4. عرض عروض السحب (أسعارها) — Get offers for towing request"
 *     description: |
 *       قائمة العروض من مقدمي السحب/الفنيين مع السعر (bidAmount) لكل عرض. العميل يختار الأنسب ثم يستدعي POST accept.
 *       كل عرض قد يكون من ونش (winch + vendorName) أو من فني (technician).
 *     tags: [4. Towing]
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
 *       **دفع العميل:** `PATCH /api/invoices/my/{invoiceId}/pay` (method: CARD أو WALLET) — ثم يتفتح السوكت للتتبع. استخدم `data.invoice.id` من الاستجابة.
 *       **أدمن/صلاحية فواتير:** `PATCH /api/invoices/{id}/mark-paid`.
 *       **رحلة أكفيك:** بعد الدفع استخدم `PATCH /api/akfeek-journey/{journeyId}/step/INSURANCE_TOW|...|link` مع `bookingId` نفس حجز السحب.
 *     tags: [4. Towing]
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
 */
router.post('/:broadcastId/offers/:offerId/accept', authMiddleware, towingController.acceptOffer);

module.exports = router;
