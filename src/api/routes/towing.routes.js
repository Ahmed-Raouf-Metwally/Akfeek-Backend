const express = require('express');
const router = express.Router();
const towingController = require('../controllers/towing.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: 4. السطحة (Towing)
 *   description: |
 *     فلو السطحة (للـMobile):
 *     - العميل يرسل request بـ `POST /api/bookings/towing/request` (pickupLocation, destinationLocation).
 *     - فيندور/وينش يرد بـ عروض السعر والوقت عبر `GET /api/bookings/towing/{broadcastId}/offers`.
 *     - العميل يختار ويعمل accept بـ `POST /api/bookings/towing/{broadcastId}/offers/{offerId}/accept`.
 */

/**
 * @swagger
 * /api/bookings/towing/request:
 *   post:
 *     summary: "1. إنشاء طلب سحب (ونش) — Create towing request"
 *     description: |
 *       **الخطوة الثانية بعد /quote**:
 *       - الخطوة 0 (اختيارية للموبايل): `POST /api/bookings/towing/quote` للحصول على `estimatedPrice` و `estimatedDurationMinutes` فقط (بدون حجز).
 *       - الخطوة 1: يستدعي العميل هذا الاندبوينت بنفس `pickupLocation` و `destinationLocation` (ويمكن أن يرسل نفس السعر/الوقت للعرض فقط).
 *       هذه الخطوة:
 *       - تُنشئ `booking` بحالة `BROADCASTING`
 *       - تُنشئ `jobBroadcast` وتبث الطلب للونشات القريبة
 *       - تُرسل push عبر Socket (`winch:new_request`) لفيندورات الونش.
 *       بعدها الوينشات/الفنيين يردّوا بعروض السعر والوقت، والعميل يعمل accept لإنشاء الحجز النهائي وربط التتبع.
 *       **رحلة أكفيك:** بعد الدفع اربط `bookingId` بـ `PATCH /api/akfeek-journey/{journeyId}/step/{INSURANCE_TOW|TOW_TO_WORKSHOP|POST_REPAIR_TOW_HOME}/link`.
 *     tags: [4. السطحة (Towing), Akfeek Journey]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickupLocation
 *               - destinationLocation
 *             properties:
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
 *             pickupLocation:
 *               latitude: 24.7136
 *               longitude: 46.6753
 *               address: "طريق الملك فهد، نقطة الالتقاط، الرياض"
 *             destinationLocation:
 *               latitude: 24.75
 *               longitude: 46.7
 *               address: "ورشة الصيانة، العليا، الرياض"
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
 *         description: No winches available in area, or `vehicleId` was provided but vehicle not found
 */
router.post('/request', authMiddleware, towingController.createRequest);

/**
 * @swagger
 * /api/bookings/towing/quote:
 *   post:
 *     summary: "0. جلب تسعيرة السطحة (السعر + الوقت) بدون إنشاء حجز"
 *     description: |
 *       الخطوة الأولى للموبايل (Quote):
 *       - يرسل `pickupLocation` و `destinationLocation`
 *       - الباك يرجع `estimatedPrice` و `estimatedDurationMinutes`
 *       - **لا يتم إنشاء booking ولا broadcast**
 *       ثم بعد استلام السعر/الوقت يعمل العميل:
 *       POST /api/bookings/towing/request لإنشاء الـbroadcast والـbooking ثم انتظار عروض الوينش.
 *     tags: [4. السطحة (Towing)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickupLocation
 *               - destinationLocation
 *             properties:
 *               pickupLocation:
 *                 type: object
 *                 required: [latitude, longitude, address]
 *                 properties:
 *                   latitude: { type: number, description: "خط العرض" }
 *                   longitude: { type: number, description: "خط الطول" }
 *                   address: { type: string, description: "عنوان" }
 *               destinationLocation:
 *                 type: object
 *                 required: [latitude, longitude, address]
 *                 properties:
 *                   latitude: { type: number, description: "خط العرض" }
 *                   longitude: { type: number, description: "خط الطول" }
 *                   address: { type: string, description: "عنوان" }
 *     responses:
 *       200:
 *         description: التسعيرة المحسوبة (السعر + الوقت) بدون إنشاء booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     estimatedDurationMinutes: { type: number }
 *                     estimatedPrice: { type: number }
 */
router.post('/quote', authMiddleware, towingController.createQuote);

/**
 * @swagger
 * /api/bookings/towing/my:
 *   get:
 *     summary: "قائمة طلبات السطحة الخاصة بي (نشطة/مكتملة)"
 *     description: |
 *       للعميل: يعرض كل طلبات/خدمات السطحة الخاصة به ويبيّن هل الطلب نشط أم مكتمل.
 *       استخدم `status=ACTIVE` أو `COMPLETED` أو `ALL`.
 *     tags: [4. السطحة (Towing)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, ALL]
 *           default: ALL
 *     responses:
 *       200:
 *         description: قائمة طلبات السطحة الخاصة بالعميل
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           bookingId: { type: string, format: uuid }
 *                           broadcastId: { type: string, format: uuid, nullable: true }
 *                           bookingNumber: { type: string }
 *                           status: { type: string }
 *                           isCompleted: { type: boolean }
 *                           totalPrice: { type: number, nullable: true }
 *                           pickupLocation: { type: object }
 *                           destinationLocation: { type: object }
 *                           createdAt: { type: string, format: date-time }
 *                           completedAt: { type: string, format: date-time, nullable: true }
 */
router.get('/my', authMiddleware, towingController.getMyTowingRequests);

/**
 * @swagger
 * /api/bookings/towing/booking/{bookingId}/socket-access:
 *   get:
 *     summary: "تهيئة الشات/السوكت بعد الدفع بين العميل وفيندور الونش"
 *     description: |
 *       بعد سداد فاتورة الونش، يستدعي العميل أو الفيندور هذا الاندبوينت للحصول على بيانات الانضمام لغرفة السوكت.
 *       يقوم أيضًا بإنشاء `chatRoom` تلقائيًا إذا لم تكن موجودة بعد.
 *       الطرفان المسموح لهما فقط: العميل صاحب الحجز أو الفيندور/السائق المربوط على `technicianId`.
 *       **Current location عبر Socket:**
 *       - بعد `customer:join_booking` يرجع آخر موقع محفوظ تلقائيًا على `booking:current_location`
 *       - ويمكن طلبه يدويًا عبر `booking:get_current_location` مع `bookingId`
 *       - نفس الـpayload يُبث أيضًا على `winch:location_update` و `technician:location_update`
 *     tags: [4. السطحة (Towing)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: بيانات جاهزية الشات والتتبع بعد الدفع
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId: { type: string, format: uuid }
 *                     bookingNumber: { type: string }
 *                     roomId: { type: string, format: uuid }
 *                     socketEnabled: { type: boolean, example: true }
 *                     trackingEnabled: { type: boolean, example: true }
 *                     chatEnabled: { type: boolean, example: true }
 *                     role: { type: string, enum: [customer, driver] }
 *                     joinEvent: { type: string, example: "customer:join_booking" }
 *                     leaveEvent: { type: string, example: "customer:leave_booking" }
 *                     messageEvent: { type: string, example: "booking:message" }
 *                     currentLocationRequestEvent: { type: string, example: "booking:get_current_location" }
 *                     currentLocationResponseEvent: { type: string, example: "booking:current_location" }
 *                     locationEvent: { type: string, example: "winch:location_update" }
 *                     invoice:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         status: { type: string, example: "PAID" }
 *                     counterpart:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         name: { type: string }
 *                         phone: { type: string, nullable: true }
 *                         avatar: { type: string, nullable: true }
 *       403:
 *         description: الدفع لم يتم بعد أو المستخدم غير مصرح له
 *       404:
 *         description: Booking not found
 */
router.get('/booking/:bookingId/socket-access', authMiddleware, towingController.getSocketAccess);

/**
 * @swagger
 * /api/bookings/towing/{broadcastId}:
 *   get:
 *     summary: "تفاصيل البث — Get broadcast details"
 *     description: |
 *       العميل يجلب تفاصيل طلب السحب (البث): موقع الالتقاط والوجهة، المركبة، الحالة، عدد العروض، وقت انتهاء البث.
 *       للعميل صاحب الطلب فقط.
 *     tags: [4. السطحة (Towing)]
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
 *     tags: [4. السطحة (Towing)]
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
 *     tags: [4. السطحة (Towing)]
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
