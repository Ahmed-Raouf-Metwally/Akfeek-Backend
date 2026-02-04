const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);
// Only Admin should see full dashboard stats
router.get('/stats', authorize('ADMIN'), dashboardController.getStats);

module.exports = router;
