const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const walletController = require('../controllers/wallet.controller');

router.use(authMiddleware);

/**
 * @swagger
 * /api/wallets:
 *   get:
 *     summary: Get my wallet (balance + recent context)
 *     tags: [Wallets]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Wallet data for authenticated user
 *       401:
 *         description: Unauthorized
 */
router.get('/', walletController.getMyWallet);

module.exports = router;
