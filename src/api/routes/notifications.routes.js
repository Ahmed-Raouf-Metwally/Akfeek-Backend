const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const notificationController = require('../controllers/notification.controller');

router.use(authMiddleware);

router.get('/', notificationController.getMyNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.get('/:id', notificationController.getById);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
