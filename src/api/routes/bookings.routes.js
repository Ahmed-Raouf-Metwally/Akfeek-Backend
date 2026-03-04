const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const { requireAdminOrPermission } = require('../middlewares/permission.middleware');
const bookingController = require('../controllers/booking.controller');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: |
 *     حجز الخدمات — الورش المعتمدة (Certified Workshop) والعناية الشاملة (Comprehensive Care) عبر POST /api/bookings.
 *     ورش الغسيل والوينشات والورش المتنقلة لها اند بوينتات منفصلة (Car Wash, Towing, Mobile Workshop).
 */

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: List all bookings (Admin)
 *     description: |
 *       Get paginated list of all bookings. Admin only.
 *       قائمة الحجوزات مع الصفحات - للمسؤول فقط.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         description: Filter by booking status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: List of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/', requireAdminOrPermission('bookings'), bookingController.getAllBookings);

/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     summary: My bookings (current user)
 *     description: |
 *       Get current user's bookings (customer appointments). Includes workshop/vendor info.
 *       حجوزاتي - حجوزات المستخدم الحالي مع بيانات الورشة/الفيندور.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Current user bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/my', bookingController.getMyBookings);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     description: Get single booking details. Admin or booking owner.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', bookingController.getBookingById);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create booking (الورش المعتمدة / العناية الشاملة)
 *     description: |
 *       إنشاء حجز جديد. يُستخدم لنوعين من الخدمات:
 *
 *       **1) الورش المعتمدة (Certified Workshop):** أرسل workshopId + deliveryMethod + serviceIds (خدمات الورشة).
 *
 *       **2) العناية الشاملة (Comprehensive Care):** أرسل serviceIds فقط (بدون workshopId وبدون deliveryMethod). serviceIds = خدمات تابعة لفيندور عناية شاملة.
 *
 *       Create a new booking. Used for (1) Certified Workshop — send workshopId, deliveryMethod, serviceIds; (2) Comprehensive Care — send only serviceIds (no workshopId).
 *     tags: [Bookings, 1. الورش المعتمدة (Certified Workshops), 3. العناية الشاملة (Comprehensive Care)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, scheduledDate, serviceIds]
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *                 description: مطلوب من الأدمن فقط؛ المستخدم العادي يُستخدم معرفه تلقائياً. Admin only — otherwise current user.
 *               vehicleId:
 *                 type: string
 *                 format: uuid
 *                 description: معرف المركبة — Vehicle ID
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-03-15T00:00:00.000Z"
 *                 description: تاريخ الموعد
 *               scheduledTime:
 *                 type: string
 *                 example: "10:00"
 *                 description: وقت الموعد (اختياري)
 *               workshopId:
 *                 type: string
 *                 format: uuid
 *                 description: للورش المعتمدة فقط. معرف الورشة المعتمدة. Certified workshop ID — required for certified workshop bookings.
 *               deliveryMethod:
 *                 type: string
 *                 enum: [FLATBED, SELF_DELIVERY]
 *                 description: مطلوب عند إرسال workshopId. FLATBED = ونش، SELF_DELIVERY = إيصال ذاتي. Required when workshopId is provided.
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: مصفوفة معرفات الخدمات (الورشة أو العناية الشاملة). Array of service IDs.
 *               addressId:
 *                 type: string
 *                 format: uuid
 *                 description: معرف العنوان (اختياري). Address ID (optional).
 *               notes:
 *                 type: string
 *                 description: ملاحظات (اختياري). Notes (optional).
 *           examples:
 *             certifiedWorkshop:
 *               summary: حجز ورشة معتمدة — Certified Workshop
 *               value:
 *                 vehicleId: "uuid-المركبة"
 *                 scheduledDate: "2026-03-15T00:00:00.000Z"
 *                 scheduledTime: "10:00"
 *                 workshopId: "uuid-الورشة-المعتمدة"
 *                 deliveryMethod: "SELF_DELIVERY"
 *                 serviceIds: ["uuid-خدمة-1", "uuid-خدمة-2"]
 *                 notes: "ملاحظات اختيارية"
 *             comprehensiveCare:
 *               summary: حجز عناية شاملة — Comprehensive Care
 *               value:
 *                 vehicleId: "uuid-المركبة"
 *                 scheduledDate: "2026-03-15T00:00:00.000Z"
 *                 scheduledTime: "14:00"
 *                 serviceIds: ["uuid-خدمة-عناية-1", "uuid-خدمة-عناية-2"]
 *                 addressId: "uuid-العنوان"
 *                 notes: "ملاحظات"
 *     responses:
 *       201:
 *         description: تم إنشاء الحجز بنجاح — Booking created successfully
 *       400:
 *         description: بيانات غير صالحة أو الورشة غير متاحة — Invalid input or workshop not available
 *       404:
 *         description: المركبة أو الورشة أو الخدمة غير موجودة — Vehicle/Workshop/Service not found
 */
router.post('/', bookingController.createBooking);

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status (Admin)
 *     description: |
 *       Update booking status. Admin only.
 *       تحديث حالة الحجز - للمسؤول فقط.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *               reason:
 *                 type: string
 *                 description: Optional reason for status change
 *     responses:
 *       200:
 *         description: Booking status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.patch('/:id/status', requireAdminOrPermission('bookings'), bookingController.updateBookingStatus);

// Real-time tracking endpoints (for customers)
const trackingController = require('../controllers/tracking.controller');
router.get('/:bookingId/track', trackingController.getTrackingInfo);
router.get('/:bookingId/location-history', trackingController.getLocationHistory);

module.exports = router;
