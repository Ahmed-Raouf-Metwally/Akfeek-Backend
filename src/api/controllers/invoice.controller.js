const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Get all invoices (Admin). Paginated list with customer/booking summary.
 * GET /api/invoices
 */
async function getAllInvoices(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const status = req.query.status || null;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ issuedAt: 'desc' }],
        select: {
          id: true,
          invoiceNumber: true,
          customerId: true,
          bookingId: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
          issuedAt: true,
          dueDate: true,
          paidAt: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single invoice by id (Admin).
 * GET /api/invoices/:id
 */
async function getInvoiceById(req, res, next) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            scheduledDate: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: {
            walletTransaction: { select: { id: true, transactionNumber: true, amount: true, description: true, createdAt: true } },
            pointsTransaction: { select: { id: true, amount: true, description: true, balanceAfter: true, createdAt: true } },
          },
        },
      },
    });
    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    }
    res.json({ success: true, message: '', data: invoice });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark invoice as paid (Admin).
 * PATCH /api/invoices/:id/mark-paid
 * Body: { method?: 'CASH' | 'WALLET' | 'CARD' | 'BANK_TRANSFER' | 'MADA' | 'APPLE_PAY' }
 * - If method === 'WALLET': خصم من محفظة العميل + إنشاء Payment + Transaction (WITHDRAWAL) مع metadata
 * - دائماً: إنشاء Payment إن لم يكن من المحفظة، تحديث الفاتورة، منح النقاط (PointTransaction EARN) حسب POINTS_CONVERSION_RATE
 */
async function markInvoicePaid(req, res, next) {
  try {
    const { id } = req.params;
    const method = (req.body?.method || 'CASH').toUpperCase();
    const validMethods = ['CASH', 'WALLET', 'CARD', 'BANK_TRANSFER', 'MADA', 'APPLE_PAY'];
    if (!validMethods.includes(method)) {
      throw new AppError('Invalid payment method', 400, 'VALIDATION_ERROR');
    }

    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { customer: { select: { id: true } } } });
    if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    if (invoice.status === 'PAID') {
      return res.json({ success: true, message: 'الفاتورة مدفوعة بالفعل', data: invoice });
    }

    const amount = Number(invoice.totalAmount) || 0;
    if (amount <= 0) throw new AppError('Invoice amount must be positive', 400, 'VALIDATION_ERROR');

    const result = await prisma.$transaction(async (tx) => {
      // 1) إنشاء سجل الدفع دائماً
      const paymentNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount,
          method,
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });

      // 2) إذا الدفع من المحفظة: خصم من المحفظة + إنشاء Transaction
      if (method === 'WALLET') {
        let wallet = await tx.wallet.findUnique({ where: { userId: invoice.customerId } });
        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId: invoice.customerId, availableBalance: 0, pendingBalance: 0 },
          });
        }
        const balanceBefore = Number(wallet.availableBalance) || 0;
        if (balanceBefore < amount) {
          throw new AppError('Insufficient wallet balance', 400, 'INSUFFICIENT_BALANCE');
        }
        const balanceAfter = balanceBefore - amount;
        const txnNumber = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        await tx.transaction.create({
          data: {
            transactionNumber: txnNumber,
            walletId: wallet.id,
            userId: invoice.customerId,
            type: 'WITHDRAWAL',
            amount: -amount,
            balanceBefore,
            balanceAfter,
            description: `دفع فاتورة ${invoice.invoiceNumber || id}`,
            status: 'COMPLETED',
            paymentId: payment.id,
            metadata: { paymentId: payment.id, invoiceId: invoice.id },
            performedById: req.user?.id,
          },
        });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { availableBalance: { decrement: amount } },
        });
      }

      // 3) تحديث الفاتورة
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAmount: amount,
          paidAt: new Date(),
        },
      });

      // 4) منح النقاط عند إتمام الدفع (حسب POINTS_CONVERSION_RATE)
      const pointsSetting = await tx.systemSettings.findUnique({
        where: { key: 'POINTS_CONVERSION_RATE' },
      });
      let pointsConfig = { points: 100, currency: 1 };
      if (pointsSetting?.value) {
        try {
          pointsConfig = JSON.parse(pointsSetting.value);
        } catch (_) {}
      }
      const pointsToAward = Math.floor(amount * (Number(pointsConfig.points) || 100) / (Number(pointsConfig.currency) || 1));
      if (pointsToAward > 0) {
        let wallet = await tx.wallet.findUnique({ where: { userId: invoice.customerId } });
        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId: invoice.customerId, availableBalance: 0, pendingBalance: 0 },
          });
        }
        const pointsBefore = wallet.pointsBalance ?? 0;
        const pointsAfter = pointsBefore + pointsToAward;
        await tx.pointTransaction.create({
          data: {
            walletId: wallet.id,
            userId: invoice.customerId,
            type: 'EARN',
            amount: pointsToAward,
            balanceBefore: pointsBefore,
            balanceAfter: pointsAfter,
            description: `نقاط من دفع الفاتورة ${invoice.invoiceNumber || id}`,
            paymentId: payment.id,
            metadata: { paymentId: payment.id, invoiceId: invoice.id },
            performedById: req.user?.id,
          },
        });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { pointsBalance: pointsAfter },
        });
      }

      return { payment, invoice: updatedInvoice };
    });

    res.json({
      success: true,
      message: method === 'WALLET' ? 'تم الدفع من المحفظة وتسجيل المعاملة' : 'تم تحديد الفاتورة كمدفوعة',
      data: result.invoice,
      payment: result.payment,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllInvoices, getInvoiceById, markInvoicePaid };
