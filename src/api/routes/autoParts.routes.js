const express = require('express');
const router = express.Router();
const autoPartController = require('../controllers/autoPart.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { upload: uploadAutoPartImage } = require('../../utils/autoPartImageUpload');
const requireRole = require('../middlewares/role.middleware');

/**
 * @swagger
 * /api/auto-parts:
 *   get:
 *     summary: Get all auto parts with filters
 *     tags: [Auto Parts]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of auto parts
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
 *                     $ref: '#/components/schemas/AutoPart'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', authMiddleware.optionalAuth, autoPartController.getAllParts);

/**
 * @swagger
 * /api/auto-parts/vendor/{vendorId}:
 *   get:
 *     summary: Get parts by vendor
 *     tags: [Auto Parts]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of vendor parts
 */
router.get('/vendor/:vendorId', autoPartController.getPartsByVendor);

/**
 * @swagger
 * /api/auto-parts/vehicle/{vehicleModelId}:
 *   get:
 *     summary: Get parts compatible with vehicle
 *     tags: [Auto Parts]
 *     parameters:
 *       - in: path
 *         name: vehicleModelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of compatible parts
 */
router.get('/vehicle/:vehicleModelId', autoPartController.getPartsByVehicle);

/**
 * @swagger
 * /api/auto-parts/{id}:
 *   get:
 *     summary: Get part details
 *     tags: [Auto Parts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Part details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AutoPart'
 */
router.get('/:id', authMiddleware.optionalAuth, autoPartController.getPartById);

// Routes requiring authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/auto-parts/upload-image:
 *   post:
 *     summary: Upload image file(s) for auto parts
 *     description: Upload up to 10 image files. Returns an array of uploaded image URLs.
 *     tags: [Auto Parts]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 */
router.post('/upload-image', uploadAutoPartImage.array('files', 10), autoPartController.uploadImage);

/**
 * @swagger
 * /api/auto-parts:
 *   post:
 *     summary: Create new auto part
 *     tags: [Auto Parts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, sku, price, categoryId]
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               price:
 *                 type: number
 *               stockQuantity:
 *                 type: integer
 *               categoryId:
 *                 type: string
 *               vendorId:
 *                 type: string
 *                 description: Only Admin can set this manually
 *     responses:
 *       201:
 *         description: Part created
 */
router.post('/', autoPartController.createPart);

/**
 * @swagger
 * /api/auto-parts/{id}:
 *   put:
 *     summary: Update auto part
 *     tags: [Auto Parts]
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
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               stockQuantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Part updated
 */
router.put('/:id', autoPartController.updatePart);

/**
 * @swagger
 * /api/auto-parts/{id}/approve:
 *   put:
 *     summary: Approve or reject part (Admin only)
 *     tags: [Auto Parts]
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
 *             required: [isApproved]
 *             properties:
 *               isApproved:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Approval status updated
 */
router.put('/:id/approve', requireRole('ADMIN'), autoPartController.updatePartApproval);

/**
 * @swagger
 * /api/auto-parts/{id}:
 *   delete:
 *     summary: Delete part
 *     tags: [Auto Parts]
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
 *         description: Part deleted
 */
router.delete('/:id', autoPartController.deletePart);

/**
 * @swagger
 * /api/auto-parts/{id}/images:
 *   post:
 *     summary: Add images to part
 *     tags: [Auto Parts]
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
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Images added
 */
router.post('/:id/images', autoPartController.addPartImages);

/**
 * @swagger
 * /api/auto-parts/{id}/images/{imageId}:
 *   delete:
 *     summary: Remove an image from part
 *     tags: [Auto Parts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Image removed
 */
router.delete('/:id/images/:imageId', autoPartController.deletePartImage);

/**
 * @swagger
 * /api/auto-parts/{id}/images/{imageId}/primary:
 *   patch:
 *     summary: Set image as primary for part
 *     tags: [Auto Parts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Primary image updated
 */
router.patch('/:id/images/:imageId/primary', autoPartController.setPrimaryPartImage);

/**
 * @swagger
 * /api/auto-parts/{id}/stock:
 *   put:
 *     summary: Update part stock quantity
 *     tags: [Auto Parts]
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
 *             required: [stockQuantity]
 *             properties:
 *               stockQuantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Stock updated
 */
router.put('/:id/stock', autoPartController.updatePartStock);

module.exports = router;
