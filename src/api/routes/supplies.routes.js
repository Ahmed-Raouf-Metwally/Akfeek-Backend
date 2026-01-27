const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const stubController = require('../controllers/stub.controller');

router.use(authMiddleware);

router.get('/', stubController.list);

module.exports = router;
