const express = require('express');
const router = express.Router();
const autoPartCategoryController = require('../controllers/autoPartCategory.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

/**
 * @swagger
 * /api/auto-part-categories:
 *   get:
 *     summary: Get all categories
 *     tags: [📱 Customer | Marketplace]
 *     responses:
 *       200:
 *         description: List of categories
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
 *                     $ref: '#/components/schemas/AutoPartCategory'
 */
router.get('/', autoPartCategoryController.getAllCategories);

/**
 * @swagger
 * /api/auto-part-categories/tree:
 *   get:
 *     summary: Get category tree hierarchy
 *     tags: [📱 Customer | Marketplace]
 *     responses:
 *       200:
 *         description: Category hierarchical tree
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/AutoPartCategory'
 *                       - type: object
 *                         properties:
 *                           children:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/AutoPartCategory'
 */
router.get('/tree', autoPartCategoryController.getCategoryTree);

/**
 * @swagger
 * /api/auto-part-categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [📱 Customer | Marketplace]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 */
router.get('/:id', autoPartCategoryController.getCategoryById);

// Admin-only routes require authentication
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

/**
 * @swagger
 * /api/auto-part-categories:
 *   post:
 *     summary: Create new category (Admin only)
 *     tags: [📱 Customer | Marketplace]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               vehicleType:
 *                 type: string
 *                 enum: [SEDAN, HATCHBACK, COUPE, SMALL_SUV, LARGE_SEDAN, SUV, CROSSOVER, TRUCK, MOTORCYCLE, HEAVY_EQUIPMENT]
 *               icon:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/', autoPartCategoryController.createCategory);

/**
 * @swagger
 * /api/auto-part-categories/{id}:
 *   put:
 *     summary: Update category (Admin only)
 *     tags: [📱 Customer | Marketplace]
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
 *               nameAr:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put('/:id', autoPartCategoryController.updateCategory);

/**
 * @swagger
 * /api/auto-part-categories/{id}:
 *   delete:
 *     summary: Delete category (Admin only)
 *     tags: [📱 Customer | Marketplace]
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
 *         description: Category deleted
 */
router.delete('/:id', autoPartCategoryController.deleteCategory);

module.exports = router;
