const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const { requireAdminOrPermission } = require('../middlewares/permission.middleware');
const bookingController = require('../controllers/booking.controller');
const chatController = require('../controllers/chat.controller');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: |
 *     حجز الخدمات — الورش المعتمدة، العناية الشاملة، وورش الغسيل عبر POST /api/bookings (بدون workshopId = حجز خدمة من الفيندور مباشرة).
 *     الوينشات والورش المتنقلة لها اند بوينتات منفصلة (Towing, Mobile Workshop).
 */

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: List all bookings (Admin)
 *     description: |
 *       Get paginated list of all bookings. Admin only.
 *       قائمة الحجوزات مع الصفحات - للمسؤول فقط.
 *       Each item includes providerDisplay (مقدم الخدمة/الفيندور), dateDisplay (التاريخ), timeDisplay (الوقت).
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
 *           enum: [PENDING, CONFIRMED, TECHNICIAN_ASSIGNED, BROADCASTING, OFFERS_RECEIVED, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: List of bookings with provider, date and time for display
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
 *                       bookingNumber: { type: string }
 *                       status: { type: string }
 *                       providerDisplay: { type: string, description: مقدم الخدمة / الفيندور (عربي) }
 *                       providerDisplayEn: { type: string, description: Service provider / Vendor (English) }
 *                       dateDisplay: { type: string, description: التاريخ للعرض }
 *                       timeDisplay: { type: string, nullable: true, description: الوقت للعرض }
 *                       scheduledDate: { type: string, format: date-time, nullable: true }
 *                       scheduledTime: { type: string, nullable: true }
 *                       totalPrice: { type: number }
 *                       customer: { type: object }
 *                       vehicle: { type: object }
 *                       workshop: { type: object, nullable: true }
 *                       mobileWorkshop: { type: object, nullable: true }
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
 *     summary: My bookings (Customer) — حجوزاتي / حالة الحجز
 *     description: |
 *       العميل يشوف قائمة حجوزاته وحالة كل حجز (قيد الانتظار، مؤكد، قيد التنفيذ، مكتمل، ملغي).
 *       Customer gets their bookings with status. Includes workshop/vendor info, date, time. Use for certified workshop, comprehensive care, car wash.
 *     tags: [Bookings, 1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         description: تصفية حسب الحالة — Filter by booking status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: قائمة حجوزات العميل مع الحالة — Current user bookings with status, providerDisplay, dateDisplay, timeDisplay
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       bookingNumber: { type: string }
 *                       status: { type: string, description: PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED }
 *                       providerDisplay: { type: string }
 *                       providerDisplayEn: { type: string }
 *                       dateDisplay: { type: string, nullable: true }
 *                       timeDisplay: { type: string, nullable: true }
 *                       scheduledDate: { type: string, format: date-time, nullable: true }
 *                       scheduledTime: { type: string, nullable: true }
 *                       totalPrice: { type: number }
 *                       workshop: { type: object, nullable: true }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/my', bookingController.getMyBookings);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID (Admin or Customer — تفاصيل حجزي)
 *     description: |
 *       العميل يشوف تفاصيل حجزه وحالته (رقم الحجز، الحالة، الورشة، التاريخ، الفاتورة).
 *       Customer views their booking details and status. Admin can view any booking.
 *     tags: [Bookings, 1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details with status, provider, date, time, invoice
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     bookingNumber: { type: string }
 *                     status: { type: string, description: PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED }
 *                     providerDisplay: { type: string }
 *                     providerDisplayEn: { type: string }
 *                     dateDisplay: { type: string, nullable: true }
 *                     timeDisplay: { type: string, nullable: true }
 *                     customer: { type: object }
 *                     vehicle: { type: object }
 *                     workshop: { type: object, nullable: true }
 *                     mobileWorkshop: { type: object, nullable: true }
 *                     invoice: { type: object, nullable: true }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Not allowed to view this booking
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// Chat (عميل + فيندور الورشة المتنقلة) — قبل :id لتفادي التطابق
router.get('/:bookingId/chat/messages', chatController.getMessages);
router.post('/:bookingId/chat/messages', chatController.sendMessage);

/**
 * @swagger
 * /api/bookings/{id}/inspection-report:
 *   get:
 *     summary: Get inspection report for booking (customer / workshop vendor / admin)
 *     description: |
 *       تقرير التقييم/الكشف للورشة المعتمدة مع البنود وتقدير التكلفة. يُحدَّث من الورشة عبر PUT /api/workshops/profile/me/bookings/{bookingId}/inspection.
 *       When status is COMPLETED/APPROVED: if unpaid, invoice gains INSPECTION_LINE / REPAIR_ESTIMATE; if already paid, report becomes PENDING_CUSTOMER until PATCH .../inspection-supplement/approve or reject.
 *     tags: [Bookings, 1. الورش المعتمدة (Certified Workshops)]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/inspection-report', bookingController.getBookingInspectionReport);

/** Customer: approve supplemental invoice lines after initial payment (report status PENDING_CUSTOMER). */
router.patch('/:id/inspection-supplement/approve', bookingController.approveInspectionSupplement);
/** Customer: reject supplemental estimate. */
router.patch('/:id/inspection-supplement/reject', bookingController.rejectInspectionSupplement);

router.get('/:id', bookingController.getBookingById);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create booking (الورش المعتمدة / العناية الشاملة)
 *     description: |
 *       إنشاء حجز جديد. يُستخدم لنوعين من الخدمات:
 *
 *       **1) الورش المعتمدة (Certified Workshop):** يمكنك الحجز بإحدى الطرق:
 *       - **workshopId فقط** (بدون services) → سيتم حجز خدمة الفحص/التشخيص تلقائياً (إن وُجدت للورشة، وإلا أول خدمة فعالة).
 *       - **workshopServiceIds** — معرفات خدمات الورشة (من GET /api/workshops/{id}/services). يمكن عدم إرسال workshopId وسيتم استنتاجه إذا كانت كل الخدمات لنفس الورشة.
 *       - **serviceIds** — معرفات خدمات من الكتالوج العام (category=CERTIFIED_WORKSHOP). يمكن عدم إرسال workshopId وسيتم استنتاجه إذا كانت كل الخدمات لنفس الورشة/الفيندور.
 *       - **بدون خدمات:** إذا أرسلت workshopId فقط بدون serviceIds/workshopServiceIds، سيتم حجز خدمة الفحص/التشخيص تلقائياً إن وُجدت للورشة (وإلا أول خدمة فعالة).
 *       - **مع خدمات:** إذا أرسلت serviceIds أو workshopServiceIds مع workshopId، سيتم أيضًا إضافة خدمة الفحص/التشخيص تلقائيًا (إن وُجدت) بجانب الخدمات المختارة.
 *
 *       **2) العناية الشاملة (Comprehensive Care):** أرسل serviceIds فقط (بدون workshopId). serviceIds = خدمات تابعة لفيندور عناية شاملة.
 *
 *       **3) ورش الغسيل (Car Wash):** نفس (2) — أرسل serviceIds فقط (خدمات تابعة لفيندور غسيل، من GET /api/services?category=CLEANING أو vendorId).
 *
 *       **رحلة أكفيك:** بعد إنشاء حجز ورشة معتمدة، اربطه بالرحلة عبر `PATCH /api/akfeek-journey/{journeyId}/step/WORKSHOP_BOOKING/link` مع `{ "bookingId" }` ثم ادفع فاتورة الورشة.
 *
 *       Create a new booking. (1) Certified Workshop — workshopId + deliveryMethod + workshopServiceIds or serviceIds; (2) Comprehensive Care; (3) Car Wash — serviceIds only (like 2).
 *     tags: [Bookings, Akfeek Journey, 1. الورش المعتمدة (Certified Workshops), 2. ورش الغسيل (Car Wash), 3. العناية الشاملة (Comprehensive Care)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scheduledDate]
 *             description: |
 *               ملاحظة: يجب إرسال واحد على الأقل من:
 *               - workshopId (حجز ورشة معتمدة بدون اختيار خدمات — سيتم إضافة خدمة الفحص تلقائياً)
 *               - serviceIds (خدمات الكتالوج)
 *               - workshopServiceIds (خدمات الورشة المعتمدة من /api/workshops/{id}/services)
 *             oneOf:
 *               - required: [scheduledDate, workshopId]
 *               - required: [scheduledDate, serviceIds]
 *               - required: [scheduledDate, workshopServiceIds]
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *                 description: مطلوب من الأدمن فقط؛ المستخدم العادي يُستخدم معرفه تلقائياً. Admin only — otherwise current user.
 *               vehicleId:
 *                 type: string
 *                 format: uuid
 *                 description: معرف المركبة (اختياري). يصبح مطلوبًا فقط إذا كانت أي خدمة مختارة requiresVehicle=true — Vehicle ID (optional, required only when service requires a vehicle)
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
 *                 description: |
 *                   للورش المعتمدة فقط (اختياري).
 *                   - إذا لم يُرسل وكان `serviceIds` لخدمات `category=CERTIFIED_WORKSHOP` لنفس الورشة/الفيندور → سيتم استنتاجه تلقائيًا.
 *                   - إذا لم يُرسل وكان `workshopServiceIds` كلها لنفس الورشة → سيتم استنتاجه تلقائيًا.
 *                   Certified workshop ID (optional; can be inferred).
 *               deliveryMethod:
 *                 type: string
 *                 enum: [FLATBED, SELF_DELIVERY]
 *                 description: |
 *                   للورش المعتمدة فقط (اختياري). FLATBED = ونش، SELF_DELIVERY = إيصال ذاتي (افتراضي).
 *                   Certified workshop only (optional; defaults to SELF_DELIVERY).
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: |
 *                   مصفوفة معرفات الخدمات من الكتالوج العام (عناية شاملة / غسيل / ورشة معتمدة).
 *                   - عند اختيار خدمات ورش معتمدة (category=CERTIFIED_WORKSHOP) لنفس vendorId يمكن الحجز بدون workshopId وسيتم استنتاجه تلقائيًا.
 *                   - إذا أي خدمة requiresVehicle=true → vehicleId يصبح مطلوبًا.
 *                   Array of catalog Service IDs.
 *               workshopServiceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: |
 *                   للورش المعتمدة فقط. مصفوفة معرفات خدمات الورشة (CertifiedWorkshopService من GET /api/workshops/{id}/services).
 *                   إذا لم يُرسل workshopId، سيتم استنتاجه تلقائيًا بشرط أن كل workshopServiceIds تابعة لنفس الورشة.
 *                   For certified workshop — IDs from GET /api/workshops/:id/services. workshopId can be inferred if all IDs belong to the same workshop.
 *               addressId:
 *                 type: string
 *                 format: uuid
 *                 description: معرف العنوان (اختياري). Address ID (optional).
 *               notes:
 *                 type: string
 *                 description: ملاحظات (اختياري). Notes (optional).
 *           examples:
 *             bookByServiceIds:
 *               summary: حجز باستخدام serviceIds (Catalog services)
 *               value:
 *                 scheduledDate: "2026-03-15T00:00:00.000Z"
 *                 scheduledTime: "10:00"
 *                 serviceIds:
 *                   - "00000000-0000-0000-0000-000000000001"
 *                   - "00000000-0000-0000-0000-000000000002"
 *                 notes: "ملاحظات اختيارية"
 *             certifiedWorkshopNoServices:
 *               summary: حجز ورشة معتمدة بدون اختيار خدمات (سيتم إضافة الفحص تلقائياً) — Certified Workshop (auto inspection)
 *               value:
 *                 workshopId: "00000000-0000-0000-0000-000000000099"
 *                 scheduledDate: "2026-03-15T00:00:00.000Z"
 *                 scheduledTime: "12:00"
 *                 notes: "اختياري"
 *             certifiedWorkshop:
 *               summary: حجز ورشة معتمدة (خدمات الورشة) + addressId — Certified Workshop (workshop services)
 *               value:
 *                 scheduledDate: "2026-03-15T00:00:00.000Z"
 *                 scheduledTime: "10:00"
 *                 workshopServiceIds:
 *                   - "00000000-0000-0000-0000-000000000011"
 *                   - "00000000-0000-0000-0000-000000000012"
 *                 addressId: "00000000-0000-0000-0000-000000000021"
 *                 notes: "ملاحظات اختيارية"
 *             certifiedWorkshopBoth:
 *               summary: حجز ورشة معتمدة بخدمة + الفحص تلقائياً (الاتنين) — Certified Workshop (selected service + auto inspection)
 *               description: |
 *                 أرسل خدمة/خدمات من الورشة في workshopServiceIds.
 *                 النظام سيضيف خدمة الفحص/التشخيص تلقائياً بجانبها (إذا لم تكن ضمن الاختيار).
 *               value:
 *                 workshopId: "00000000-0000-0000-0000-000000000099"
 *                 scheduledDate: "2026-03-15T00:00:00.000Z"
 *                 scheduledTime: "12:30"
 *                 workshopServiceIds:
 *                   - "00000000-0000-0000-0000-000000000012"
 *                 notes: "عايز الفحص + تبديل زيت"
 *             comprehensiveCare:
 *               summary: حجز عناية شاملة — Comprehensive Care
 *               value:
 *                 scheduledDate: "2026-03-15T00:00:00.000Z"
 *                 scheduledTime: "14:00"
 *                 serviceIds: ["uuid-خدمة-عناية-1", "uuid-خدمة-عناية-2"]
 *                 addressId: "uuid-العنوان"
 *                 notes: "ملاحظات"
 *             carWash:
 *               summary: حجز ورش غسيل — Car Wash (مثل العناية الشاملة)
 *               value:
 *                 scheduledDate: "2026-03-15T00:00:00.000Z"
 *                 scheduledTime: "10:00"
 *                 serviceIds: ["uuid-خدمة-غسيل-من-فيندور-غسيل"]
 *                 addressId: "uuid-العنوان"
 *                 notes: "غسيل خارجي"
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

