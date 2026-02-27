const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/tracking.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/technician/tracking/location:
 *   post:
 *     summary: Update technician location
 *     description: Technician updates their GPS location (called every 5-10 seconds)
 *     tags: [🔧 Technician | Location]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 24.7136
 *               longitude:
 *                 type: number
 *                 example: 46.6753
 *               heading:
 *                 type: number
 *                 description: Direction in degrees  (0-360)
 *                 example: 180
 *               speed:
 *                 type: number
 *                 description: Speed in km/h
 *                 example: 45.5
 *               accuracy:
 *                 type: number
 *                 description: GPS accuracy in meters
 *                 example: 10
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *                 description: Current job booking ID (if on active job)
 *     responses:
 *       200:
 *         description: Location updated successfully
 */
router.post('/location', authMiddleware, trackingController.updateLocation);

/**
 * @swagger
 * /api/bookings/{bookingId}/track:
 *   get:
 *     summary: Track technician location
 *     description: Customer tracks technician's real-time location
 *     tags: [🔧 Technician | Location]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tracking information
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
 *                     booking:
 *                       type: object
 *                     technician:
 *                       type: object
 *                       properties:
 *                         currentLocation:
 *                           type: object
 *                           properties:
 *                             latitude:
 *                               type: number
 *                             longitude:
 *                               type: number
 *                             heading:
 *                               type: number
 *                             speed:
 *                               type: number
 *                     eta:
 *                       type: object
 *                       properties:
 *                         distanceKm:
 *                           type: number
 *                         durationMinutes:
 *                           type: number
 */
router.get('/:bookingId/track', authMiddleware, trackingController.getTrackingInfo);

/**
 * @swagger
 * /api/bookings/{bookingId}/location-history:
 *   get:
 *     summary: Get location history
 *     description: Retrieve technician's route history for completed job
 *     tags: [🔧 Technician | Location]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Location history points
 */
router.get('/:bookingId/location-history', authMiddleware, trackingController.getLocationHistory);

module.exports = router;
