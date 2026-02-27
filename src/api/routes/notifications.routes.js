const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const notificationController = require('../controllers/notification.controller');

router.use(authMiddleware);

// User routes
router.get('/', notificationController.getMyNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.get('/:id', notificationController.getById);
router.patch('/:id/read', notificationController.markAsRead);

// Admin routes
router.get('/admin/all', roleMiddleware(['ADMIN']), notificationController.getAllNotifications);

module.exports = router;
