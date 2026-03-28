const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const { AppError } = require('../middlewares/error.middleware');
const ctrl = require('../controllers/akfeekJourney.controller');
const { STEP_ORDER } = require('../../services/akfeekJourney.service');

const router = express.Router();

const STEP_SET = new Set(STEP_ORDER);

function validateStepKey(req, res, next) {
  const { stepKey } = req.params;
  if (!STEP_SET.has(stepKey)) {
    return next(new AppError(`Invalid stepKey. Use one of: ${STEP_ORDER.join(', ')}`, 400, 'VALIDATION_ERROR'));
  }
  next();
}

const baseDir = path.join(process.cwd(), 'uploads', 'akfeek-journey');
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const journeyId = req.params.id;
    if (!journeyId) return cb(new AppError('Journey ID required', 400));
    const dir = path.join(baseDir, journeyId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ].includes(String(file.mimetype).toLowerCase());
    cb(ok ? null : new AppError('Only JPEG, PNG, WebP, PDF allowed', 400), ok);
  },
});

router.use(authMiddleware, requireRole(['CUSTOMER']));

/**
 * @swagger
 * /api/akfeek-journey/start:
 *   post:
 *     summary: بدء رحلة أكفيك — Start journey
 *     description: |
 *       عميل فقط. لا يُسمح بأكثر من رحلة ACTIVE لنفس العميل (409).
 *       بعدها استخدم GET /me ثم فلو السحب/الورشة حسب currentStep (انظر وصف تاج Akfeek Journey في أعلى الصفحة).
 *     tags: [Akfeek Journey]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 format: uuid
 *                 description: مُستحسن — نفس المركبة تُستخدم في طلبات السحب
 *     responses:
 *       201:
 *         description: تم الإنشاء — data.journey
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: ليس عميلاً
 *       409:
 *         description: رحلة نشطة موجودة — JOURNEY_ACTIVE
 */
router.post('/start', ctrl.start);

/**
 * @swagger
 * /api/akfeek-journey/me:
 *   get:
 *     summary: رحلتي النشطة — Current journey + steps + فاتورة الورشة إن وُجدت
 *     description: |
 *       يعيد journey، steps (resolved/pending)، workshopInvoice، workshopInvoicePaid.
 *       إن اكتملت الشروط قد يُحدَّث status إلى COMPLETED تلقائياً.
 *     tags: [Akfeek Journey]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: journey أو journey null إن لا يوجد نشط
 *       401:
 *         description: Unauthorized
 */
router.get('/me', ctrl.getMe);

/**
 * @swagger
 * /api/akfeek-journey/{id}/documents/{documentId}/file:
 *   get:
 *     summary: تنزيل ملف وثيقة رحلة (عميل)
 *     description: الملفات لا تُخدم من /uploads مباشرة — استخدم هذا المسار مع Bearer.
 *     tags: [Akfeek Journey]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: ملف ثنائي (mime من المستند)
 *       403:
 *         description: ليست رحلة العميل
 *       404:
 *         description: غير موجود
 */
router.get('/:id/documents/:documentId/file', ctrl.downloadCustomerDocument);

/**
 * @swagger
 * /api/akfeek-journey/{id}/abandon:
 *   patch:
 *     summary: إلغاء الرحلة — Abandon
 *     tags: [Akfeek Journey]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: تم التحديث
 *       400:
 *         description: حالة غير صالحة
 *       404:
 *         description: غير موجود
 */
router.patch('/:id/abandon', ctrl.abandon);

