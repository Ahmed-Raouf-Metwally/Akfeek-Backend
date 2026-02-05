const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const bookingController = require('../controllers/booking.controller');

router.use(authMiddleware);

/**
 * GET /api/bookings - List all bookings (Admin). Paginated.
 * Query: page, limit, status
 */
router.get('/', requireRole('ADMIN'), bookingController.getAllBookings);

/**
 * GET /api/bookings/:id - Get one booking by id (Admin).
 */
router.get('/:id', requireRole('ADMIN'), bookingController.getBookingById);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create new booking
 *     description: Create a new booking with optional workshop and delivery method
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, vehicleId, scheduledDate]
 *             properties:
 *               customerId:
 *                 type: string
 *               vehicleId:
 *                 type: string
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *               scheduledTime:
 *                 type: string
 *                 example: "10:00"
 *               workshopId:
 *                 type: string
 *                 description: ID of certified workshop (optional)
 *               deliveryMethod:
 *                 type: string
 *                 enum: [FLATBED, SELF_DELIVERY]
 *                 description: Required if workshopId is provided
 *               services:
 *                 type: array
 *                 items:
 *                   type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Invalid input or workshop not available
 *       404:
 *         description: Workshop not found
 */
router.post('/', bookingController.createBooking);

// Real-time tracking endpoints (for customers)
const trackingController = require('../controllers/tracking.controller');
router.get('/:bookingId/track', trackingController.getTrackingInfo);
router.get('/:bookingId/location-history', trackingController.getLocationHistory);

module.exports = router;
