const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const walletController = require('../controllers/wallet.controller');

router.use(authMiddleware);

/**
 * @swagger
 * /api/wallets:
 *   get:
 *     summary: Get my wallet details
 *     tags: [📱 Customer | Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet and transactions details
 */
router.get('/', walletController.getMyWallet);

module.exports = router;

