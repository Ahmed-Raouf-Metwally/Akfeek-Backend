const express = require('express');
const { 
  createBooking, 
  getUserBookings, 
  getAllBookings, 
  updateBookingStatus 
} = require('../controllers/bookings.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Middleware Mock for now until Auth Middleware is implemented in separate file
// We will create the middleware file next.

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management endpoints
 */

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - date
 *             properties:
 *               serviceId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 */
router.post('/', authenticateToken, createBooking);

/**
 * @swagger
 * /bookings/my-bookings:
 *   get:
 *     summary: Get bookings for logged in user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user bookings
 */
router.get('/my-bookings', authenticateToken, getUserBookings);

/**
 * @swagger
 * /bookings/all:
 *   get:
 *     summary: Get all bookings (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all bookings
 */
router.get('/all', authenticateToken, requireAdmin, getAllBookings);

/**
 * @swagger
 * /bookings/{id}/status:
 *   patch:
 *     summary: Update booking status
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', authenticateToken, requireAdmin, updateBookingStatus);

module.exports = router;
