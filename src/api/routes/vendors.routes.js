const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendor.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

// All vendor routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     summary: Get all vendors (Admin only)
 *     tags: [Marketplace Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by vendor status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by business name
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of vendors
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
 *                     $ref: '#/components/schemas/VendorProfile'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', requireRole('ADMIN'), vendorController.getAllVendors);

/**
 * @swagger
 * /api/vendors/profile/me:
 *   get:
 *     summary: Get current user's vendor profile
 *     tags: [Marketplace Vendors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current vendor profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VendorProfile'
 */
router.get('/profile/me', requireRole('VENDOR'), vendorController.getMyVendorProfile);

/**
 * @swagger
 * /api/vendors/{id}:
 *   get:
 *     summary: Get vendor details by ID
 *     tags: [Marketplace Vendors]
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
 *         description: Vendor details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VendorProfile'
 */
router.get('/:id', vendorController.getVendorById);

/**
 * @swagger
 * /api/vendors/{id}/stats:
 *   get:
 *     summary: Get vendor statistics
 *     tags: [Marketplace Vendors]
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
 *         description: Vendor statistics
 */
router.get('/:id/stats', vendorController.getVendorStats);

/**
 * @swagger
 * /api/vendors:
 *   post:
 *     summary: Create new vendor profile
 *     tags: [Marketplace Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [businessName, contactPhone]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID (Required for Admin, ignored for self-registration)
 *               businessName:
 *                 type: string
 *               businessNameAr:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/', vendorController.createVendor);

/**
 * @swagger
 * /api/vendors/{id}:
 *   put:
 *     summary: Update vendor profile
 *     tags: [Marketplace Vendors]
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
 *               businessName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor updated
 */
router.put('/:id', vendorController.updateVendor);

/**
 * @swagger
 * /api/vendors/{id}/status:
 *   put:
 *     summary: Update vendor status (Admin only)
 *     tags: [Marketplace Vendors]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING_APPROVAL, ACTIVE, SUSPENDED, REJECTED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', requireRole('ADMIN'), vendorController.updateVendorStatus);

/**
 * @swagger
 * /api/vendors/{id}:
 *   delete:
 *     summary: Delete vendor (Admin only)
 *     tags: [Marketplace Vendors]
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
 *         description: Vendor deleted
 */
router.delete('/:id', requireRole('ADMIN'), vendorController.deleteVendor);

module.exports = router;
