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
 *     description: |
 *       Get paginated list of all bookings. Admin only.
 *       قائمة الحجوزات مع الصفحات - للمسؤول فقط.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         description: Filter by booking status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: List of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/', requireRole('ADMIN'), bookingController.getAllBookings);

/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     summary: My bookings (current user)
 *     description: |
 *       Get current user's bookings (customer appointments). Includes workshop/vendor info.
 *       حجوزاتي - حجوزات المستخدم الحالي مع بيانات الورشة/الفيندور.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Current user bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/my', bookingController.getMyBookings);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     description: Get single booking details. Admin or booking owner.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', bookingController.getBookingById);

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

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status (Admin)
 *     description: |
 *       Update booking status. Admin only.
 *       تحديث حالة الحجز - للمسؤول فقط.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *               reason:
 *                 type: string
 *                 description: Optional reason for status change
 *     responses:
 *       200:
 *         description: Booking status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.patch('/:id/status', requireRole('ADMIN'), bookingController.updateBookingStatus);

// Real-time tracking endpoints (for customers)
const trackingController = require('../controllers/tracking.controller');
router.get('/:bookingId/track', trackingController.getTrackingInfo);
router.get('/:bookingId/location-history', trackingController.getLocationHistory);

module.exports = router;
