const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

/**
 * @swagger
 * tags:
 *   name: Admin Activity Logs
 *   description: System activity and audit logs for administrators - سجلات نشاط النظام للمسؤولين
 */

// All routes require authentication and Admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * @swagger
 * /api/activity:
 *   get:
 *     summary: Get all activity logs (Admin)
 *     tags: [Admin Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of activity logs
 *   post:
 *     summary: Create manual activity log (Admin)
 *     tags: [Admin Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, description]
 *             properties:
 *               action: { type: string }
 *               description: { type: string }
 *               metadata: { type: object }
 *     responses:
 *       201:
 *         description: Log created
 */
router.get('/', activityController.getAllLogs);
router.post('/', activityController.createLog);

module.exports = router;

