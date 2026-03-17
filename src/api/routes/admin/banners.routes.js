const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');
const ctrl = require('../../controllers/banner.controller');

const { AppError } = require('../../middlewares/error.middleware');

const bannersUploadDir = path.join(process.cwd(), 'uploads', 'banners');
if (!fs.existsSync(bannersUploadDir)) {
  fs.mkdirSync(bannersUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the ID exists in params
    const id = req.params.id;
    if (!id) return cb(new AppError('Banner ID is missing', 400));
    
    const dir = path.join(bannersUploadDir, id);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        return cb(err);
      }
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `banner-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/pjpeg', 'image/x-png'
    ].includes(file.mimetype.toLowerCase());
    cb(ok ? null : new AppError('Only images (JPEG, PNG, WebP) allowed', 400), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // Increase to 10MB
});

router.use(auth);
router.use(role('ADMIN'));

/**
 * @swagger
 * /api/admin/banners:
 *   get:
 *     summary: (Admin) List banners
 *     tags: [Banners]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: position
 *         required: false
 *         schema:
 *           type: string
 *           enum: [TOP, BOTTOM]
 *     responses:
 *       200:
 *         description: List banners
 */
router.get('/', ctrl.adminList);

/**
 * @swagger
 * /api/admin/banners:
 *   post:
 *     summary: (Admin) Create banner
 *     tags: [Banners]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [position]
 *             properties:
 *               position: { type: string, enum: [TOP, BOTTOM] }
 *               title: { type: string, nullable: true }
 *               titleAr: { type: string, nullable: true }
 *               isActive: { type: boolean, default: true }
 *               sortOrder: { type: integer, default: 0 }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', ctrl.adminCreate);

/**
 * @swagger
 * /api/admin/banners/{id}:
 *   put:
 *     summary: (Admin) Update banner
 *     tags: [Banners]
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
 *               position: { type: string, enum: [TOP, BOTTOM] }
 *               title: { type: string, nullable: true }
 *               titleAr: { type: string, nullable: true }
 *               isActive: { type: boolean }
 *               sortOrder: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', ctrl.adminUpdate);

/**
 * @swagger
 * /api/admin/banners/{id}:
 *   delete:
 *     summary: (Admin) Delete banner
 *     tags: [Banners]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', ctrl.adminRemove);

/**
 * @swagger
 * /api/admin/banners/{id}/images:
 *   post:
 *     summary: (Admin) Upload banner images (multiple)
 *     tags: [Banners]
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
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Alternative field name (single image)
 *               linkUrl:
 *                 type: string
 *                 description: Optional URL applied to uploaded images
 *     responses:
 *       201:
 *         description: Uploaded
 */
router.post('/:id/images', upload.any(), ctrl.adminUploadImages);

/**
 * @swagger
 * /api/admin/banners/{id}/images/{imageId}:
 *   delete:
 *     summary: (Admin) Delete one banner image
 *     tags: [Banners]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id/images/:imageId', ctrl.adminDeleteImage);

module.exports = router;