/**
 * @swagger
 * /api/akfeek-journey/{id}/step/{stepKey}/skip:
 *   patch:
 *     summary: تخطي الخطوة الحالية فقط
 *     description: |
 *       stepKey يجب أن يساوي currentStep. قيم مسموحة:
 *       INSURANCE_TOW, INSURANCE_DOCS, TOW_TO_WORKSHOP, WORKSHOP_BOOKING, POST_REPAIR_TOW_HOME.
 *       POST_REPAIR_TOW_HOME + skip = رفض العودة بالسحب وإكمال الرحلة.
 *     tags: [Akfeek Journey]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: stepKey
 *         required: true
 *         schema:
 *           type: string
 *           enum: [INSURANCE_TOW, INSURANCE_DOCS, TOW_TO_WORKSHOP, WORKSHOP_BOOKING, POST_REPAIR_TOW_HOME]
 *     responses:
 *       200:
 *         description: رحلة محدثة
 *       400:
 *         description: WRONG_STEP أو INVALID_STATE
 *       404:
 *         description: Journey not found
 */
router.patch('/:id/step/:stepKey/skip', validateStepKey, ctrl.skipStep);

/**
 * @swagger
 * /api/akfeek-journey/{id}/step/{stepKey}/complete:
 *   patch:
 *     summary: إكمال خطوة وثائق التأمين بدون رفع ملفات جديدة
 *     description: يُقبل فقط عندما stepKey = INSURANCE_DOCS وهي الخطوة الحالية.
 *     tags: [Akfeek Journey]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: stepKey
 *         required: true
 *         schema:
 *           type: string
 *           enum: [INSURANCE_DOCS]
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: WRONG_STEP أو complete فقط لـ INSURANCE_DOCS
 */
router.patch('/:id/step/:stepKey/complete', validateStepKey, ctrl.completeDocsIfInsurance);

/**
 * @swagger
 * /api/akfeek-journey/{id}/step/{stepKey}/link:
 *   patch:
 *     summary: ربط حجز بالخطوة الحالية (سحب أو ورشة)
 *     description: |
 *       **يجب أن تكون stepKey = currentStep.**
 *       - INSURANCE_TOW, TOW_TO_WORKSHOP, POST_REPAIR_TOW_HOME: حجز سحب له jobBroadcast — أنشئه عبر POST /api/bookings/towing/request ثم القبول والدفع.
 *       - WORKSHOP_BOOKING: حجز ورشة معتمدة (workshopId) عبر POST /api/bookings؛ ثم دفع فاتورة الورشة حتى تُعتبر الخطوة مكتملة في الرحلة.
 *       لا يدعم INSURANCE_DOCS (استخدم رفع الوثائق أو complete/skip).
 *       Body: { "bookingId": "uuid" }
 *     tags: [Akfeek Journey]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: stepKey
 *         required: true
 *         schema:
 *           type: string
 *           enum: [INSURANCE_TOW, TOW_TO_WORKSHOP, WORKSHOP_BOOKING, POST_REPAIR_TOW_HOME]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId]
 *             properties:
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: رحلة محدثة؛ قد تصبح COMPLETED عند آخر خطوة
 *       400:
 *         description: WRONG_STEP أو INVALID_BOOKING (نوع الحجز لا يطابق الخطوة)
 *       409:
 *         description: الحجز مربوط برحلة أخرى
 */
router.patch('/:id/step/:stepKey/link', validateStepKey, ctrl.linkBooking);

/**
 * @swagger
 * /api/akfeek-journey/{id}/documents:
 *   post:
 *     summary: رفع وثائق التأمين — multipart
 *     description: |
 *       فقط أثناء currentStep = INSURANCE_DOCS.
 *       الحقل: **files** (مصفوفة ملفات)، حتى 12 ملفاً؛ JPEG, PNG, WebP, PDF؛ حتى ~15MB لكل ملف.
 *       اختياري: labels (JSON array) يوازي ترتيب الملفات.
 *     tags: [Akfeek Journey]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               labels:
 *                 type: string
 *                 description: JSON array of strings أو عنصر واحد
 *     responses:
 *       201:
 *         description: تم الرفع — data.journey
 *       400:
 *         description: WRONG_STEP أو لا ملفات أو نوع مرفوض
 */
router.post('/:id/documents', upload.array('files', 12), ctrl.uploadDocuments);

module.exports = router;
