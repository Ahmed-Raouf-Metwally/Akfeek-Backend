const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const controller = require('../controllers/mobileCarService.controller');

/**
 * @swagger
 * tags:
 *   name: Mobile Car Service
 *   description: Mobile Car Service (Maintanence/Oil Change) - خدمات الموبايل سيرفس
 */

// Public: parent service and sub-services (no auth required for catalog)
/**
 * @swagger
 * /api/mobile-car-service:
 *   get:
 *     summary: Get Mobile Car Service details
 *     tags: [Mobile Car Service]
 *     responses:
 *       200:
 *         description: Service details
 */
router.get('/', controller.getParentService);

/**
 * @swagger
 * /api/mobile-car-service/sub-services:
 *   get:
 *     summary: Get sub-services for Mobile Car Service
 *     tags: [Mobile Car Service]
 *     responses:
 *       200:
 *         description: List of sub-services
 */
router.get('/sub-services', controller.getSubServices);

/**
 * @swagger
 * /api/mobile-car-service/compatible-parts:
 *   get:
 *     summary: Get compatible spare parts for a vehicle
 *     tags: [Mobile Car Service]
 *     parameters:
 *       - in: query
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of compatible parts
 */
router.get('/compatible-parts', controller.getCompatibleSpareParts);

/**
 * @swagger
 * /api/mobile-car-service/recommended-parts:
 *   get:
 *     summary: Get recommended spare parts for a service
 *     tags: [Mobile Car Service]
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of recommended parts
 */
router.get('/recommended-parts', controller.getRecommendedSpareParts);

// Protected: create booking (customer)
/**
 * @swagger
 * /api/mobile-car-service/bookings:
 *   post:
 *     summary: Create mobile car service booking
 *     tags: [Mobile Car Service]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, scheduledDate, serviceIds]
 *     responses:
 *       201:
 *         description: Booking created
 */
router.post('/bookings', authMiddleware, requireRole(['CUSTOMER']), controller.createBooking);

// Protected: get booking by ID (customer own, or admin)
/**
 * @swagger
 * /api/mobile-car-service/bookings/{id}:
 *   get:
 *     summary: Get mobile service booking details
 *     tags: [Mobile Car Service]
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
 *         description: Booking details
 */
router.get('/bookings/:id', authMiddleware, controller.getBookingById);

// Protected: update booking status (technician or admin)
/**
 * @swagger
 * /api/mobile-car-service/bookings/{id}/status:
 *   patch:
 *     summary: Update mobile service booking status
 *     tags: [Mobile Car Service]
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
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/bookings/:id/status', authMiddleware, requireRole(['TECHNICIAN', 'ADMIN']), controller.updateBookingStatus);

// Admin: link spare part to service; add vendor supply (does not affect existing vendor logic)
router.post('/admin/parts/:autoPartId/services', authMiddleware, requireRole(['ADMIN']), controller.linkPartToService);
router.post('/admin/parts/:autoPartId/vendors', authMiddleware, requireRole(['ADMIN']), controller.setPartVendorSupply);

module.exports = router;

