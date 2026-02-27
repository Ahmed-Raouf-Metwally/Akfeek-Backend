const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/rating.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

router.get('/', authorize('ADMIN'), ratingController.list);

module.exports = router;
