const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

// All routes require authentication and Admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * @swagger
 * /api/activity:
 *   get:
 *     summary: List activity logs (admin)
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated logs
 *   post:
 *     summary: Create activity log entry
 *     description: مسجل من الواجهة أو للاستخدام الداخلي — userId من التوكن
 *     tags: [Activity Logs]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string }
 *               entity: { type: string }
 *               entityId: { type: string }
 *               details: { type: object }
 *     responses:
 *       201:
 *         description: Created
 */
router.get('/', activityController.getAllLogs);
router.post('/', activityController.createLog);

module.exports = router;
