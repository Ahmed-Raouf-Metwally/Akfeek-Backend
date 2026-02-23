const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

/**
 * @swagger
 * tags:
 *   name: Admin Dashboard
 *   description: High-level system statistics and overview - نظرة عامة وإحصائيات النظام
 */

router.use(authenticate);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics overview
 *     description: Retrieve key metrics like total users, bookings, revenue, etc.
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/stats', authorize(['ADMIN', 'VENDOR']), dashboardController.getStats);

module.exports = router;

