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

module.exports = router;
