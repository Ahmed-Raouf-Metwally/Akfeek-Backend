const express = require('express');
const router = express.Router();
const technicianCarWashController = require('../controllers/technicianCarwash.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

// Protect all routes
router.use(authMiddleware);
router.use(requireRole(['TECHNICIAN']));

/**
 * @swagger
 * /api/technician/carwash/broadcasts:
 *   get:
 *     summary: Get active car wash broadcasts
 *     description: |
 *       Fetch all active car wash requests within the technician's service radius.
 *       
 *       جلب جميع طلبات غسيل السيارات النشطة في نطاق خدمة الفني
 *     tags: [🔧 Technician | Car Wash Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active broadcasts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     broadcasts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           customer:
 *                             type: object
 *                             properties:
 *                               name: { type: string }
 *                               avatar: { type: string }
 *                           vehicle:
 *                             type: object
 *                             properties:
 *                               make: { type: string }
 *                               model: { type: string }
 *                               year: { type: integer }
 *                               plateNumber: { type: string }
 *                           location:
 *                             type: object
 *                             properties:
 *                               address: { type: string }
 *                               distance: { type: number }
 *                               eta: { type: number }
 *                           serviceType: { type: string }
 *                           estimatedBudget: { type: number }
 */
router.get('/broadcasts', technicianCarWashController.getBroadcasts);

/**
 * @swagger
 * /api/technician/carwash/{broadcastId}/offers:
 *   post:
 *     summary: Submit an offer for a car wash request
 *     description: |
 *       Submit a price and ETA offer for a specific car wash job broadcast.
 *       
 *       تقديم عرض سعر ووقت وصول لطلب غسيل سيارة محدد
 *     tags: [🔧 Technician | Car Wash Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: broadcastId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the broadcast to offer on
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bidAmount
 *               - estimatedArrival
 *             properties:
 *               bidAmount:
 *                 type: number
 *                 description: Offered price in SAR
 *                 example: 150
 *               estimatedArrival:
 *                 type: number
 *                 description: Estimated arrival time in minutes
 *                 example: 15
 *               message:
 *                 type: string
 *                 description: Optional message to customer
 *                 example: "I have premium wax tools"
 *     responses:
 *       200:
 *         description: Offer submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/:broadcastId/offers', technicianCarWashController.submitOffer);

module.exports = router;
