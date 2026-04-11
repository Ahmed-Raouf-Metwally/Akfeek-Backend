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
 *           enum: [TOP, BOTTOM, AUTO_PARTS, CAR_WASH]
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
 *               position: { type: string, enum: [TOP, BOTTOM, AUTO_PARTS, CAR_WASH] }
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
 *               position: { type: string, enum: [TOP, BOTTOM, AUTO_PARTS, CAR_WASH] }
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
 *     description: |
 *       Upload one or many images for a banner.
 *       Supported field names: `images` (array) or `image` (single).
 *       Max file size per image: 10MB. Allowed: JPEG/PNG/WebP.
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
 *                 description: Preferred field for multiple files
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Alternative field name for single file
 *               linkUrl:
 *                 type: string
 *                 description: Optional URL applied to uploaded images
 *           encoding:
 *             images:
 *               style: form
 *             image:
 *               style: form
 *     x-codeSamples:
 *       - lang: cURL
 *         source: |
 *           curl -X POST "http://localhost:3000/api/admin/banners/{id}/images" \
 *             -H "Authorization: Bearer <token>" \
 *             -F "images=@/path/banner-1.jpg" \
 *             -F "images=@/path/banner-2.png" \
 *             -F "linkUrl=https://example.com"
 *     responses:
 *       201:
 *         description: Uploaded
 *       400:
 *         description: No images found in request / invalid file type
 *       404:
 *         description: Banner not found
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

