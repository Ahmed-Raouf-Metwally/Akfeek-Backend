const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const bookingController = require('../controllers/booking.controller');
const technicalSupportController = require('../controllers/technicalSupport.controller');

/**
 * فني اكفيك (خدمات عامة) — حجوزاتي المعينة لي + طلبات الدعم الفني المعينة لي
 * All routes require TECHNICIAN role.
 */

/**
 * @swagger
 * /api/technician/bookings:
 *   get:
 *     summary: Get my assigned bookings (Technician)
 *     description: |
 *       الحجوزات العامة المعينة للفني (غير الونش والغسيل)
 *       Returns general bookings assigned to the authenticated technician.
 *     tags: [🔧 Technician | My Jobs]
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
 *         description: List of assigned bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
/** GET /api/technician/bookings — حجوزاتي المعينة لي (الحجوزات العادية غير الونش/الغسيل) */
router.get(
  '/bookings',
  authMiddleware,
  requireRole('TECHNICIAN'),
  bookingController.getMyAssignedBookings
);

/**
 * @swagger
 * /api/technician/technical-support-requests:
 *   get:
 *     summary: Get my assigned technical support requests (Technician)
 *     description: |
 *       طلبات الدعم الفني المعينة للفني المسجل دخوله
 *       Returns technical support requests assigned to the authenticated technician.
 *     tags: [🔧 Technician | My Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of assigned support requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
/** GET /api/technician/technical-support-requests — طلبات الدعم الفني المعينة لي */
router.get(
  '/technical-support-requests',
  authMiddleware,
  requireRole('TECHNICIAN'),
  technicalSupportController.getMyAssignedRequests
);

module.exports = router;