/**
 * @swagger
 * /api/bookings/{id}/confirm:
 *   patch:
 *     summary: Confirm booking (Vendor – Certified Workshop)
 *     description: |
 *       فيندور الورشة المعتمدة يؤكد الحجز (PENDING → CONFIRMED).
 *       Certified workshop vendor confirms a pending booking for their workshop.
 *       **رحلة أكفيك:** قد يُنشأ/يُتاح دفع فاتورة الورشة بعد التأكيد — ثم `PATCH /api/invoices/my/{id}/pay` لإكمال خطوة WORKSHOP_BOOKING.
 *     tags: [Bookings, 1. الورش المعتمدة (Certified Workshops), Akfeek Journey]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking confirmed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Booking confirmed' }
 *                 messageAr: { type: string, example: 'تم تأكيد الحجز' }
 *                 data: { type: object, description: Updated booking }
 *       400:
 *         description: Only pending bookings can be confirmed
 *       403:
 *         description: Not the vendor of this booking
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/confirm', requireRole('VENDOR'), bookingController.confirmBookingAsVendor);

/**
 * @swagger
 * /api/bookings/{id}/start:
 *   patch:
 *     summary: Start booking (Vendor – Certified Workshop) — بدء تنفيذ الحجز
 *     description: |
 *       فيندور الورشة يغيّر حالة الحجز من مؤكد إلى قيد التنفيذ (CONFIRMED → IN_PROGRESS).
 *       Vendor starts work on a confirmed booking.
 *     tags: [Bookings, 1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking status set to IN_PROGRESS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Booking started' }
 *                 messageAr: { type: string, example: 'تم بدء تنفيذ الحجز' }
 *                 data: { type: object, description: Updated booking }
 *       400:
 *         description: Only confirmed bookings can be started
 *       403:
 *         description: Not the vendor of this booking
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/start', requireRole('VENDOR'), bookingController.startBookingAsVendor);

/**
 * @swagger
 * /api/bookings/{id}/complete:
 *   patch:
 *     summary: Mark booking as completed (Vendor)
 *     description: |
 *       الفيندور صاحب الخدمة/الورشة يحدد الحجز كمكتمل بعد إتمام الخدمة (ورشة معتمدة، عناية شاملة، ورش غسيل).
 *       Vendor marks booking as COMPLETED when service is done at venue.
 *     tags: [Bookings, 1. الورش المعتمدة (Certified Workshops), 2. ورش الغسيل (Car Wash), 3. العناية الشاملة (Comprehensive Care)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking marked as completed
 *       403:
 *         description: Not the vendor of this booking
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch('/:id/complete', requireRole('VENDOR'), bookingController.completeBookingAsVendor);

/**
 * @swagger
 * /api/bookings/{id}/mobile-workshop-status:
 *   patch:
 *     summary: Update mobile workshop booking status (Vendor) — في الطريق / وصل / جاري التنفيذ / تم
 *     description: |
 *       لفيندور الورشة المتنقلة فقط. يسمح بالانتقالات التالية فقط:
 *       - TECHNICIAN_ASSIGNED -> TECHNICIAN_EN_ROUTE
 *       - TECHNICIAN_EN_ROUTE -> ARRIVED
 *       - ARRIVED -> IN_PROGRESS
 *       - IN_PROGRESS -> COMPLETED
 *     tags: [Bookings, 5. الورش المتنقلة (Mobile Workshop)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [TECHNICIAN_EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED]
 *               reason:
 *                 type: string
 *                 description: Optional reason for transition
 *     responses:
 *       200:
 *         description: Booking status updated
 *       400:
 *         description: Invalid booking type or invalid transition
 *       403:
 *         description: Not the owner mobile workshop vendor
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/mobile-workshop-status', requireRole('VENDOR'), bookingController.updateMobileWorkshopBookingStatusAsVendor);

// Real-time tracking endpoints (for customers)
const trackingController = require('../controllers/tracking.controller');
router.get('/:bookingId/track', trackingController.getTrackingInfo);
router.get('/:bookingId/location-history', trackingController.getLocationHistory);

module.exports = router;
