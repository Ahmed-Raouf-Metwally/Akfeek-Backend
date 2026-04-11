const express = require('express');
const router = express.Router();
const packagesController = require('../controllers/packages.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/packages:
 *   get:
 *     summary: Get all active packages
 *     description: Retrieve all active packages with their associated services
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of packages
 *         content:
 *           application/json:
 *             example:
 *               - id: "pkg-123"
 *                 name: "Basic Package"
 *                 nameAr: "الباقة الأساسية"
 *                 description: "包括基本服务"
 *                 price: 300
 *                 usageCount: null
 *                 validityDays: 30
 *                 isActive: true
 *                 services:
 *                   - id: "svc-1"
 *                     name: "Oil Change"
 *                     nameAr: "تغيير الزيت"
 */
router.get('/', packagesController.getAllPackages);

/**
 * @swagger
 * /api/packages/services:
 *   get:
 *     summary: Get all available services for package selection
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of services
 */
router.get('/services', packagesController.getAllServices);

/**
 * @swagger
 * /api/packages/eligible:
 *   get:
 *     summary: Get packages eligible for specific services
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceIds
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated service IDs
 *     responses:
 *       200:
 *         description: List of eligible packages
 */
router.get('/eligible', packagesController.getEligiblePackages);

/**
 * @swagger
 * /api/packages/{id}:
 *   get:
 *     summary: Get package by ID
 *     tags: [Packages]
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
 *         description: Package details
 */
router.get('/:id', packagesController.getPackageById);

/**
 * @swagger
 * /api/packages:
 *   post:
 *     summary: Create a new package (Admin only)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               usageCount:
 *                 type: integer
 *               validityDays:
 *                 type: integer
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Package created
 */
router.post('/', requireRole(['ADMIN']), packagesController.createPackage);

/**
 * @swagger
 * /api/packages/{id}:
 *   put:
 *     summary: Update a package (Admin only)
 *     tags: [Packages]
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
 *         description: Package updated
 */
router.put('/:id', requireRole(['ADMIN']), packagesController.updatePackage);

/**
 * @swagger
 * /api/packages/{id}:
 *   delete:
 *     summary: Delete a package (Admin only)
 *     tags: [Packages]
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
 *         description: Package deleted
 */
router.delete('/:id', requireRole(['ADMIN']), packagesController.deletePackage);

/**
 * @swagger
 * /api/packages/user-packages/my-packages:
 *   get:
 *     summary: Get current user's packages
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's active packages
 *         content:
 *           application/json:
 *             example:
 *               - id: "userpkg-123"
 *                 userId: "user-123"
 *                 packageId: "pkg-123"
 *                 package:
 *                   name: "Basic Package"
 *                   nameAr: "الباقة الأساسية"
 *                   price: 300
 *                   validityDays: 30
 *                   services:
 *                     - name: "Oil Change"
 *                       nameAr: "تغيير الزيت"
 *                 purchasedAt: "2026-04-11T10:00:00.000Z"
 *                 expiresAt: "2026-05-11T10:00:00.000Z"
 *                 isActive: true
 *                 remainingServices:
 *                   - serviceId: "svc-1"
 *                     serviceName: "Oil Change"
 *                     usedCount: 0
 */
router.get('/user-packages/my-packages', packagesController.getUserPackages);

/**
 * @swagger
 * /api/packages/user-packages/eligible:
 *   get:
 *     summary: Get user's eligible packages for specific services
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceIds
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated service IDs
 *     responses:
 *       200:
 *         description: List of user's eligible packages
 */
router.get('/user-packages/eligible', packagesController.getUserEligiblePackages);

/**
 * @swagger
 * /api/packages/user-packages/{id}:
 *   get:
 *     summary: Get specific user package by ID
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User package ID
 *     responses:
 *       200:
 *         description: Package details with usage
 */
router.get('/user-packages/:id', packagesController.getUserPackageById);

/**
 * @swagger
 * /api/user-packages/purchase:
 *   post:
 *     summary: Purchase a package
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - packageId
 *             properties:
 *               packageId:
 *                 type: string
 *                 description: The ID of the package to purchase
 *           example:
 *             packageId: "pkg-123"
 *     responses:
 *       201:
 *         description: Package purchased successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Package purchased successfully"
 *               data:
 *                 id: "userpkg-123"
 *                 userId: "user-123"
 *                 packageId: "pkg-123"
 *                 package:
 *                   name: "Basic Package"
 *                   nameAr: "الباقة الأساسية"
 *                   price: 300
 *                   validityDays: 30
 *                 purchasedAt: "2026-04-11T10:00:00.000Z"
 *                 expiresAt: "2026-05-11T10:00:00.000Z"
 *                 isActive: true
 */
router.post('/user-packages/purchase', packagesController.purchasePackage);

/**
 * @swagger
 * /api/packages/admin/subscriptions:
 *   get:
 *     summary: Get all user package subscriptions (Admin only)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *         description: Filter by package ID (optional)
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active/inactive subscriptions
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username or email
 *     responses:
 *       200:
 *         description: List of subscriptions with usage details
 */
router.get('/admin/subscriptions', requireRole(['ADMIN']), packagesController.getAllSubscriptions);

// ========================================================================
// Separate router for /api/user-packages/* endpoints (no prefix)
// ========================================================================
const userPackagesRouter = express.Router();
userPackagesRouter.use(authMiddleware);

/**
 * @swagger
 * /api/user-packages/my-packages:
 *   get:
 *     summary: Get current user's packages
 *     tags: [User Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's active packages
 */
userPackagesRouter.get('/my-packages', packagesController.getUserPackages);

/**
 * @swagger
 * /api/user-packages/eligible:
 *   get:
 *     summary: Get user's eligible packages for specific services
 *     tags: [User Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceIds
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user's eligible packages
 */
userPackagesRouter.get('/eligible', packagesController.getUserEligiblePackages);

/**
 * @swagger
 * /api/user-packages/{id}:
 *   get:
 *     summary: Get specific user package by ID
 *     tags: [User Packages]
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
 *         description: Package details with usage
 */
userPackagesRouter.get('/:id', packagesController.getUserPackageById);

/**
 * @swagger
 * /api/user-packages/purchase:
 *   post:
 *     summary: Purchase a package
 *     tags: [User Packages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - packageId
 *             properties:
 *               packageId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Package purchased successfully
 */
userPackagesRouter.post('/purchase', packagesController.purchasePackage);

module.exports = { defaultRouter: router, userPackagesRouter };
