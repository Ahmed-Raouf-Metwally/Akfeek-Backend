const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/rating.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: Reviews & ratings - التقييمات والمراجعات
 */

router.use(authenticate);

/**
 * @swagger
 * /api/ratings:
 *   get:
 *     summary: List all ratings (Admin)
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of ratings
 */
router.get('/', authorize('ADMIN'), ratingController.list);

module.exports = router;

