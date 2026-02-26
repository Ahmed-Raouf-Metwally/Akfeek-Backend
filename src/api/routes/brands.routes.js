const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brand.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: Get all vehicle brands
 *     description: Retrieve a list of all vehicle brands (Toyota, BMW, etc.) with optional filters - ???? ??? ????? ????? ?????? ????????
 *     tags: [🔓 Brands & Models]
 *     parameters:
 *       - in: query
 *         name: includeModels
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include models for each brand - ????? ??????? ?? ?????
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Only return active brands - ??? ???????? ?????? ???
 *     responses:
 *       200:
 *         description: Successfully retrieved brands - ?? ??? ???????? ?????
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "uuid-here"
 *                       name:
 *                         type: string
 *                         example: "Toyota"
 *                       nameAr:
 *                         type: string
 *                         example: "??????"
 *                       logo:
 *                         type: string
 *                         nullable: true
 *                         example: "https://example.com/toyota-logo.png"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       _count:
 *                         type: object
 *                         properties:
 *                           models:
 *                             type: integer
 *                             example: 5
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 10
 */
router.get('/', brandController.getAllBrands);

/**
 * @swagger
 * /api/brands/{id}:
 *   get:
 *     summary: Get brand by ID
 *     description: Retrieve a specific brand with all its models - ???? ??? ????? ????? ?? ???? ?????????
 *     tags: [🔓 Brands & Models]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID - ???? ???????
 *     responses:
 *       200:
 *         description: Brand found - ?? ?????? ??? ???????
 *       404:
 *         description: Brand not found - ??????? ??? ??????
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Brand not found"
 *                 errorAr:
 *                   type: string
 *                   example: "??????? ??? ??????"
 *                 code:
 *                   type: string
 *                   example: "BRAND_NOT_FOUND"
 */
router.get('/:id', brandController.getBrandById);

// Protected routes - require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/brands:
 *   post:
 *     summary: Create new brand (Admin only)
 *     description: Create a new vehicle brand - ????? ????? ????? ?????
 *     tags: [⚙️ Admin | Brands & Models]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Tesla"
 *                 description: Brand name - ??? ???????
 *               nameAr:
 *                 type: string
 *                 example: "????"
 *                 description: Arabic brand name - ??? ??????? ????????
 *               logo:
 *                 type: string
 *                 nullable: true
 *                 example: "https://example.com/tesla-logo.png"
 *                 description: Brand logo URL - ???? ???? ???????
 *     responses:
 *       201:
 *         description: Brand created successfully - ?? ????? ??????? ?????
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *                   example: "Brand created successfully"
 *                 messageAr:
 *                   type: string
 *                   example: "?? ????? ??????? ?????"
 *       400:
 *         description: Validation error - ??? ?? ??????
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Brand already exists - ??????? ?????? ??????
 */
router.post('/',
    roleMiddleware(['ADMIN']),
    brandController.createBrand
);

/**
 * @swagger
 * /api/brands/{id}:
 *   patch:
 *     summary: Update brand (Admin only)
 *     description: Update an existing brand - ????? ????? ??????
 *     tags: [⚙️ Admin | Brands & Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID - ???? ???????
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               logo:
 *                 type: string
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Brand updated successfully - ?? ????? ??????? ?????
 *       404:
 *         description: Brand not found - ??????? ??? ??????
 *       409:
 *         description: Brand name already exists - ??? ??????? ????? ??????
 */
router.patch('/:id',
    roleMiddleware(['ADMIN']),
    brandController.updateBrand
);

/**
 * @swagger
 * /api/brands/{id}:
 *   delete:
 *     summary: Delete brand (Admin only)
 *     description: Delete a brand (soft delete by default) - ??? ????? (??? ???????)
 *     tags: [⚙️ Admin | Brands & Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID - ???? ???????
 *       - in: query
 *         name: hardDelete
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Permanently delete brand and all models - ??? ????? ??????? ????? ?????????
 *     responses:
 *       200:
 *         description: Brand deleted/deactivated - ?? ???/????? ???????
 *       404:
 *         description: Brand not found - ??????? ??? ??????
 */
router.delete('/:id',
    roleMiddleware(['ADMIN']),
    brandController.deleteBrand
);

module.exports = router;
