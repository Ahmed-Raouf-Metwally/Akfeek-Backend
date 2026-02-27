const express = require('express');
const router = express.Router();
const modelController = require('../controllers/model.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

/**
 * @swagger
 * /api/models:
 *   get:
 *     summary: Get all vehicle models
 *     description: Retrieve vehicle models with optional filters - ???? ??? ??????? ???????? ?? ????? ????????
 *     tags: [🔓 Brands & Models]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: string
 *         description: Filter by brand ID - ????? ??? ???? ???????
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year - ????? ??? ?????
 *         example: 2023
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *           enum: [SMALL, MEDIUM, LARGE, EXTRA_LARGE]
 *         description: Filter by size - ????? ??? ?????
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Only active models - ????????? ?????? ???
 *     responses:
 *       200:
 *         description: Successfully retrieved models - ?? ??? ????????? ?????
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
 *                       brandId:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: "Camry"
 *                       nameAr:
 *                         type: string
 *                         example: "?????"
 *                       year:
 *                         type: integer
 *                         example: 2023
 *                       size:
 *                         type: string
 *                         enum: [SMALL, MEDIUM, LARGE, EXTRA_LARGE]
 *                         example: "MEDIUM"
 *                       imageUrl:
 *                         type: string
 *                         nullable: true
 *                       brand:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                             example: "Toyota"
 *                           nameAr:
 *                             type: string
 *                             example: "??????"
 *                       _count:
 *                         type: object
 *                         properties:
 *                           userVehicles:
 *                             type: integer
 *                             example: 5
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     filters:
 *                       type: object
 */
router.get('/', modelController.getAllModels);

/**
 * @swagger
 * /api/models/{id}:
 *   get:
 *     summary: Get model by ID
 *     description: Retrieve a specific vehicle model - ???? ??? ????? ????
 *     tags: [🔓 Brands & Models]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Model ID - ???? ???????
 *     responses:
 *       200:
 *         description: Model found - ?? ?????? ??? ???????
 *       404:
 *         description: Model not found - ??????? ??? ?????
 */
router.get('/:id', modelController.getModelById);

// Protected routes - require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/models:
 *   post:
 *     summary: Create new model (Admin only)
 *     description: Create a new vehicle model - ????? ????? ????? ????
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
 *               - brandId
 *               - name
 *               - year
 *               - size
 *             properties:
 *               brandId:
 *                 type: string
 *                 description: Brand ID - ???? ???????
 *               name:
 *                 type: string
 *                 example: "Camry"
 *                 description: Model name - ??? ???????
 *               nameAr:
 *                 type: string
 *                 example: "?????"
 *                 description: Arabic model name - ??? ??????? ????????
 *               year:
 *                 type: integer
 *                 example: 2023
 *                 description: Model year - ??? ???????
 *               size:
 *                 type: string
 *                 enum: [SMALL, MEDIUM, LARGE, EXTRA_LARGE]
 *                 example: "MEDIUM"
 *                 description: Vehicle size - ??? ???????
 *               imageUrl:
 *                 type: string
 *                 nullable: true
 *                 description: Model image URL - ???? ???? ???????
 *     responses:
 *       201:
 *         description: Model created successfully - ?? ????? ??????? ?????
 *       400:
 *         description: Validation error - ??? ?? ??????
 *       404:
 *         description: Brand not found - ??????? ??? ??????
 *       409:
 *         description: Model already exists - ??????? ????? ??????
 */
router.post('/',
    roleMiddleware(['ADMIN']),
    modelController.createModel
);

/**
 * @swagger
 * /api/models/{id}:
 *   patch:
 *     summary: Update model (Admin only)
 *     description: Update an existing model - ????? ????? ?????
 *     tags: [⚙️ Admin | Brands & Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Model ID - ???? ???????
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brandId:
 *                 type: string
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               year:
 *                 type: integer
 *               size:
 *                 type: string
 *                 enum: [SMALL, MEDIUM, LARGE, EXTRA_LARGE]
 *               imageUrl:
 *                 type: string
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Model updated successfully - ?? ????? ??????? ?????
 *       404:
 *         description: Model not found - ??????? ??? ?????
 *       409:
 *         description: Model with these details already exists - ??????? ???? ???????? ????? ??????
 */
router.patch('/:id',
    roleMiddleware(['ADMIN']),
    modelController.updateModel
);

/**
 * @swagger
 * /api/models/{id}:
 *   delete:
 *     summary: Delete model (Admin only)
 *     description: Delete a model (soft delete by default) - ??? ????? (??? ???????)
 *     tags: [⚙️ Admin | Brands & Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Model ID - ???? ???????
 *       - in: query
 *         name: hardDelete
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Permanently delete model - ??? ????? ???????
 *     responses:
 *       200:
 *         description: Model deleted/deactivated - ?? ???/????? ???????
 *       404:
 *         description: Model not found - ??????? ??? ?????
 */
router.delete('/:id',
    roleMiddleware(['ADMIN']),
    modelController.deleteModel
);

module.exports = router;
