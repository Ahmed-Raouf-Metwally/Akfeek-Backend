const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

// All routes require authentication and Admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', activityController.getAllLogs);
router.post('/', activityController.createLog);

module.exports = router;
