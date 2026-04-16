const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');
const ctrl = require('../../controllers/admin/mobileWorkshopHierarchy.admin.controller');

// Admin-only
router.use(auth, role('ADMIN'));

/**
 * @swagger
 * tags:
 *   name: Admin Mobile Workshop Hierarchy
 *   description: Admin CRUD for mobile workshop catalogs, categories, and services (with images).
 */

// Catalogs
/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/catalogs:
 *   get:
 *     summary: List mobile workshop catalogs (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Catalogs list
 */
router.get('/catalogs', ctrl.listCatalogs);

/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/catalogs:
 *   post:
 *     summary: Create mobile workshop catalog (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string, nullable: true }
 *               imageUrl: { type: string, nullable: true }
 *               sortOrder: { type: integer, default: 0 }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Catalog created
 */
router.post('/catalogs', ctrl.createCatalog);

/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/catalogs/{id}:
 *   put:
 *     summary: Update mobile workshop catalog (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string, nullable: true }
 *               imageUrl: { type: string, nullable: true }
 *               sortOrder: { type: integer }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Catalog updated
 */
router.put('/catalogs/:id', ctrl.updateCatalog);

/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/catalogs/{id}:
 *   delete:
 *     summary: Delete mobile workshop catalog (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Catalog deleted
 */
router.delete('/catalogs/:id', ctrl.deleteCatalog);

// Categories (under catalog)
/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/catalogs/{catalogId}/categories:
 *   get:
 *     summary: List categories for a catalog (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: catalogId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Categories list
 */
router.get('/catalogs/:catalogId/categories', ctrl.listCategories);

/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/catalogs/{catalogId}/categories:
 *   post:
 *     summary: Create category under catalog (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: catalogId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string, nullable: true }
 *               imageUrl: { type: string, nullable: true }
 *               sortOrder: { type: integer, default: 0 }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/catalogs/:catalogId/categories', ctrl.createCategory);

/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/categories/{id}:
 *   put:
 *     summary: Update category (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string, nullable: true }
 *               imageUrl: { type: string, nullable: true }
 *               sortOrder: { type: integer }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put('/categories/:id', ctrl.updateCategory);

/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/categories/{id}:
 *   delete:
 *     summary: Delete category (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category deleted
 */
router.delete('/categories/:id', ctrl.deleteCategory);

// Services (under category)
/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/categories/{categoryId}/services:
 *   get:
 *     summary: List services for a category (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Services list
 */
router.get('/categories/:categoryId/services', ctrl.listServices);

/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/categories/{categoryId}/services:
 *   post:
 *     summary: Create service under category (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string, nullable: true }
 *               imageUrl: { type: string, nullable: true }
 *               priceMin: { type: number, nullable: true }
 *               priceMax: { type: number, nullable: true }
 *               currency: { type: string, default: "SAR" }
 *               pricingNoteAr: { type: string, nullable: true }
 *               sortOrder: { type: integer, default: 0 }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Service created
 */
router.post('/categories/:categoryId/services', ctrl.createService);

/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/services/{id}:
 *   put:
 *     summary: Update service (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string, nullable: true }
 *               imageUrl: { type: string, nullable: true }
 *               priceMin: { type: number, nullable: true }
 *               priceMax: { type: number, nullable: true }
 *               currency: { type: string }
 *               pricingNoteAr: { type: string, nullable: true }
 *               sortOrder: { type: integer }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Service updated
 */
router.put('/services/:id', ctrl.updateService);

/**
 * @swagger
 * /api/admin/mobile-workshop-hierarchy/services/{id}:
 *   delete:
 *     summary: Delete service (Admin)
 *     tags: [Admin Mobile Workshop Hierarchy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Service deleted
 */
router.delete('/services/:id', ctrl.deleteService);

module.exports = router;

