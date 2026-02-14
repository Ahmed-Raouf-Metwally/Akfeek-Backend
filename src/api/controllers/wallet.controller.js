const prisma = require('../../utils/database/prisma');

/**
 * Wallet Controller
 * User wallet and balance
 */
class WalletController {
  /**
   * Get current user's wallet
   * GET /api/wallets
   */
  async getMyWallet(req, res, next) {
    try {
      const userId = req.user.id;

      let wallet = await prisma.wallet.findUnique({
        where: { userId },
        select: {
          id: true,
          availableBalance: true,
          pendingBalance: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!wallet) {
        wallet = {
          id: null,
          availableBalance: 0,
          pendingBalance: 0,
          currency: 'SAR',
          createdAt: null,
          updatedAt: null,
        };
      }

      res.json({
        success: true,
        message: '',
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WalletController();
