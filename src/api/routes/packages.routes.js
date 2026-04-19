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
 * /api/bookings/apply-package:
 *   post:
 *     summary: Apply a package to a booking
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: string
 *               userPackageId:
 *                 type: string
 *               serviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Package applied successfully
 */
router.post('/bookings/apply-package', packagesController.applyPackageToBooking);

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

/**
 * Mounted at `/api/user-packages` from routes/index.js
 * @swagger
 * /api/user-packages/my-packages:
 *   get:
 *     summary: Get current user's packages
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 */
/**
 * @swagger
 * /api/user-packages/eligible:
 *   get:
 *     summary: Get user's eligible packages for specific services
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 */
/**
 * @swagger
 * /api/user-packages/{id}:
 *   get:
 *     summary: Get specific user package by ID
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 */
/**
 * @swagger
 * /api/user-packages/purchase:
 *   post:
 *     summary: Purchase a package
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 */
const userPackagesRouter = express.Router();
userPackagesRouter.use(authMiddleware);
userPackagesRouter.get('/my-packages', packagesController.getUserPackages);
userPackagesRouter.get('/eligible', packagesController.getUserEligiblePackages);
userPackagesRouter.post('/purchase', packagesController.purchasePackage);
userPackagesRouter.get('/:id', packagesController.getUserPackageById);

module.exports = router;
module.exports.defaultRouter = router;
module.exports.userPackagesRouter = userPackagesRouter;
