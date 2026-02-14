const prisma = require('../../../utils/database/prisma');

class AdminFinanceController {

    /**
     * Get all wallets with pagination and search
     * GET /api/admin/finance/wallets
     */
    async getAllWallets(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const skip = (page - 1) * limit;

            const where = {};

            if (search) {
                where.user = {
                    OR: [
                        { email: { contains: search } },
                        { phone: { contains: search } },
                        {
                            profile: {
                                OR: [
                                    { firstName: { contains: search } },
                                    { lastName: { contains: search } }
                                ]
                            }
                        }
                    ]
                };
            }

            // Get wallets with user details
            const [wallets, total] = await Promise.all([
                prisma.wallet.findMany({
                    where,
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                role: true,
                                phone: true,
                                profile: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        avatar: true
                                    }
                                }
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.wallet.count({ where })
            ]);

            res.json({
                success: true,
                data: {
                    wallets,
                    total,
                    pages: Math.ceil(total / limit),
                    page,
                    limit
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Credit user wallet
     * POST /api/admin/finance/wallet/credit
     */
    async creditWallet(req, res, next) {
        try {
            const { userId, amount, reason } = req.body;

            if (!userId || !amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid input. User ID and positive amount are required.'
                });
            }

            // Use transaction to ensure data integrity
            const result = await prisma.$transaction(async (prisma) => {
                // 1. Get or create wallet
                let wallet = await prisma.wallet.findUnique({ where: { userId } });
                if (!wallet) {
                    wallet = await prisma.wallet.create({
                        data: { userId, availableBalance: 0, pendingBalance: 0 }
                    });
                }

                // 2. Create transaction record
                const transaction = await prisma.transaction.create({
                    data: {
                        transactionNumber: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        walletId: wallet.id,
                        userId,
                        type: 'ADJUSTMENT', // Using ADJUSTMENT for admin credits
                        amount: amount,
                        balanceBefore: wallet.availableBalance,
                        balanceAfter: Number(wallet.availableBalance) + Number(amount),
                        description: reason || 'Admin Credit Adjustment',
                        status: 'COMPLETED'
                    }
                });

                // 3. Update wallet balance
                const updatedWallet = await prisma.wallet.update({
                    where: { id: wallet.id },
                    data: {
                        availableBalance: { increment: amount }
                    }
                });

                return { transaction, wallet: updatedWallet };
            });

            res.json({
                success: true,
                message: 'Wallet credited successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Debit user wallet
     * POST /api/admin/finance/wallet/debit
     */
    async debitWallet(req, res, next) {
        try {
            const { userId, amount, reason } = req.body;

            if (!userId || !amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid input. User ID and positive amount are required.'
                });
            }

            // Use transaction
            const result = await prisma.$transaction(async (prisma) => {
                // 1. Get wallet
                const wallet = await prisma.wallet.findUnique({ where: { userId } });

                if (!wallet) {
                    throw new Error('Wallet not found for this user');
                }

                if (Number(wallet.availableBalance) < amount) {
                    throw new Error('Insufficient funds');
                }

                // 2. Create transaction record
                const transaction = await prisma.transaction.create({
                    data: {
                        transactionNumber: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        walletId: wallet.id,
                        userId,
                        type: 'ADJUSTMENT', // Using ADJUSTMENT for admin debits too, or could be WITHDRAWAL
                        amount: -amount, // Negative for debit? Or keep positive and use type? Usually Transaction amount is stored signed or type implies direction. 
                        // Based on schema, amount is Decimal. Let's store negative for debit if it's a unified ledger, or positive if type implies.
                        // Let's assume signed amount for balance calculation simplicity, but strict accounting often uses positive + DR/CR.
                        // Given `balanceAfter = balanceBefore + amount`, debit amount should be negative here.
                        balanceBefore: wallet.availableBalance,
                        balanceAfter: Number(wallet.availableBalance) - Number(amount),
                        description: reason || 'Admin Debit Adjustment',
                        status: 'COMPLETED'
                    }
                });

                // 3. Update wallet balance
                const updatedWallet = await prisma.wallet.update({
                    where: { id: wallet.id },
                    data: {
                        availableBalance: { decrement: amount }
                    }
                });

                return { transaction, wallet: updatedWallet };
            });

            res.json({
                success: true,
                message: 'Wallet debited successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get points audit log
     * GET /api/admin/finance/points/audit
     */
    async getPointsAudit(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const userId = req.query.userId;
            const skip = (page - 1) * limit;

            const where = {};
            if (userId) {
                where.userId = userId;
            }

            const [auditLogs, total] = await Promise.all([
                prisma.pointTransaction.findMany({
                    where,
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                profile: {
                                    select: { firstName: true, lastName: true }
                                }
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.pointTransaction.count({ where })
            ]);

            res.json({
                success: true,
                data: auditLogs,
                pagination: {
                    total,
                    totalPages: Math.ceil(total / limit),
                    page,
                    limit
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Adjust points (Credit/Debit)
     * POST /api/admin/finance/points/adjust
     */
    async adjustPoints(req, res, next) {
        try {
            const { userId, amount, reason } = req.body;
            // Amount can be positive (add) or negative (subtract)

            if (!userId || !amount || amount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid input. User ID and non-zero amount are required.'
                });
            }

            const result = await prisma.$transaction(async (prisma) => {
                let wallet = await prisma.wallet.findUnique({ where: { userId } });
                if (!wallet) {
                    wallet = await prisma.wallet.create({
                        data: { userId, availableBalance: 0, pointsBalance: 0 }
                    });
                }

                const newBalance = (wallet.pointsBalance || 0) + Number(amount);

                if (newBalance < 0) {
                    throw new Error('Insufficient points balance for this operation');
                }

                const pointTransaction = await prisma.pointTransaction.create({
                    data: {
                        walletId: wallet.id,
                        userId,
                        type: 'ADJUSTMENT',
                        amount: Number(amount),
                        balanceBefore: wallet.pointsBalance || 0,
                        balanceAfter: newBalance,
                        description: reason || 'Admin Points Adjustment'
                    }
                });

                const updatedWallet = await prisma.wallet.update({
                    where: { id: wallet.id },
                    data: {
                        pointsBalance: newBalance
                    }
                });

                return { pointTransaction, wallet: updatedWallet };
            });

            res.json({
                success: true,
                message: 'Points adjusted successfully',
                data: result
            });

        } catch (error) {
            next(error);
        }
    }
    /**
     * Get wallet transactions
     * GET /api/admin/finance/wallet/:walletId/transactions
     */
    async getWalletTransactions(req, res, next) {
        try {
            const { walletId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const [transactions, total] = await Promise.all([
                prisma.transaction.findMany({
                    where: { walletId },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit
                }),
                prisma.transaction.count({ where: { walletId } })
            ]);

            res.json({
                success: true,
                data: {
                    transactions,
                    total,
                    pages: Math.ceil(total / limit),
                    page,
                    limit
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdminFinanceController();
