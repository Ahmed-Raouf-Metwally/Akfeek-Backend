const prisma = require('../../../utils/database/prisma');
const { emitNotification } = require('../../../socket');

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
                        status: 'COMPLETED',
                        performedById: req.user.id
                    }
                });

                // 3. Create Notification
                const notification = await prisma.notification.create({
                    data: {
                        userId,
                        type: 'WALLET',
                        title: 'Wallet Credit',
                        titleAr: 'إيداع في المحفظة',
                        message: `Your wallet has been credited with ${amount} SAR. Reason: ${reason || 'Admin Adjustment'}`,
                        messageAr: `تم إيداع ${amount} ريال في محفظتك. السبب: ${reason || 'تسوية إدارية'}`,
                        isRead: false
                    }
                });
                emitNotification(userId, notification);

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
                        status: 'COMPLETED',
                        performedById: req.user.id
                    }
                });

                // 3. Create Notification
                const notification = await prisma.notification.create({
                    data: {
                        userId,
                        type: 'WALLET',
                        title: 'Wallet Debit',
                        titleAr: 'خصم من المحفظة',
                        message: `Your wallet has been debited by ${amount} SAR. Reason: ${reason || 'Admin Adjustment'}`,
                        messageAr: `تم خصم ${amount} ريال من محفظتك. السبب: ${reason || 'تسوية إدارية'}`,
                        isRead: false
                    }
                });
                emitNotification(userId, notification);

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
                        },
                        performedBy: {
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
                        description: reason || 'Admin Points Adjustment',
                        performedById: req.user.id
                    }
                });

                // Create Notification
                const isCredit = Number(amount) > 0;
                const notification = await prisma.notification.create({
                    data: {
                        userId,
                        type: 'POINTS',
                        title: isCredit ? 'Points Earned' : 'Points Deducted',
                        titleAr: isCredit ? 'نقاط مكتسبة' : 'خصم نقاط',
                        message: `Your points balance has been adjusted by ${amount}. Reason: ${reason || 'Admin Adjustment'}`,
                        messageAr: `تم تعديل رصيد نقاطك بمقدار ${amount}. السبب: ${reason || 'تسوية إدارية'}`,
                        isRead: false
                    }
                });
                emitNotification(userId, notification);

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
                    include: {
                        performedBy: {
                            select: {
                                id: true,
                                email: true,
                                profile: {
                                    select: { firstName: true, lastName: true }
                                }
                            }
                        }
                    },
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

    /**
     * Get refunds list (transactions with type REFUND)
     * GET /api/admin/finance/refunds?page=&limit=&status=
     */
    async getRefunds(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
            const status = req.query.status || null;
            const skip = (page - 1) * limit;

            const where = { type: 'REFUND' };
            if (status) where.status = status;

            const [transactions, total] = await Promise.all([
                prisma.transaction.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                phone: true,
                                profile: { select: { firstName: true, lastName: true } },
                            },
                        },
                        wallet: { select: { id: true, userId: true } },
                        performedBy: {
                            select: {
                                id: true,
                                email: true,
                                profile: { select: { firstName: true, lastName: true } },
                            },
                        },
                    },
                }),
                prisma.transaction.count({ where }),
            ]);

            const data = transactions.map((t) => ({
                id: t.id,
                transactionNumber: t.transactionNumber,
                userId: t.userId,
                user: t.user,
                amount: Number(t.amount),
                balanceBefore: Number(t.balanceBefore),
                balanceAfter: Number(t.balanceAfter),
                description: t.description,
                status: t.status,
                metadata: t.metadata,
                performedBy: t.performedBy,
                createdAt: t.createdAt,
            }));

            res.json({
                success: true,
                data: {
                    list: data,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit) || 1,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get points configuration
     * GET /api/admin/finance/points/settings
     */
    async getPointsSettings(req, res, next) {
        try {
            const setting = await prisma.systemSettings.findUnique({
                where: { key: 'POINTS_CONVERSION_RATE' }
            });

            let config = { points: 100, currency: 1 }; // Default
            if (setting && setting.value) {
                try {
                    config = JSON.parse(setting.value);
                } catch (e) {
                    // ignore
                }
            }

            res.json({
                success: true,
                data: config
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update points configuration
     * POST /api/admin/finance/points/settings
     */
    async updatePointsSettings(req, res, next) {
        try {
            const { points, currency } = req.body;

            if (!points || !currency || points <= 0 || currency <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid input. Points and Currency must be positive numbers.'
                });
            }

            const value = JSON.stringify({ points: Number(points), currency: Number(currency) });

            const setting = await prisma.systemSettings.upsert({
                where: { key: 'POINTS_CONVERSION_RATE' },
                update: { value },
                create: {
                    key: 'POINTS_CONVERSION_RATE',
                    value,
                    type: 'JSON',
                    description: 'Points to Currency conversion rate',
                    category: 'PRICING'
                }
            });

            res.json({
                success: true,
                message: 'Points configuration updated',
                data: JSON.parse(setting.value)
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdminFinanceController();

/**
 * GET /api/admin/finance/commission-report
 * تقرير عمولة الموقع + ضريبة القيمة المضافة على العمولة
 * Query: from (YYYY-MM-DD), to (YYYY-MM-DD), page, limit
 *
 * المنطق:
 *   - الحجوزات المكتملة (COMPLETED | DELIVERED | READY_FOR_DELIVERY) في نطاق التاريخ
 *   - طلبات المتجر المكتملة أو المُوصّلة (DELIVERED | SHIPPED) والمدفوعة (PAID) في نطاق التاريخ
 *   - عمولة الموقع = قيمة × commissionPercent / 100
 *   - ضريبة على العمولة = عمولة الموقع × vatRate / 100
 */
async function getCommissionReport(req, res, next) {
  try {
    const prisma = require('../../../utils/database/prisma');
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const fromRaw = req.query.from;
    const toRaw   = req.query.to;
    const fromDate = fromRaw ? new Date(fromRaw + 'T00:00:00.000Z') : null;
    const toDate   = toRaw   ? new Date(toRaw   + 'T23:59:59.999Z') : null;

    const vatSetting = await prisma.systemSettings.findUnique({ where: { key: 'VAT_RATE' } }).catch(() => null);
    let defaultVatRate = vatSetting?.value != null ? parseFloat(vatSetting.value) : 15;
    if (defaultVatRate > 0 && defaultVatRate <= 1) defaultVatRate = defaultVatRate * 100;
    // نسبة العمولة تُحدَّد لكل فيندور (VendorProfile.commissionPercent) وليس من إعداد عام

    const dateFilter = {};
    if (fromDate) dateFilter.gte = fromDate;
    if (toDate)   dateFilter.lte = toDate;

    // 1) الحجوزات المكتملة
    const bookingWhere = {
      status: { in: ['COMPLETED', 'DELIVERED', 'READY_FOR_DELIVERY'] },
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    };
    const [bookings, totalBookings] = await Promise.all([
      prisma.booking.findMany({
        where: bookingWhere,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          platformCommissionPercent: true,
          subtotal: true,
          laborFee: true,
          deliveryFee: true,
          partsTotal: true,
          discount: true,
          totalPrice: true,
          createdAt: true,
          metadata: true,
          customer: {
            select: {
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          workshop: {
            select: {
              vendor: { select: { commissionPercent: true } },
            },
          },
          jobBroadcast: {
            select: {
              offers: {
                where: { isSelected: true },
                take: 1,
                select: {
                  winch: { select: { vendor: { select: { commissionPercent: true } } } },
                },
              },
            },
          },
          invoice: {
            select: { id: true, invoiceNumber: true, status: true, totalAmount: true, paidAmount: true },
          },
        },
      }),
      prisma.booking.count({ where: bookingWhere }),
    ]);

    // 2) طلبات المتجر المكتملة أو المُوصّلة والمدفوعة (للدقة)
    const orderWhere = {
      status: { in: ['DELIVERED', 'SHIPPED'] },
      paymentStatus: 'PAID',
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    };
    const [marketplaceOrders, totalMarketplaceOrders] = await Promise.all([
      prisma.marketplaceOrder.findMany({
        where: orderWhere,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customer: {
            select: {
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          items: {
            select: {
              totalPrice: true,
              vendor: { select: { commissionPercent: true } },
            },
          },
        },
      }),
      prisma.marketplaceOrder.count({ where: orderWhere }),
    ]);

    let totalRevenue    = 0;
    let totalCommission = 0;
    let totalVat        = 0;

    const bookingRows = bookings.map((b) => {
      const price =
        Number(b.subtotal ?? 0) +
        Number(b.laborFee ?? 0) +
        Number(b.deliveryFee ?? 0) +
        Number(b.partsTotal ?? 0) -
        Number(b.discount ?? 0);
      // نسبة العمولة: المُسجلة وقت الحجز أولاً، وإلا من الفيندور (ورشة أو ونش) — حتى لا تتأثر الحجوزات القديمة
      const commP = b.platformCommissionPercent != null
        ? Number(b.platformCommissionPercent)
        : (() => {
            const vendorPct = b.workshop?.vendor?.commissionPercent ?? b.jobBroadcast?.offers?.[0]?.winch?.vendor?.commissionPercent;
            return vendorPct != null ? Number(vendorPct) : 0;
          })();
      const commission = price * commP / 100;
      const vat        = commission * defaultVatRate / 100;
      totalRevenue    += price;
      totalCommission += commission;
      totalVat        += vat;
      return {
        id:            b.id,
        source:        'booking',
        bookingNumber: b.bookingNumber,
        status:        b.status,
        totalPrice:    price,
        commissionPercent: commP,
        commission,
        vatRate:       defaultVatRate,
        vat,
        netAfterVat:   commission - vat,
        createdAt:     b.createdAt,
        customer: b.customer?.profile
          ? [b.customer.profile.firstName, b.customer.profile.lastName].filter(Boolean).join(' ')
          : b.customer?.email ?? '—',
        invoice: b.invoice ?? null,
      };
    });

    const orderRows = marketplaceOrders.map((o) => {
      const price = Number(o.totalAmount ?? 0);
      // عمولة طلب المتجر = مجموع (عمولة كل صنف حسب فيندوره)
      let commission = 0;
      const items = o.items || [];
      for (const it of items) {
        const itemTotal = Number(it.totalPrice ?? 0);
        const vendorPct = it.vendor?.commissionPercent != null ? Number(it.vendor.commissionPercent) : 0;
        commission += itemTotal * vendorPct / 100;
      }
      const effectivePct = price > 0 ? (commission / price) * 100 : 0;
      const vat = commission * defaultVatRate / 100;
      totalRevenue    += price;
      totalCommission += commission;
      totalVat        += vat;
      return {
        id:            o.id,
        source:        'marketplace',
        orderNumber:   o.orderNumber,
        status:        o.status,
        totalPrice:    price,
        commissionPercent: items.length ? effectivePct : null,
        commission,
        vatRate:       defaultVatRate,
        vat,
        netAfterVat:   commission - vat,
        createdAt:     o.createdAt,
        customer: o.customer?.profile
          ? [o.customer.profile.firstName, o.customer.profile.lastName].filter(Boolean).join(' ')
          : o.customer?.email ?? '—',
      };
    });

    // دمج وترتيب حسب التاريخ ثم تطبيق الصفحة
    const rows = [...bookingRows, ...orderRows]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);
    const total = totalBookings + totalMarketplaceOrders;

    res.json({
      success: true,
      data: {
        rows,
        summary: {
          totalBookings:           totalBookings,
          totalMarketplaceOrders:  totalMarketplaceOrders,
          totalRevenue:            Math.round(totalRevenue    * 100) / 100,
          totalCommission:         Math.round(totalCommission * 100) / 100,
          totalVat:                Math.round(totalVat        * 100) / 100,
          totalNetCommission:      Math.round((totalCommission - totalVat) * 100) / 100,
          vatRate: defaultVatRate,
          periodFrom: fromRaw ?? null,
          periodTo:   toRaw   ?? null,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// attach to class instance before export
const controller = module.exports;
controller.getCommissionReport = getCommissionReport;
