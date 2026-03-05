const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');
const { getPlatformCommissionPercent } = require('../../utils/pricing');

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
          lineItems: { select: { totalPrice: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const data = items.map((inv) => {
      const toNum = (v) => (v == null ? v : Number(v));
      const lineItemsTotal = (inv.lineItems || []).reduce((s, li) => s + toNum(li.totalPrice), 0);
      return {
        ...inv,
        totalAmount: toNum(inv.totalAmount),
        paidAmount: toNum(inv.paidAmount),
        lineItems: (inv.lineItems || []).map((li) => ({ totalPrice: toNum(li.totalPrice) })),
        effectiveTotal: inv.lineItems?.length ? lineItemsTotal : toNum(inv.totalAmount),
      };
    });

    res.json({
      success: true,
      data,
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

const invoiceInclude = {
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
      workshop: {
        select: {
          id: true,
          vendorId: true,
          vendor: {
            select: {
              id: true,
              userId: true,
              businessName: true,
              businessNameAr: true,
              taxNumber: true,
              commercialLicense: true,
              contactPhone: true,
              contactEmail: true,
              address: true,
              city: true,
              country: true,
              user: { select: { id: true, email: true, phone: true } },
            },
          },
        },
      },
      services: {
        take: 1,
        select: {
          service: {
            select: {
              vendorId: true,
              vendor: {
                select: {
                  id: true,
                  userId: true,
                  businessName: true,
                  businessNameAr: true,
                  taxNumber: true,
                  commercialLicense: true,
                  contactPhone: true,
                  contactEmail: true,
                  address: true,
                  city: true,
                  country: true,
                  user: { select: { id: true, email: true, phone: true } },
                },
              },
            },
          },
        },
      },
    },
  },
  lineItems: {
    orderBy: { createdAt: 'asc' },
  },
  payments: {
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      paymentNumber: true,
      amount: true,
      method: true,
      status: true,
      processedAt: true,
      createdAt: true,
    },
  },
};

/** Convert Prisma Decimal to number for JSON response (avoids 500 on serialization) */
function serializeInvoice(inv) {
  if (!inv) return inv;
  const toNum = (v) => (v == null ? v : (typeof v === 'number' ? v : Number(v)));
  const vendor = inv.booking?.workshop?.vendor ?? inv.booking?.services?.[0]?.service?.vendor ?? null;
  return {
    ...inv,
    vendor,
    subtotal: toNum(inv.subtotal),
    tax: toNum(inv.tax),
    discount: toNum(inv.discount),
    totalAmount: toNum(inv.totalAmount),
    paidAmount: toNum(inv.paidAmount),
    lineItems: (inv.lineItems || []).map((li) => ({
      ...li,
      unitPrice: toNum(li.unitPrice),
      totalPrice: toNum(li.totalPrice),
    })),
    payments: (inv.payments || []).map((p) => ({
      ...p,
      amount: toNum(p.amount),
    })),
  };
}

/**
 * Get single invoice by id or by bookingId (Admin).
 * GET /api/invoices/:id  — id can be invoice id or booking id (one invoice per booking).
 */
async function getInvoiceById(req, res, next) {
  try {
    const { id } = req.params;
    let invoice = await prisma.invoice.findUnique({
      where: { id },
      include: invoiceInclude,
    });
    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: { bookingId: id },
        include: invoiceInclude,
      });
    }
    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    }
    res.json({ success: true, message: '', data: serializeInvoice(invoice) });
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

    let invoice = await prisma.invoice.findUnique({ where: { id }, include: { customer: { select: { id: true } } } });
    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: { bookingId: id },
        include: { customer: { select: { id: true } } },
      });
    }
    if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    if (invoice.status === 'PAID') {
      return res.json({ success: true, message: 'الفاتورة مدفوعة بالفعل', data: invoice });
    }

    const amount = Number(invoice.totalAmount) || 0;
    if (amount <= 0) throw new AppError('Invoice amount must be positive', 400, 'VALIDATION_ERROR');

    const defaultCommissionPercent = await getPlatformCommissionPercent();

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

      // 3) تحديث الفاتورة (استخدم invoice.id لأن الـ id في الرابط قد يكون bookingId)
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
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

      // 5) إيداع حصة الفيندور في محفظته (من الحجز المرتبط بالفاتورة)
      const booking = await tx.booking.findUnique({
        where: { id: invoice.bookingId },
        include: {
          workshop: {
            select: {
              vendorId: true,
              vendor: { select: { userId: true, commissionPercent: true } },
            },
          },
          services: {
            take: 1,
            include: { service: { select: { vendorId: true } } },
          },
        },
      });

      let vendorUserId = null;
      // نسبة العمولة: من الحجز إن وُجدت (حتى لا تتأثر الحجوزات القديمة بتغيير النسبة لاحقاً)، وإلا من الفيندور أو الافتراضية
      let commissionPercent =
        booking?.platformCommissionPercent != null
          ? Number(booking.platformCommissionPercent)
          : defaultCommissionPercent;
      if (booking?.workshop?.vendorId && booking.workshop.vendor) {
        vendorUserId = booking.workshop.vendor.userId;
        if (booking?.platformCommissionPercent == null && booking.workshop.vendor.commissionPercent != null) {
          commissionPercent = Number(booking.workshop.vendor.commissionPercent);
        }
      } else if (booking?.services?.[0]?.service?.vendorId) {
        const vendorProfile = await tx.vendorProfile.findUnique({
          where: { id: booking.services[0].service.vendorId },
          select: { userId: true, commissionPercent: true },
        });
        if (vendorProfile) {
          vendorUserId = vendorProfile.userId;
          if (booking?.platformCommissionPercent == null && vendorProfile.commissionPercent != null) {
            commissionPercent = Number(vendorProfile.commissionPercent);
          }
        }
      }

      if (vendorUserId) {
        const subtotal = Number(booking?.subtotal) ?? Number(invoice.subtotal) ?? amount;
        const platformCommission = Math.round(subtotal * (commissionPercent / 100) * 100) / 100;
        const vendorEarnings = Math.round((subtotal - platformCommission) * 100) / 100;
        if (vendorEarnings > 0) {
          let vendorWallet = await tx.wallet.findUnique({ where: { userId: vendorUserId } });
          if (!vendorWallet) {
            vendorWallet = await tx.wallet.create({
              data: { userId: vendorUserId, availableBalance: 0, pendingBalance: 0 },
            });
          }
          const balanceBefore = Number(vendorWallet.availableBalance) || 0;
          const balanceAfter = Math.round((balanceBefore + vendorEarnings) * 100) / 100;
          const txnNumber = `TXN-V-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          await tx.transaction.create({
            data: {
              transactionNumber: txnNumber,
              walletId: vendorWallet.id,
              userId: vendorUserId,
              type: 'EARNING',
              amount: vendorEarnings,
              balanceBefore,
              balanceAfter,
              description: `إيراد من فاتورة ${invoice.invoiceNumber || invoice.id}`,
              status: 'COMPLETED',
              paymentId: payment.id,
              metadata: {
                paymentId: payment.id,
                invoiceId: invoice.id,
                bookingId: invoice.bookingId,
                platformCommission,
                vendorEarnings,
              },
              performedById: req.user?.id,
            },
          });
          await tx.wallet.update({
            where: { id: vendorWallet.id },
            data: { availableBalance: { increment: vendorEarnings } },
          });
        }
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
