const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const router  = express.Router();
const auth    = require('../middlewares/auth.middleware');
const role    = require('../middlewares/role.middleware');
const ctrl    = require('../controllers/winch.controller');
const prisma  = require('../../utils/database/prisma');
const { getFullUrl } = require('../../utils/urlUtils');

const winchUploadDir = path.join(__dirname, '../../../uploads/winches');
if (!fs.existsSync(winchUploadDir)) fs.mkdirSync(winchUploadDir, { recursive: true });

const winchStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(winchUploadDir, req.params.id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `image-${Date.now()}${ext}`);
  },
});
const winchUpload = multer({
  storage: winchStorage,
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only images (JPEG, PNG, WebP) allowed'), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(auth);

/**
 * @swagger
 * /api/winches/my:
 *   get:
 *     summary: "1. ونشي — Get my winch (Winch vendor)"
 *     description: فيندور السحب (TOWING_SERVICE) يجلب بيانات الوينش المرتبط بحسابه.
 *     tags: [4. Towing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: بيانات الونش
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Winch' }
 *       404:
 *         description: No winch linked to your vendor account
 */
router.get('/my', role(['VENDOR', 'ADMIN']), ctrl.getMyWinch);

/**
 * @swagger
 * /api/winches/my:
 *   post:
 *     summary: "إنشاء ونش — Create my winch (Winch vendor)"
 *     description: |
 *       فيندور السحب (TOWING_SERVICE) ينشئ ونشه المرتبط بحسابه. كل فيندور مسموح له بونش واحد فقط.
 *       يتطلب تسجيل الدخول كـ VENDOR من نوع TOWING_SERVICE.
 *     tags: [4. Towing]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, plateNumber]
 *             properties:
 *               name:         { type: string, example: "Eagle Towing" }
 *               nameAr:       { type: string, example: "نسر للسحب" }
 *               plateNumber:  { type: string, example: "ABC 1234" }
 *               vehicleModel: { type: string, example: "Toyota Hilux" }
 *               year:         { type: integer, example: 2022 }
 *               capacity:     { type: number, example: 3.5, description: "طاقة السحب بالطن" }
 *               description:  { type: string }
 *               city:         { type: string, example: "الرياض" }
 *               latitude:     { type: number, example: 24.7136 }
 *               longitude:    { type: number, example: 46.6753 }
 *               basePrice:    { type: number, example: 50 }
 *               pricePerKm:   { type: number, example: 5 }
 *               minPrice:     { type: number, example: 80 }
 *               currency:     { type: string, example: "SAR", default: "SAR" }
 *           example:
 *             name: "Eagle Towing"
 *             nameAr: "نسر للسحب"
 *             plateNumber: "ABC 1234"
 *             vehicleModel: "Toyota Hilux"
 *             year: 2022
 *             capacity: 3.5
 *             city: "الرياض"
 *             latitude: 24.7136
 *             longitude: 46.6753
 *             basePrice: 50
 *             pricePerKm: 5
 *             minPrice: 80
 *     responses:
 *       201:
 *         description: تم إنشاء الونش بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Winch' }
 *       400:
 *         description: name and plateNumber are required
 *       403:
 *         description: You must be a TOWING_SERVICE vendor
 *       409:
 *         description: You already have a winch linked
 */
router.post('/my', role(['VENDOR', 'ADMIN']), ctrl.createMyWinch);

/**
 * @swagger
 * /api/winches/my:
 *   put:
 *     summary: "تحديث ونشي — Update my winch (Winch vendor)"
 *     description: |
 *       فيندور السحب يحدّث بيانات ونشه. الفيلدز المسموح بتحديثها: name, nameAr, plateNumber,
 *       vehicleModel, year, capacity, description, city, latitude, longitude, isAvailable,
 *       basePrice, pricePerKm, minPrice, currency.
 *       الفيلدز المحظورة: isVerified, isActive, vendorId (تعديل ADMIN فقط).
 *     tags: [4. Towing]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:         { type: string }
 *               nameAr:       { type: string }
 *               plateNumber:  { type: string }
 *               vehicleModel: { type: string }
 *               year:         { type: integer }
 *               capacity:     { type: number }
 *               description:  { type: string }
 *               city:         { type: string }
 *               latitude:     { type: number }
 *               longitude:    { type: number }
 *               isAvailable:  { type: boolean }
 *               basePrice:    { type: number }
 *               pricePerKm:   { type: number }
 *               minPrice:     { type: number }
 *               currency:     { type: string }
 *           example:
 *             city: "جدة"
 *             latitude: 21.5433
 *             longitude: 39.1728
 *             isAvailable: true
 *             basePrice: 60
 *             pricePerKm: 6
 *     responses:
 *       200:
 *         description: تم التحديث بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Winch' }
 *       404:
 *         description: No winch linked to your vendor account
 */
router.put('/my', role(['VENDOR', 'ADMIN']), ctrl.updateMyWinch);

/**
 * @swagger
 * /api/winches/my:
 *   delete:
 *     summary: "حذف ونشي — Delete my winch (Winch vendor)"
 *     description: |
 *       فيندور السحب يحذف ونشه. **غير مسموح** بالحذف إذا كان هناك مهام نشطة
 *       (TECHNICIAN_ASSIGNED، TECHNICIAN_EN_ROUTE، ARRIVED، أو IN_PROGRESS).
 *       أكمل جميع المهام النشطة أولاً قبل الحذف.
 *     tags: [4. Towing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: تم حذف الونش بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string, example: "Winch deleted successfully" }
 *       404:
 *         description: No winch linked to your vendor account
 *       409:
 *         description: لا يمكن الحذف — يوجد مهام نشطة
 */
router.delete('/my', role(['VENDOR', 'ADMIN']), ctrl.deleteMyWinch);

/**
 * @swagger
 * /api/winches/my/upload-image:
 *   post:
 *     summary: "رفع صورة الونش — Upload my winch image (Winch vendor)"
 *     description: |
 *       فيندور السحب يرفع أو يستبدل صورة ونشه.
 *       الصيغ المقبولة: JPEG، PNG، WebP. الحد الأقصى للحجم: 5 MB.
 *       يجب إرسال الصورة كـ multipart/form-data بالحقل `image`.
 *     tags: [4. Towing]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "ملف الصورة (JPEG, PNG, WebP — max 5MB)"
 *     responses:
 *       200:
 *         description: تم رفع الصورة بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 imageUrl: { type: string, example: "/uploads/winches/abc123/image-1710000000000.jpg" }
 *       400:
 *         description: No image uploaded
 *       404:
 *         description: No winch linked to your vendor account
 */
router.post(
  '/my/upload-image',
  role('VENDOR'),
  (req, res, next) => {
    req.params.id = 'vendor-my';
    next();
  },
  multer({
    storage: multer.diskStorage({
      destination: async (req, file, cb) => {
        const prisma = require('../../utils/database/prisma');
        const vendor = await prisma.vendorProfile.findFirst({
          where: { userId: req.user.id, vendorType: 'TOWING_SERVICE' },
          include: { winch: true },
        });
        const winchId = vendor?.winch?.id || 'unknown';
        req._vendorWinchId = winchId;
        const dir = path.join(winchUploadDir, winchId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `image-${Date.now()}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
      cb(ok ? null : new Error('Only images allowed'), ok);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }).single('image'),
  ctrl.uploadMyWinchImage
);

/**
 * @swagger
 * /api/winches/my/broadcasts:
 *   get:
 *     summary: "2. طلبات السحب القريبة — Get nearby towing requests (Winch vendor)"
 *     description: |
 *       فيندور الوينش (المتحكم بفلو الوينش) يستدعي هذا لرؤية الطلبات القريبة من موقع ونشه. يُرسل أيضاً push عبر Socket (حدث winch:new_request) عند إنشاء أي طلب جديد قريب.
 *       يتطلب تسجيل دخول كـ VENDOR ووجود ونش مرتبط بحسابك. يرجع قائمة مع المسافة وسعرك المقترح (yourPrice من pricePerKm).
 *     tags: [4. Towing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: قائمة البثوط القريبة مع تفاصيل الرحلة وسعرك
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     broadcasts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, description: "broadcastId" }
 *                           customer: { type: object }
 *                           vehicle: { type: object }
 *                           pickupLocation: { type: object }
 *                           destinationLocation: { type: object }
 *                           distance: { type: number }
 *                           tripDistanceKm: { type: number }
 *                           estimatedArrival: { type: number }
 *                           yourPrice: { type: number, description: "السعر المحسوب من pricePerKm" }
 *                           urgency: { type: string }
 *                           vehicleCondition: { type: string }
 *                           expiresAt: { type: string }
 *                           myOffer: { type: object, nullable: true }
 *                     message: { type: string, description: "إن لم يكن هناك طلبات أو الوينش غير متاح" }
 *       404:
 *         description: No winch linked to your vendor account
 */
router.get('/my/broadcasts', role(['VENDOR', 'ADMIN']), ctrl.getMyBroadcasts);

/**
 * @swagger
 * /api/winches/my/broadcasts/{broadcastId}/offer:
 *   post:
 *     summary: "3. إرسال عرض — Submit winch offer (Winch vendor)"
 *     description: |
 *       فيندور الوينش يرسل عرضاً للطلب. السعر يُحسب تلقائياً من basePrice + (مسافة الرحلة × pricePerKm) مع احترام minPrice.
 *       Body اختياري (مثلاً message فقط). لا حاجة لإرسال السعر — يُحسب من إعدادات الوينش.
 *     tags: [4. Towing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: broadcastId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message: { type: string, description: "رسالة اختيارية للعميل — السعر يُحسب تلقائياً (basePrice + مسافة × pricePerKm)" }
 *           example:
 *             message: "سنصل خلال 15 دقيقة"
 *     responses:
 *       201:
 *         description: تم إرسال العرض — السعر محسوب من إعدادات الوينش (basePrice + مسافة الرحلة × pricePerKm)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     offer: { type: object, properties: { id, broadcastId, bidAmount, message, estimatedArrival, status, createdAt } }
 *       400:
 *         description: Broadcast expired or already submitted offer
 *       404:
 *         description: Broadcast not found or no winch linked
 */
router.post('/my/broadcasts/:broadcastId/offer', role(['VENDOR', 'ADMIN']), ctrl.submitMyOffer);

/**
 * @swagger
 * /api/winches/my/jobs:
 *   get:
 *     summary: "5. مهام فيندور الوينش — Get my assigned jobs (Winch vendor)"
 *     description: |
 *       فيندور الوينش (VENDOR) هو المتحكم — قائمة الحجوزات التي قبل العميل عرض هذا الوينش لها.
 *       يعرض الحجوزات بحالة TECHNICIAN_ASSIGNED أو TECHNICIAN_EN_ROUTE أو ARRIVED أو IN_PROGRESS. بعد الدفع يتفتح السوكت للتتبع والمحادثة.
 *     tags: [4. Towing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: قائمة المهام المعينة لفيندور الوينش
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           bookingNumber: { type: string }
 *                           status: { type: string }
 *                           customer: { type: object }
 *                           vehicle: { type: object }
 *                           pickupLocation: { type: object }
 *                           destinationLocation: { type: object }
 *                           agreedPrice: { type: number }
 *                           scheduledDate: { type: string }
 */
router.get('/my/jobs', role(['VENDOR', 'ADMIN']), ctrl.getMyJobs);

/**
 * @swagger
 * /api/winches/my/jobs/{jobId}/status:
 *   patch:
 *     summary: "5. تحديث حالة المهمة — Update job status (Winch vendor)"
 *     description: |
 *       فيندور الوينش يحدّث الحالة أثناء تنفيذ النقل. التسلسل: TECHNICIAN_ASSIGNED → TECHNICIAN_EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED.
 *     tags: [4. Towing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Booking ID (معرف الحجز)
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
 *                 description: "الحالة التالية في التسلسل (لا استخدام لـ TECHNICIAN_ARRIVED — استخدم ARRIVED)"
 *     responses:
 *       200:
 *         description: تم تحديث الحالة
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Unauthorized (الحجز غير معيّن لونشك)
 */
router.patch('/my/jobs/:jobId/status', role(['VENDOR', 'ADMIN']), ctrl.updateMyJobStatus);

/**
 * @swagger
 * /api/winches:
 *   get:
 *     summary: قائمة مقدمي السحب — List all winches [CRUD - Read List]
 *     tags: [4. Towing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of winches
 */
router.get('/',     ctrl.getAllWinches);

/**
 * @swagger
 * /api/winches/{id}:
 *   get:
 *     summary: عرض ونش بالمعرف — Get winch by ID [CRUD - Read One]
 *     tags: [4. Towing]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Winch details
 *       404:
 *         description: Winch not found
 */
router.get('/:id',  ctrl.getWinchById);

/**
 * @swagger
 * /api/winches:
 *   post:
 *     summary: إضافة ونش (أدمن) — Create winch [CRUD - Create]
 *     tags: [4. Towing]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vendorId: { type: string, format: uuid }
 *               plateNumber: { type: string }
 *               capacity: { type: number }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Winch created
 */
router.post('/',    role('ADMIN'), ctrl.createWinch);

/**
 * @swagger
 * /api/winches/{id}:
 *   put:
 *     summary: تحديث ونش (أدمن) — Update winch [CRUD - Update]
 *     tags: [4. Towing]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vendorId: { type: string }
 *               plateNumber: { type: string }
 *               capacity: { type: number }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Winch updated
 */
router.put('/:id',  role('ADMIN'), ctrl.updateWinch);

/**
 * @swagger
 * /api/winches/{id}:
 *   delete:
 *     summary: حذف ونش (أدمن) — Delete winch [CRUD - Delete]
 *     tags: [4. Towing]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Winch deleted
 */
router.delete('/:id', role('ADMIN'), ctrl.deleteWinch);

router.post(
  '/:id/upload-image',
  role('ADMIN'),
  winchUpload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
      const winch = await prisma.winch.findUnique({ where: { id: req.params.id } });
      if (!winch) return res.status(404).json({ success: false, error: 'Winch not found' });
      const imageUrl = `/uploads/winches/${req.params.id}/${req.file.filename}`;
      await prisma.winch.update({
        where: { id: req.params.id },
        data: { imageUrl },
      });
      res.json({ success: true, imageUrl: getFullUrl(imageUrl) });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
