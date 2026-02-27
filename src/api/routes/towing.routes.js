const express = require('express');
const router = express.Router();
const towingController = require('../controllers/towing.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Towing Service
 *   description: Emergency towing service endpoints - خدمة السحب الطارئة
 */

/**
 * @swagger
 * /api/bookings/towing/request:
 *   post:
 *     summary: Create towing request
 *     tags: [Towing Service]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - pickupLocation
 *               - destinationLocation
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               pickupLocation:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                   - address
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     example: 24.7136
 *                   longitude:
 *                     type: number
 *                     example: 46.6753
 *                   address:
 *                     type: string
 *                     example: "King Fahd Road, Riyadh"
 *               destinationLocation:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                   - address
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     example: 24.7500
 *                   longitude:
 *                     type: number
 *                     example: 46.7000
 *                   address:
 *                     type: string
 *                     example: "Workshop, Riyadh"
 *               vehicleCondition:
 *                 type: string
 *                 enum: [NOT_STARTING, ACCIDENT, FLAT_TIRE, ENGINE_FAILURE, OTHER]
 *                 example: "NOT_STARTING"
 *               urgency:
 *                 type: string
 *                 enum: [NORMAL, HIGH]
 *                 default: "NORMAL"
 *                 example: "HIGH"
 *               notes:
 *                 type: string
 *                 example: "Car won't start after accident"
 *               estimatedBudget:
 *                 type: number
 *                 example: 200
 *     responses:
 *       201:
 *         description: Towing request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Towing request created successfully"
 *                 messageAr:
 *                   type: string
 *                   example: "تم إنشاء طلب السحب بنجاح"
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId:
 *                       type: string
 *                       format: uuid
 *                     broadcastId:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: "BROADCASTING"
 *                     estimatedDistance:
 *                       type: number
 *                       example: 4.2
 *                     estimatedPrice:
 *                       type: number
 *                       example: 71
 *                     broadcastUntil:
 *                       type: string
 *                       format: date-time
 *                     nearbyTechniciansCount:
 *                       type: number
 *                       example: 5
 *       404:
 *         description: Vehicle not found or no technicians available
 */
router.post('/request', authMiddleware, towingController.createRequest);

/**
 * @swagger
 * /api/bookings/towing/{broadcastId}/offers:
 *   get:
 *     summary: Get offers for towing request
 *     tags: [Towing Service]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: broadcastId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Broadcast ID from create request response
 *     responses:
 *       200:
 *         description: List of offers from technicians
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
 *                   properties:
 *                     broadcast:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         status:
 *                           type: string
 *                           example: "BROADCASTING"
 *                         pickupLocation:
 *                           type: object
 *                         destinationLocation:
 *                           type: object
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                     offers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           technician:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                                 example: "Ahmed المهندس"
 *                               avatar:
 *                                 type: string
 *                               rating:
 *                                 type: number
 *                                 example: 4.8
 *                               completedJobs:
 *                                 type: number
 *                                 example: 150
 *                               distance:
 *                                 type: number
 *                                 example: 2.3
 *                               estimatedArrival:
 *                                 type: number
 *                                 example: 8
 *                           bidAmount:
 *                             type: number
 *                             example: 180
 *                           message:
 *                             type: string
 *                             example: "I'm nearby, can arrive in 8 minutes"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 */
router.get('/:broadcastId/offers', authMiddleware, towingController.getOffers);

/**
 * @swagger
 * /api/bookings/towing/{broadcastId}/offers/{offerId}/accept:
 *   post:
 *     summary: Accept technician offer
 *     tags: [Towing Service]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: broadcastId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Offer accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Offer accepted successfully"
 *                 messageAr:
 *                   type: string
 *                   example: "تم قبول العرض بنجاح"
 *                 data:
 *                   type: object
 *                   properties:
 *                     booking:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         bookingNumber:
 *                           type: string
 *                           example: "TWG-20260127-001"
 *                         status:
 *                           type: string
 *                           example: "TECHNICIAN_ASSIGNED"
 *                         technician:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             phone:
 *                               type: string
 *                             avatar:
 *                               type: string
 *                         agreedPrice:
 *                           type: number
 *                           example: 180
 */
router.post('/:broadcastId/offers/:offerId/accept', authMiddleware, towingController.acceptOffer);

module.exports = router;
