const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const vendorController = require('../controllers/vendor.controller');
const couponController = require('../controllers/coupon.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const { requireAdminOrPermission } = require('../middlewares/permission.middleware');

// ── Vendor image upload (logo / banner) ────────────────────────────────────
const vendorUploadDir = path.join(__dirname, '../../../uploads/vendors');
if (!fs.existsSync(vendorUploadDir)) fs.mkdirSync(vendorUploadDir, { recursive: true });

const vendorStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(vendorUploadDir, req.params.id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});
const vendorUpload = multer({
  storage: vendorStorage,
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only images allowed'), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// All vendor routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     summary: قائمة الفيندورات (أدمن) — List all vendors (Admin only) [CRUD - Read List]
 *     tags: [Vendors (الفيندور)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_APPROVAL, ACTIVE, SUSPENDED, REJECTED]
 *         description: Filter by vendor status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by business name
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filter by verification
 *       - in: query
 *         name: vendorType
 *         schema:
 *           type: string
 *         description: Filter by vendor type
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of vendors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VendorProfile'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', requireAdminOrPermission('vendors'), vendorController.getAllVendors);

/**
 * @swagger
 * /api/vendors/profile/me:
 *   get:
 *     summary: Get current user's vendor profile
 *     tags: [Vendors (الفيندور)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current vendor profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VendorProfile'
 */
router.get('/profile/me', requireRole('VENDOR'), vendorController.getMyVendorProfile);

/**
 * @swagger
 * /api/vendors/profile/me/comprehensive-care-bookings:
 *   get:
 *     summary: حجوزات العناية الشاملة للفيندور — Comprehensive care bookings (الفيندور) [قسم 3]
 *     description: قائمة حجوزات الخدمات الخاصة بالعناية الشاملة لهذا الفيندور. List bookings for this vendor's comprehensive care services.
 *     tags: [3. العناية الشاملة (Comprehensive Care)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         schema: { type: string }
 *         description: Filter by booking status
 *     responses:
 *       200:
 *         description: List of comprehensive care bookings
 */
router.get('/profile/me/comprehensive-care-bookings', requireRole('VENDOR'), vendorController.getMyComprehensiveCareBookings);

/** GET /api/vendors/profile/me/coupons — كوبونات الفيندور الحالي */
router.get('/profile/me/coupons', requireRole('VENDOR'), couponController.getMyCoupons);
/** POST /api/vendors/profile/me/coupons */
router.post('/profile/me/coupons', requireRole('VENDOR'), couponController.createCoupon);
/** PATCH /api/vendors/profile/me/coupons/:id */
router.patch('/profile/me/coupons/:id', requireRole('VENDOR'), couponController.updateCoupon);
/** DELETE /api/vendors/profile/me/coupons/:id */
router.delete('/profile/me/coupons/:id', requireRole('VENDOR'), couponController.deleteCoupon);

/**
 * GET /api/vendors/coupons — كل الكوبونات (أدمن فقط). يجب أن يكون قبل /:id
 */
router.get('/coupons', requireAdminOrPermission('vendors'), couponController.getAllCoupons);

/**
 * @swagger
 * /api/vendors/{id}:
 *   get:
 *     summary: عرض الفيندور بالمعرف — Get vendor by ID [CRUD - Read One]
 *     tags: [Vendors (الفيندور)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VendorProfile'
 */
router.get('/:id', vendorController.getVendorById);

/**
 * @swagger
 * /api/vendors/{id}/stats:
 *   get:
 *     summary: Get vendor statistics
 *     tags: [Vendors (الفيندور)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor statistics
 */
router.get('/:id/stats', vendorController.getVendorStats);

/**
 * @swagger
 * /api/vendors:
 *   post:
 *     summary: إضافة فيندور — Create vendor [CRUD - Create]
 *     tags: [Vendors (الفيندور)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [businessName, contactPhone]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID (Required for Admin, ignored for self-registration)
 *               businessName:
 *                 type: string
 *               businessNameAr:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/', vendorController.createVendor);

/**
 * @swagger
 * /api/vendors/{id}:
 *   put:
 *     summary: تحديث الفيندور — Update vendor [CRUD - Update]
 *     tags: [Vendors (الفيندور)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               businessNameAr:
 *                 type: string
 *               description:
 *                 type: string
 *               descriptionAr:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               taxNumber:
 *                 type: string
 *               commercialLicense:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               commissionPercent:
 *                 type: number
 *                 description: نسبة عمولة المنصة لهذا الفيندور (اختياري)
 *     responses:
 *       200:
 *         description: Vendor updated
 */
router.put('/:id', vendorController.updateVendor);

/**
 * @swagger
 * /api/vendors/{id}/status:
 *   put:
 *     summary: Update vendor status (Admin only)
 *     tags: [Vendors (الفيندور)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *                 enum: [PENDING_APPROVAL, ACTIVE, SUSPENDED, REJECTED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', requireAdminOrPermission('vendors'), vendorController.updateVendorStatus);

/**
 * @swagger
 * /api/vendors/{id}:
 *   delete:
 *     summary: Delete vendor (Admin only)
 *     tags: [Vendors (الفيندور)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vendor deleted
 */
router.delete('/:id', requireAdminOrPermission('vendors'), vendorController.deleteVendor);

// ── Vendor Reviews ─────────────────────────────────────────────────────────
router.get('/:id/reviews', vendorController.getVendorReviews);
router.post('/:id/reviews', vendorController.submitVendorReview);

// ── Vendor Documents ────────────────────────────────────────────────────────
const vendorDocDir = path.join(__dirname, '../../../uploads/vendor-docs');
if (!fs.existsSync(vendorDocDir)) fs.mkdirSync(vendorDocDir, { recursive: true });

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(vendorDocDir, req.params.id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc-${Date.now()}${ext}`);
  },
});
const docUpload = multer({
  storage: docStorage,
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('Only images and PDF allowed'), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

router.get('/:id/documents', requireRole('ADMIN', 'VENDOR'), async (req, res, next) => {
  try {
    const prisma = require('../../utils/database/prisma');
    const docs = await prisma.vendorDocument.findMany({
      where: { vendorId: req.params.id },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json({ success: true, data: docs });
  } catch (err) { next(err); }
});

router.post(
  '/:id/documents',
  requireRole('ADMIN', 'VENDOR'),
  docUpload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
      const prisma = require('../../utils/database/prisma');
      const { docType = 'OTHER', name } = req.body;
      const fileUrl = `/uploads/vendor-docs/${req.params.id}/${req.file.filename}`;
      const doc = await prisma.vendorDocument.create({
        data: {
          vendorId: req.params.id,
          docType,
          name: name || req.file.originalname,
          fileUrl,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        },
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) { next(err); }
  },
);

router.delete('/:id/documents/:docId', requireRole('ADMIN', 'VENDOR'), async (req, res, next) => {
  try {
    const prisma = require('../../utils/database/prisma');
    const doc = await prisma.vendorDocument.findUnique({ where: { id: req.params.docId } });
    if (!doc || doc.vendorId !== req.params.id)
      return res.status(404).json({ success: false, error: 'Document not found' });
    const filePath = path.join(__dirname, '../../../', doc.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.vendorDocument.delete({ where: { id: req.params.docId } });
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) { next(err); }
});

// ── Vendor Image Upload ─────────────────────────────────────────────────────
router.post(
  '/:id/upload-image',
  requireRole('ADMIN', 'VENDOR'),
  vendorUpload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
      const { type = 'logo' } = req.body; // type: 'logo' | 'banner'
      const prisma = require('../../utils/database/prisma');
      const imageUrl = `/uploads/vendors/${req.params.id}/${req.file.filename}`;
      const vendor = await prisma.vendorProfile.update({
        where: { id: req.params.id },
        data: type === 'banner' ? { banner: imageUrl } : { logo: imageUrl },
      });
      res.json({ success: true, imageUrl, data: vendor });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
