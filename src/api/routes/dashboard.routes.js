const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Dashboard KPI stats
 *     description: أدمن أو فيندور — أرقام ملخصة للوحة التحكم
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Forbidden
 */
router.get('/stats', authorize(['ADMIN', 'VENDOR']), dashboardController.getStats);

/**
 * @swagger
 * /api/dashboard/analytics:
 *   get:
 *     summary: Platform analytics (admin only)
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Admin only
 */
router.get('/analytics', authorize(['ADMIN']), dashboardController.getAnalytics);

/**
 * @swagger
 * /api/dashboard/all-sub-services:
 *   get:
 *     summary: All sub-services for dashboard filters / overview
 *     description: أدمن أو فيندور
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/all-sub-services', authorize(['ADMIN', 'VENDOR']), dashboardController.getAllSubServices);

module.exports = router;
