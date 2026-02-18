const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);
// Admin and Vendor can see dashboard stats (Vendor sees same aggregate for now)
router.get('/stats', authorize(['ADMIN', 'VENDOR']), dashboardController.getStats);

module.exports = router;
