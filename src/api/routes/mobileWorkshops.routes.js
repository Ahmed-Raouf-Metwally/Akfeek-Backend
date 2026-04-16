const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const router  = express.Router();
const auth    = require('../middlewares/auth.middleware');
const role    = require('../middlewares/role.middleware');
const ctrl    = require('../controllers/mobileWorkshop.controller');
const prisma  = require('../../utils/database/prisma');
const { getFullUrl } = require('../../utils/urlUtils');

const mwUploadDir = path.join(__dirname, '../../../uploads/mobile-workshops');
if (!fs.existsSync(mwUploadDir)) fs.mkdirSync(mwUploadDir, { recursive: true });

const mwStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(mwUploadDir, req.params.id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const type = req.body?.type || req.query?.type || 'image';
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${type}-${Date.now()}${ext}`);
  },
});
const mwUpload = multer({
  storage: mwStorage,
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only images (JPEG, PNG, WebP) allowed'), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(auth);

/**
 * @swagger
 * /api/mobile-workshops:
 *   get:
 *     summary: قائمة الورش المتنقلة — List all mobile workshops [CRUD - Read List]
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of mobile workshops
 */
router.get('/',     ctrl.getAll);

/**
 * @swagger
 * /api/mobile-workshops/my:
 *   get:
 *     summary: ورشتي المتنقلة (بائع) — Get my mobile workshop
 *     description: يعيد ورشة الورش المتنقلة المرتبطة بحساب البائع الحالي.
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Mobile workshop of current vendor
 *       404:
 *         description: No mobile workshop linked
 */
router.get('/my',   role('VENDOR'), ctrl.getMy);

/**
 * @swagger
 * /api/mobile-workshops/my:
 *   post:
 *     summary: إنشاء ورشتي المتنقلة (بائع) — Create my mobile workshop
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, description: "اسم الورشة (EN)" }
 *               nameAr: { type: string, description: "اسم الورشة (AR)" }
 *               description: { type: string, description: "وصف" }
 *               workshopTypeId: { type: string, format: uuid, description: "معرف نوع الورشة" }
 *               vehicleType: { type: string, description: "نوع المركبة" }
 *               vehicleModel: { type: string, description: "موديل المركبة" }
 *               year: { type: integer, description: "سنة الصنع" }
 *               plateNumber: { type: string, description: "رقم اللوحة" }
 *               servicesOffered: { type: string, description: "الخدمات المقدمة (نص)" }
 *               city: { type: string, description: "المدينة" }
 *               latitude: { type: number, format: float }
 *               longitude: { type: number, format: float }
 *               serviceRadius: { type: number, description: "نطاق الخدمة بالكم" }
 *               basePrice: { type: number }
 *               pricePerKm: { type: number }
 *               hourlyRate: { type: number }
 *               minPrice: { type: number }
 *               currency: { type: string, default: "SAR" }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/my',  role('VENDOR'), ctrl.createMy);

/**
 * @swagger
 * /api/mobile-workshops/my:
 *   put:
 *     summary: تحديث بيانات ورشتي (بائع) — Update my mobile workshop
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string }
 *               description: { type: string }
 *               workshopTypeId: { type: string, format: uuid }
 *               vehicleType: { type: string }
 *               vehicleModel: { type: string }
 *               year: { type: integer }
 *               plateNumber: { type: string }
 *               servicesOffered: { type: string }
 *               city: { type: string }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               serviceRadius: { type: number }
 *               basePrice: { type: number }
 *               pricePerKm: { type: number }
 *               hourlyRate: { type: number }
 *               minPrice: { type: number }
 *               currency: { type: string }
 *               isAvailable: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/my',   role('VENDOR'), ctrl.updateMy);

/**
 * @swagger
 * /api/mobile-workshops/my:
 *   delete:
 *     summary: حذف ورشتي (بائع) — Delete my mobile workshop
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/my', role('VENDOR'), ctrl.deleteMy);

/**
 * @swagger
 * /api/mobile-workshops/my/upload-image:
 *   post:
 *     summary: رفع صورة لورشتي (بائع) — Upload image for my workshop
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 *               type: { type: string, enum: [logo, vehicle] }
 *     responses:
 *       200:
 *         description: Uploaded
 */
router.post('/my/upload-image', role('VENDOR'), mwUpload.single('image'), ctrl.uploadMyImage);

/**
 * @swagger
 * /api/mobile-workshops/{id}:
 *   get:
 *     summary: عرض ورشة متنقلة بالمعرف — Get mobile workshop by ID [CRUD - Read One]
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Mobile workshop details
 */
router.get('/:id',  ctrl.getById);

/**
 * @swagger
 * /api/mobile-workshops:
 *   post:
 *     summary: إضافة ورشة متنقلة (أدمن) — Create mobile workshop [CRUD - Create]
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, vendorId]
 *             properties:
 *               vendorId: { type: string, format: uuid }
 *               name: { type: string }
 *               nameAr: { type: string }
 *               description: { type: string }
 *               workshopTypeId: { type: string, format: uuid }
 *               vehicleType: { type: string }
 *               vehicleModel: { type: string }
 *               year: { type: integer }
 *               plateNumber: { type: string }
 *               servicesOffered: { type: string }
 *               city: { type: string }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               serviceRadius: { type: number }
 *               basePrice: { type: number }
 *               pricePerKm: { type: number }
 *               hourlyRate: { type: number }
 *               minPrice: { type: number }
 *               currency: { type: string, default: "SAR" }
 *               imageUrl: { type: string }
 *               vehicleImageUrl: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Mobile workshop created
 */
router.post('/',    role('ADMIN'), ctrl.create);

/**
 * @swagger
 * /api/mobile-workshops/{id}:
 *   put:
 *     summary: تحديث ورشة متنقلة (أدمن) — Update mobile workshop [CRUD - Update]
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
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
 *               vendorId: { type: string, format: uuid }
 *               name: { type: string }
 *               nameAr: { type: string }
 *               description: { type: string }
 *               workshopTypeId: { type: string, format: uuid }
 *               vehicleType: { type: string }
 *               vehicleModel: { type: string }
 *               year: { type: integer }
 *               plateNumber: { type: string }
 *               servicesOffered: { type: string }
 *               city: { type: string }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               serviceRadius: { type: number }
 *               basePrice: { type: number }
 *               pricePerKm: { type: number }
 *               hourlyRate: { type: number }
 *               minPrice: { type: number }
 *               currency: { type: string }
 *               imageUrl: { type: string }
 *               vehicleImageUrl: { type: string }
 *               notes: { type: string }
 *               isAvailable: { type: boolean }
 *               isActive: { type: boolean }
 *               isVerified: { type: boolean }
 *     responses:
 *       200:
 *         description: Mobile workshop updated
 */
router.put('/:id',  role('ADMIN'), ctrl.update);

/**
 * @swagger
 * /api/mobile-workshops/{id}:
 *   delete:
 *     summary: حذف ورشة متنقلة (أدمن) — Delete mobile workshop [CRUD - Delete]
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Mobile workshop deleted
 */
router.delete('/:id', role('ADMIN'), ctrl.remove);

// رفع صورة: صورة الفني/الشعار (type=logo) أو صورة المركبة (type=vehicle)
router.post(
  '/:id/upload-image',
  role('ADMIN'),
  mwUpload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
      const workshop = await prisma.mobileWorkshop.findUnique({ where: { id: req.params.id } });
      if (!workshop) return res.status(404).json({ success: false, error: 'Mobile workshop not found' });
      const type = (req.body?.type || 'logo').toLowerCase();
      const imageUrl = `/uploads/mobile-workshops/${req.params.id}/${req.file.filename}`;
      const fullImageUrl = getFullUrl(imageUrl);
      const updateData = type === 'vehicle' ? { vehicleImageUrl: fullImageUrl } : { imageUrl: fullImageUrl };
      await prisma.mobileWorkshop.update({
        where: { id: req.params.id },
        data: updateData,
      });
      res.json({ success: true, imageUrl: fullImageUrl, field: type === 'vehicle' ? 'vehicleImageUrl' : 'imageUrl' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/mobile-workshops/{id}/services:
 *   post:
 *     summary: إضافة خدمة لورشة متنقلة (أدمن)
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
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
 *             required: [name, price]
 *             properties:
 *               workshopTypeServiceId: { type: string, format: uuid }
 *               serviceType: { type: string, enum: [GENERAL, REPAIR, INSPECTION, OIL_CHANGE, TIRE_SERVICE, BATTERY_SERVICE, TOWING] }
 *               name: { type: string }
 *               nameAr: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               currency: { type: string, default: "SAR" }
 *               estimatedDuration: { type: integer, description: "minutes" }
 *     responses:
 *       201:
 *         description: Service added
 */
router.post('/:id/services',             role('ADMIN'), ctrl.addService);

/**
 * @swagger
 * /api/mobile-workshops/{id}/services/{svcId}:
 *   put:
 *     summary: تحديث خدمة ورشة متنقلة (أدمن)
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: svcId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workshopTypeServiceId: { type: string, format: uuid }
 *               serviceType: { type: string }
 *               name: { type: string }
 *               nameAr: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               currency: { type: string }
 *               estimatedDuration: { type: integer, description: "minutes" }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Service updated
 */
router.put('/:id/services/:svcId',       role('ADMIN'), ctrl.updateService);

/**
 * @swagger
 * /api/mobile-workshops/{id}/services/{svcId}:
 *   delete:
 *     summary: حذف خدمة ورشة متنقلة (أدمن)
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: svcId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Service removed
 */
router.delete('/:id/services/:svcId',    role('ADMIN'), ctrl.removeService);

module.exports = router;
