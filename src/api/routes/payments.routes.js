const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const paymentController = require('../controllers/payment.controller');

router.use(authMiddleware);

router.get('/', paymentController.list);
router.get('/:id', paymentController.getById);

module.exports = router;
