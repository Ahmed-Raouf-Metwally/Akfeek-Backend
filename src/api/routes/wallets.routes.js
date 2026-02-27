const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const walletController = require('../controllers/wallet.controller');

router.use(authMiddleware);

router.get('/', walletController.getMyWallet);

module.exports = router;
