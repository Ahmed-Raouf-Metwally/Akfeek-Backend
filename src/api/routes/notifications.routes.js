const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const notificationController = require('../controllers/notification.controller');
const deviceTokenController = require('../controllers/deviceToken.controller');

router.use(authMiddleware);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get my notifications (paginated)
 *     description: |
 *       Get current user's notifications. Push notifications - الإشعارات.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - name: limit
 *         in: query
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *         description: Items per page
 *       - name: unreadOnly
 *         in: query
 *         schema: { type: string, enum: ['true', 'false'], default: 'false' }
 *         description: If true, return only unread notifications
 *     responses:
 *       200:
 *         description: List of notifications with pagination
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
 *                       userId: { type: string }
 *                       type: { type: string }
 *                       title: { type: string }
 *                       titleAr: { type: string, nullable: true }
 *                       message: { type: string }
 *                       messageAr: { type: string, nullable: true }
 *                       isRead: { type: boolean }
 *                       readAt: { type: string, format: date-time, nullable: true }
 *                       bookingId: { type: string, nullable: true }
 *                       metadata: { type: object, nullable: true }
 *                       createdAt: { type: string, format: date-time }
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', notificationController.getMyNotifications);

/**
 * @swagger
 * /api/notifications/device-token:
 *   post:
 *     summary: Upsert my device token (FCM) — تسجيل/تحديث توكن الجهاز للبوش
 *     description: |
 *       يسجل أو يحدّث `FCM token` للمستخدم الحالي (لإرسال Push Notifications).
 *       استخدمه بعد تسجيل الدخول أو عند تغيّر التوكن.
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, description: FCM token }
 *               platform: { type: string, enum: [ANDROID, IOS, WEB, OTHER], default: OTHER }
 *               deviceId: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Saved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/device-token', deviceTokenController.upsertMyDeviceToken);

/**
 * @swagger
 * /api/notifications/device-token:
 *   delete:
 *     summary: Deactivate my device token — تعطيل توكن الجهاز
 *     description: |
 *       يعطّل توكن جهاز محدد (مثلاً عند logout) حتى لا يستقبل Push.
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Deactivated
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/device-token', deviceTokenController.deactivateMyDeviceToken);

/**
 * @swagger
 * /api/notifications/admin/all:
 *   get:
 *     summary: Get all notifications in the system (Admin only)
 *     description: |
 *       قائمة بكل الإشعارات في النظام (للمشرف فقط). Push notifications - الإشعارات.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - name: limit
 *         in: query
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - name: userId
 *         in: query
 *         schema: { type: string, format: uuid }
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: List of all notifications with user info and pagination
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/admin/all', roleMiddleware(['ADMIN']), notificationController.getAllNotifications);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all my notifications as read
 *     description: تعليم كل الإشعارات كمقروءة للمستخدم الحالي.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 messageAr: { type: string }
 *                 data: { type: object }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{id}:
 *   get:
 *     summary: Get notification by ID
 *     description: Get single notification (must belong to current user, or Admin can get any).
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification details
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', notificationController.getById);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: تعليم إشعار واحد كمقروء.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
