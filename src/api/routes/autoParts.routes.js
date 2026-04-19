const express = require('express');
const router = express.Router();
const autoPartController = require('../controllers/autoPart.controller');
const autoPartFavoriteController = require('../controllers/autoPartFavorite.controller');
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
 *         description: Category id (includes selected category + subcategories)
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: vehicleBrandId
 *         schema:
 *           type: string
 *         description: Filter products by vehicle brand
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [CAR, MOTORCYCLE]
 *         description: Filter products by root category type
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
 * /api/auto-parts/brand/{vehicleBrandId}:
 *   get:
 *     summary: Get parts compatible with vehicle brand
 *     tags: [Auto Parts]
 *     parameters:
 *       - in: path
 *         name: vehicleBrandId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of parts compatible with this brand
 *       404:
 *         description: Brand not found
 */
router.get('/brand/:vehicleBrandId', authMiddleware.optionalAuth, autoPartController.getPartsByBrand);

/**
 * @swagger
 * /api/auto-parts/favorites:
 *   get:
 *     summary: List my favorite auto parts (wishlist / المفضلة)
 *     description: |
 *       Returns paginated wishlist rows (newest first). Each row includes `favoriteId`, `createdAt`, and `autoPart` summary
 *       (price, stock, badges, primary image URL, category, brand).
 *     tags: [Auto Parts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Wishlist with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AutoPartFavoritesListData'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   post:
 *     summary: Add auto part to favorites (idempotent)
 *     description: |
 *       Body must include `autoPartId`. The part must exist and be active + approved.
 *       If already favorited, upsert succeeds — still returns 201 with the row payload.
 *     tags: [Auto Parts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddAutoPartFavoriteBody'
 *     responses:
 *       201:
 *         description: Added (or already in list)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddAutoPartFavoriteResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *         description: Missing autoPartId or part not available
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *         description: Product not found
 */
router.get('/favorites', authMiddleware, autoPartFavoriteController.listFavorites);
router.post('/favorites', authMiddleware, autoPartFavoriteController.addFavorite);

/**
 * @swagger
 * /api/auto-parts/favorites/{autoPartId}:
 *   delete:
 *     summary: Remove auto part from favorites
 *     description: Deletes the favorite row for the current user and this part. 404 if it was not favorited.
 *     tags: [Auto Parts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: autoPartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Removed from wishlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RemoveAutoPartFavoriteResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *         description: Favorite not found for this user/part
 */
router.delete('/favorites/:autoPartId', authMiddleware, autoPartFavoriteController.removeFavorite);

/**
 * @swagger
 * /api/auto-parts/{id}:
 *   get:
 *     summary: Get part details
 *     description: |
 *       Public with optional Bearer. When a valid JWT is sent, response `data` includes **`isFavorite`**
 *       (`true`/`false`) for whether this part is in the user's wishlist.
 *     tags: [Auto Parts]
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Part details (includes relations; `isFavorite` when authenticated)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/AutoPart'
 *                     - type: object
 *                       description: API may return additional fields (category, images, vendor, etc.)
 *                       properties:
 *                         isFavorite:
 *                           type: boolean
 *                           description: Wishlist flag when Bearer token is present
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', authMiddleware.optionalAuth, autoPartController.getPartById);

// Routes requiring authentication
router.use(authMiddleware);

/**
 * POST /api/auto-parts/upload-image - Upload image file(s), returns URL(s)
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
 *               badges:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: بادجات/Tags تظهر على القطعة (اختياري) — e.g. ["Original","Best Seller","Warranty"]
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
 *               badges:
 *                 type: array
 *                 items:
 *                   type: string
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
router.delete('/:id/images/:imageId', autoPartController.deletePartImage);
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
