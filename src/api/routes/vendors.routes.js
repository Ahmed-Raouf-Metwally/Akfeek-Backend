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
const { getFullUrl } = require('../../utils/urlUtils');

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
 *     summary: Get all vendors (Admin only)
 *     description: Returns a paginated list of all vendors in the system
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of vendors
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: [...]
 *               pagination:
 *                 $ref: '#/components/schemas/Pagination'
 */
router.get('/', vendorController.getAllVendors);

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
      res.json({ success: true, imageUrl: getFullUrl(imageUrl), data: vendor });
    } catch (err) {
      next(err);
    }
  },
);

// ── Vendor Services Management (Admin) ───────────────────────────────────────
/**
 * @swagger
 * /api/vendors/{id}/services:
 *   get:
 *     summary: Get all services for a vendor
 *     description: Returns all services (all categories) for a specific vendor
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID (UUID)
 *     responses:
 *       200:
 *         description: List of services for this vendor
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   name: "External Wash"
 *                   nameAr: "غسيل خارجي"
 *                   category: "CLEANING"
 *                   type: "FIXED"
 *                   isActive: true
 *                   estimatedDuration: 30
 *                   pricing:
 *                     - id: "uuid"
 *                       vehicleType: "SEDAN"
 *                       basePrice: 50
 *                       discountedPrice: 45
 *                       isActive: true
 */
router.get('/:id/services', async (req, res, next) => {
  try {
    const prisma = require('../../utils/database/prisma');
    const services = await prisma.service.findMany({
      where: { vendorId: req.params.id },
      include: {
        pricing: true
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: services });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/vendors/{id}/car-wash-services:
 *   get:
 *     summary: Get car wash services for a vendor
 *     description: Returns all CLEANING category services for a specific car wash vendor
 *     tags: [Vendors]
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
 *         description: List of car wash services for this vendor
 */
router.get('/:id/car-wash-services', async (req, res, next) => {
  try {
    const prisma = require('../../utils/database/prisma');
    const services = await prisma.service.findMany({
      where: { 
        vendorId: req.params.id,
        category: 'CLEANING',
        isActive: true
      },
      include: {
        pricing: true,
        vendor: { select: { id: true, businessName: true, businessNameAr: true, logo: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: services });
  } catch (err) { next(err); }
});

router.post('/:id/services', requireRole(['ADMIN', 'VENDOR']), async (req, res, next) => {
  try {
    const prisma = require('../../utils/database/prisma');
    
    // Get vendor type to set default category
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: req.params.id },
      select: { vendorType: true }
    });
    
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }
    
    // Map vendorType to service category
    const vendorTypeToCategory = {
      'AUTO_PARTS': 'MAINTENANCE',
      'COMPREHENSIVE_CARE': 'COMPREHENSIVE_CARE',
      'CERTIFIED_WORKSHOP': 'CERTIFIED_WORKSHOP',
      'CAR_WASH': 'CLEANING',
      'MOBILE_WORKSHOP': 'MAINTENANCE',
      'TOWING_SERVICE': 'EMERGENCY'
    };
    
    const { 
      name, nameAr, description, descriptionAr, 
      estimatedDuration, imageUrl, isActive = true, pricing = [], 
      workingHours = [], slotDurationMinutes = 60,
      category: providedCategory,
      type = 'FIXED'
    } = req.body;
    
    // Use provided category or default based on vendor type
    const category = providedCategory || vendorTypeToCategory[vendor.vendorType] || 'MAINTENANCE';
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Service name is required' });
    }

    const service = await prisma.service.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        type,
        category,
        vendorId: req.params.id,
        estimatedDuration,
        imageUrl,
        slotDurationMinutes,
        isActive,
        workingHours: workingHours.length > 0 ? workingHours : null,
        pricing: pricing.length > 0 ? {
          createMany: {
            data: pricing.map(p => ({
              vehicleType: p.vehicleType,
              basePrice: p.basePrice || 0,
              discountedPrice: p.discountedPrice || null
            }))
          }
        } : undefined
      },
      include: {
        pricing: true
      }
    });
    res.status(201).json({ success: true, data: service });
  } catch (err) { next(err); }
});

router.put('/:id/services/:serviceId', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const prisma = require('../../utils/database/prisma');
    const { 
      name, nameAr, description, descriptionAr, 
      estimatedDuration, imageUrl, isActive, pricing = [], 
      workingHours = [], slotDurationMinutes 
    } = req.body;
    
    const existing = await prisma.service.findUnique({ where: { id: req.params.serviceId } });
    if (!existing || existing.vendorId !== req.params.id) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const service = await prisma.service.update({
      where: { id: req.params.serviceId },
      data: {
        ...(name && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(estimatedDuration !== undefined && { estimatedDuration }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
        ...(slotDurationMinutes !== undefined && { slotDurationMinutes }),
        ...(workingHours.length > 0 ? { workingHours } : {})
      }
    });

    // Update pricing if provided
    if (Array.isArray(pricing) && pricing.length > 0) {
      await prisma.servicePricing.deleteMany({ where: { serviceId: req.params.serviceId } });
      await prisma.servicePricing.createMany({
        data: pricing.map(p => ({
          serviceId: req.params.serviceId,
          vehicleType: p.vehicleType,
          basePrice: p.basePrice || 0,
          discountedPrice: p.discountedPrice || null
        }))
      });
    }

    const updated = await prisma.service.findUnique({
      where: { id: req.params.serviceId },
      include: {
        pricing: true
      }
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

router.delete('/:id/services/:serviceId', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const prisma = require('../../utils/database/prisma');
    const existing = await prisma.service.findUnique({ where: { id: req.params.serviceId } });
    if (!existing || existing.vendorId !== req.params.id) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    await prisma.service.delete({ where: { id: req.params.serviceId } });
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
