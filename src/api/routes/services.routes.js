const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const { upload: uploadServiceImage } = require('../../utils/serviceImageUpload');

// Public access for listing services (or auth required if business rule dictates)
// For now, allow authenticated users to view
router.use(authMiddleware);

/**
 * @swagger
 * /api/services/upload-image:
 *   post:
 *     summary: Upload service image
 *     tags: [⚙️ Admin | Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 */
router.post('/upload-image', requireRole(['ADMIN', 'VENDOR']), uploadServiceImage.single('file'), serviceController.uploadImage);

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all services
 *     description: Retrieve a list of all available services with filtering
 *     tags: [📱 Customer | Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [CLEANING, MAINTENANCE, REPAIR, EMERGENCY, INSPECTION, CUSTOMIZATION, COMPREHENSIVE_CARE]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [FIXED, CATALOG, EMERGENCY, INSPECTION]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of services retrieved
 */
router.get('/', serviceController.getAllServices);

/**
 * @swagger
 * /api/services/{id}/available-slots:
 *   get:
 *     summary: Get available time slots for a service
 *     description: Returns available time slots for Comprehensive Care booking (no double-book).
 *     tags: [🏪 Vendor | Comprehensive Care]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-02-23"
 *     responses:
 *       200:
 *         description: List of available slots
 */
router.get('/:id/available-slots', serviceController.getAvailableSlots);


/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Get service details
 *     tags: [📱 Customer | Services]
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
 *         description: Service details retrieved
 *       404:
 *         description: Service not found
 */
router.get('/:id', serviceController.getServiceById);

// Admin routes
/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create new service (Admin)
 *     tags: [⚙️ Admin | Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, category]
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               category:
 *                 type: string
 *               estimatedDuration:
 *                 type: integer
 *               pricing:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     vehicleSize:
 *                       type: string
 *                     basePrice:
 *                       type: number
 *     responses:
 *       201:
 *         description: Service created
 */
// Admin or Vendor (Vendor can only create COMPREHENSIVE_CARE – enforced in service)
router.post('/', requireRole(['ADMIN', 'VENDOR']), serviceController.createService);

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Update service (Admin)
 *     tags: [⚙️ Admin | Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Service updated
 */
router.put('/:id', requireRole(['ADMIN', 'VENDOR']), serviceController.updateService);

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Delete/Deactivate service (Admin)
 *     tags: [⚙️ Admin | Services]
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
 *         description: Service deleted
 */
router.delete('/:id', requireRole(['ADMIN', 'VENDOR']), serviceController.deleteService);

module.exports = router;
