const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const bookingController = require('../controllers/booking.controller');

router.use(authMiddleware);

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: List all bookings (Admin)
 *     description: Retrieve a paginated list of all bookings in the system.
 *     tags: [📱 Customer | Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of bookings
 */
router.get('/', requireRole('ADMIN'), bookingController.getAllBookings);

/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     summary: Get my bookings
 *     description: Retrieve bookings for the authenticated customer.
 *     tags: [📱 Customer | Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of user bookings
 */
router.get('/my', bookingController.getMyBookings);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     description: Retrieve details of a specific booking.
 *     tags: [📱 Customer | Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking details
 *       404:
 *         description: Booking not found
 */
router.get('/:id', bookingController.getBookingById);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create new booking
 *     description: Create a new booking with optional workshop and delivery method
 *     tags: [📱 Customer | Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, scheduledDate]
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
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               productIds:
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

/**
 * @swagger
 * /api/bookings/{bookingId}/track:
 *   get:
 *     summary: Get tracking info for booking
 *     description: Retrieve current location of assigned technician.
 *     tags: [📱 Customer | Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Tracking information
 */
/**
 * @swagger
 * /api/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status
 *     description: Update booking status. Auto-creates invoice when status is COMPLETED or DELIVERED.
 *     tags: [⚙️ Admin | Bookings]
 *     security:
 *       - bearerAuth: []
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, DELIVERED, CANCELLED, TECHNICIAN_EN_ROUTE, ARRIVED, IN_SERVICE]
 *               notes:
 *                 type: string
 *               technicianId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated. Invoice auto-created if COMPLETED/DELIVERED.
 */
router.patch('/:id/status', requireRole('ADMIN', 'TECHNICIAN'), bookingController.updateBookingStatus);

const trackingController = require('../controllers/tracking.controller');
router.get('/:bookingId/track', trackingController.getTrackingInfo);

/**
 * @swagger
 * /api/bookings/{bookingId}/location-history:
 *   get:
 *     summary: Get location history for booking
 *     description: Retrieve polyline/history of technician movement.
 *     tags: [📱 Customer | Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Location history
 */
router.get('/:bookingId/location-history', trackingController.getLocationHistory);

module.exports = router;

