const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);
router.get('/stats', authorize(['ADMIN', 'VENDOR']), dashboardController.getStats);
router.get('/analytics', authorize(['ADMIN']), dashboardController.getAnalytics);
router.get('/all-sub-services', authorize(['ADMIN', 'VENDOR']), dashboardController.getAllSubServices);

module.exports = router;
