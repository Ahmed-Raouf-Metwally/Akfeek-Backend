const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/rating.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

/**
 * @swagger
 * /api/ratings:
 *   get:
 *     summary: List all ratings and reviews (Admin only)
 *     description: |
 *       Get paginated list of all ratings/reviews in the system.
 *       التقييمات والمراجعات — قائمة بكل التقييمات والمراجعات (للمشرف فقط).
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of ratings with booking, rater and ratee info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       bookingId: { type: string }
 *                       raterId: { type: string }
 *                       rateeId: { type: string }
 *                       score: { type: integer, description: '1-5 stars' }
 *                       review: { type: string, nullable: true }
 *                       punctuality: { type: integer, nullable: true }
 *                       professionalism: { type: integer, nullable: true }
 *                       quality: { type: integer, nullable: true }
 *                       communication: { type: integer, nullable: true }
 *                       createdAt: { type: string, format: date-time }
 *                       booking: { type: object }
 *                       rater: { type: object }
 *                       ratee: { type: object }
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/', authorize('ADMIN'), ratingController.list);

module.exports = router;
