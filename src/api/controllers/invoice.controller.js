const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');
const { getPlatformCommissionPercent } = require('../../utils/pricing');
const { emitInvoicePaid } = require('../../socket');

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

/**
 * Get invoices for current vendor (فواتير الفيندور فقط).
 * GET /api/invoices/vendor/mine — أو استدعاء من الفرونت عند كون المستخدم فيندور.
 * Returns only invoices where the booking belongs to this vendor (workshop, mobile workshop, service, or winch).
 */
async function getMyInvoicesAsVendor(req, res, next) {
  try {
    const vendorProfile = await prisma.vendorProfile.findFirst({
      where: { userId: req.user.id },
    });
    if (!vendorProfile) {
      throw new AppError('Vendor profile not found', 403, 'FORBIDDEN');
    }
    const vendorId = vendorProfile.id;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const status = req.query.status || null;
    const skip = (page - 1) * limit;

    const bookingWhere = {
      OR: [
        { workshop: { vendorId } },
        { mobileWorkshop: { vendorId } },
        { jobBroadcast: { offers: { some: { winch: { vendorId } } } } },
        {
          services: {
            some: {
              OR: [
                { service: { vendorId } },
                { workshopService: { workshop: { vendorId } } },
              ],
            },
          },
        },
      ],
    };
    const where = {
      ...(status ? { status } : {}),
      booking: bookingWhere,
    };

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
    const toNum = (v) => (v == null ? v : Number(v));
    const data = items.map((inv) => {
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
      pagination: { page, limit, total, totalPages },
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
      subtotal: true,
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
              commissionPercent: true,
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
                  commissionPercent: true,
                  user: { select: { id: true, email: true, phone: true } },
                },
              },
            },
          },
        },
      },
      // حجوزات السحب/الونش أو غسيل السيارة: الفيندور من الوينش أو الفني من العرض المختار
      jobBroadcast: {
        select: {
          id: true,
          offers: {
            where: { isSelected: true },
            take: 1,
            select: {
              winch: {
                select: {
                  id: true,
                  name: true,
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
                      commissionPercent: true,
                      user: { select: { id: true, email: true, phone: true } },
                    },
                  },
                },
              },
              technician: {
                select: {
                  id: true,
                  email: true,
                  phone: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      avatar: true,
                    },
                  },
                },
              },
              bidAmount: true,
            },
          },
        },
      },
      // حجوزات الورش المتنقلة: الفيندور من الورشة المتنقلة
      mobileWorkshop: {
        select: {
          id: true,
          name: true,
          nameAr: true,
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
              commissionPercent: true,
              user: { select: { id: true, email: true, phone: true } },
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
  // بيان الفيندور صاحب الفاتورة: الورشة المعتمدة أولاً، ثم خدمة، ونش، ورشة متنقلة (حتى لا يظهر "غسيل سيارات" لحجز ورشة معتمدة)
  const vendor =
    inv.booking?.workshop?.vendor ??
    inv.booking?.services?.[0]?.service?.vendor ??
    inv.booking?.jobBroadcast?.offers?.[0]?.winch?.vendor ??
    inv.booking?.mobileWorkshop?.vendor ??
    null;
  const vendorSource = inv.booking?.workshop?.vendor
    ? 'workshop'
    : inv.booking?.mobileWorkshop?.vendor
      ? 'mobileWorkshop'
      : inv.booking?.jobBroadcast?.offers?.[0]?.winch?.vendor
        ? 'winch'
        : inv.booking?.services?.[0]?.service?.vendor
          ? 'service'
          : null;

  // حجوزات غسيل السيارة: الفني (مقدم الخدمة) من العرض المختار — نعرضه كمعلومات البائع إن لم يكن هناك فيندور
  const selectedOffer = inv.booking?.jobBroadcast?.offers?.[0];
  const technician = selectedOffer?.technician ?? null;
  const technicianName = technician?.profile
    ? [technician.profile.firstName, technician.profile.lastName].filter(Boolean).join(' ') || '—'
    : '—';
  const technicianSummary = technician
    ? {
        id: technician.id,
        email: technician.email,
        phone: technician.phone,
        name: technicianName,
        nameAr: technicianName,
        avatar: technician.profile?.avatar ?? null,
        bidAmount: selectedOffer.bidAmount != null ? Number(selectedOffer.bidAmount) : null,
      }
    : null;

  // vendorSummary: من الفيندور إن وُجد، وإلا من الفني (غسيل) حتى تظهر "معلومات البائع" ولا تظهر "لم يتم ربط البائع"
  const vendorSummary = vendor
    ? {
        id: vendor.id,
        userId: vendor.userId,
        businessName: vendor.businessName,
        businessNameAr: vendor.businessNameAr,
        contactPhone: vendor.contactPhone,
        contactEmail: vendor.contactEmail,
        source: 'vendor',
        ...(vendor.user && { user: vendor.user }),
      }
    : technicianSummary
      ? {
          id: technician.id,
          userId: technician.id,
          businessName: technicianName,
          businessNameAr: technicianName,
          contactPhone: technician.phone ?? null,
          contactEmail: technician.email ?? null,
          source: 'technician',
        }
      : null;

  return {
    ...inv,
    vendor: vendor ?? undefined,
    vendorSource, // 'workshop' | 'mobileWorkshop' | 'winch' | 'service' — للتمييز في الواجهة (الورش المعتمدة ≠ خدمة غسيل)
    vendorSummary, // بيان البائع/الفيندور أو مقدم الخدمة (الفني في الغسيل)
    technician: technician ?? undefined,
    technicianSummary,
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
 * Get single invoice by id for current vendor (must own the booking).
 * GET /api/invoices/vendor/mine/:id
 */
async function getInvoiceByIdForVendor(req, res, next) {
  try {
    const vendorProfile = await prisma.vendorProfile.findFirst({
      where: { userId: req.user.id },
    });
    if (!vendorProfile) {
      throw new AppError('Vendor profile not found', 403, 'FORBIDDEN');
    }
    const vendorId = vendorProfile.id;
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

    const booking = invoice.booking;
    if (!booking) {
      throw new AppError('Invoice or booking not found', 404, 'NOT_FOUND');
    }
    const belongsToVendor =
      (booking.workshop && booking.workshop.vendorId === vendorId) ||
      (booking.mobileWorkshop && booking.mobileWorkshop.vendorId === vendorId) ||
      (booking.jobBroadcast && (booking.jobBroadcast.offers || []).some((o) => o.winch && o.winch.vendorId === vendorId)) ||
      (booking.services && booking.services.some((s) => s.service && s.service.vendorId === vendorId));
    if (!belongsToVendor) {
      throw new AppError('Not authorized to view this invoice', 403, 'FORBIDDEN');
    }
    res.json({ success: true, data: serializeInvoice(invoice) });
  } catch (error) {
    next(error);
  }
}

/**
 * Get my invoice (Customer) — العميل يجلب فاتورته بالمعرف أو بمعرف الحجز
 * GET /api/invoices/my/:id  — id = invoice id or booking id
 */
async function getMyInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
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
    if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    if (invoice.customerId !== userId) {
      throw new AppError('Not authorized to view this invoice', 403, 'FORBIDDEN');
    }
    res.json({ success: true, data: serializeInvoice(invoice) });
  } catch (error) {
    next(error);
  }
}

/** Resolve invoice by id (invoice id or booking id) */
async function resolveInvoice(id) {
  let invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: { select: { id: true } } },
  });
  if (!invoice) {
    invoice = await prisma.invoice.findFirst({
      where: { bookingId: id },
      include: { customer: { select: { id: true } } },
    });
  }
  return invoice;
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

    const invoice = await resolveInvoice(id);
    if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    if (invoice.status === 'PAID') {
      return res.json({ success: true, message: 'الفاتورة مدفوعة بالفعل', data: invoice });
    }

    const amount = Number(invoice.totalAmount) || 0;
    if (amount <= 0) throw new AppError('Invoice amount must be positive', 400, 'VALIDATION_ERROR');

    const performedById = req.user?.id ?? null;
    const defaultCommissionPercent = await getPlatformCommissionPercent();

    const result = await runPaymentTransaction(invoice, amount, method, performedById, defaultCommissionPercent);

    // بعد الدفع: إشعار الطرفين لفتح التتبع والشات (ورشة متنقلة / ونش / إلخ)
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: invoice.bookingId },
        select: { id: true, customerId: true, technicianId: true },
      });
      if (booking?.customerId && booking?.technicianId) {
        emitInvoicePaid(booking.id, {
          customerId: booking.customerId,
          technicianId: booking.technicianId,
        });
      }
    } catch (_) { /* socket not ready */ }

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

/** Shared payment transaction (used by Admin mark-paid and Customer pay) */
async function runPaymentTransaction(invoice, amount, method, performedById, defaultCommissionPercent) {
  return prisma.$transaction(async (tx) => {
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
            description: `دفع فاتورة ${invoice.invoiceNumber || invoice.id}`,
            status: 'COMPLETED',
            paymentId: payment.id,
            metadata: { paymentId: payment.id, invoiceId: invoice.id },
            performedById,
          },
        });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { availableBalance: { decrement: amount } },
        });

        // إشعار محفظة: خصم (Customer)
        try {
          await tx.notification.create({
            data: {
              userId: invoice.customerId,
              type: 'WALLET',
              title: 'Wallet payment',
              titleAr: 'دفع من المحفظة',
              message: `A payment of ${amount} SAR was deducted from your wallet.`,
              messageAr: `تم خصم مبلغ ${amount} ر.س من محفظتك.`,
              bookingId: invoice.bookingId,
              metadata: { invoiceId: invoice.id, paymentId: payment.id, method: 'WALLET', amount, txnType: 'WITHDRAWAL' },
            },
          });
        } catch (_) { /* non-blocking */ }
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
            description: `نقاط من دفع الفاتورة ${invoice.invoiceNumber || invoice.id}`,
            paymentId: payment.id,
            metadata: { paymentId: payment.id, invoiceId: invoice.id },
            performedById,
          },
        });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { pointsBalance: pointsAfter },
        });

        // إشعار نقاط: إضافة (Customer)
        try {
          await tx.notification.create({
            data: {
              userId: invoice.customerId,
              type: 'POINTS',
              title: 'Points earned',
              titleAr: 'تم إضافة نقاط',
              message: `You earned ${pointsToAward} points.`,
              messageAr: `تم إضافة ${pointsToAward} نقطة إلى رصيدك.`,
              bookingId: invoice.bookingId,
              metadata: { invoiceId: invoice.id, paymentId: payment.id, points: pointsToAward, balanceBefore: pointsBefore, balanceAfter: pointsAfter },
            },
          });
        } catch (_) { /* non-blocking */ }
      }

      // 5) إيداع حصة الفيندور في محفظته وخصم نسبة المنصة (نسبة مسجلة وقت الحجز أو الحالية من الفيندور)
      const booking = await tx.booking.findUnique({
        where: { id: invoice.bookingId },
        select: {
          bookingNumber: true,
          subtotal: true,
          platformCommissionPercent: true,
          workshop: {
            select: {
              vendorId: true,
              vendor: { select: { userId: true, commissionPercent: true } },
            },
          },
          services: {
            take: 1,
            select: { service: { select: { vendorId: true } } },
          },
          jobBroadcast: {
            select: {
              offers: {
                where: { isSelected: true },
                take: 1,
                select: {
                  winch: {
                    select: {
                      vendor: { select: { userId: true, commissionPercent: true } },
                    },
                  },
                },
              },
            },
          },
          mobileWorkshop: {
            select: {
              vendor: { select: { userId: true, commissionPercent: true } },
            },
          },
        },
      });

      let vendorUserId = null;
      let vendorCommissionPercent = null; // النسبة المسجلة عند الفيندور
      if (booking?.workshop?.vendorId && booking.workshop.vendor) {
        vendorUserId = booking.workshop.vendor.userId;
        vendorCommissionPercent = booking.workshop.vendor.commissionPercent != null
          ? Number(booking.workshop.vendor.commissionPercent)
          : null;
      } else if (booking?.services?.[0]?.service?.vendorId) {
        const vendorProfile = await tx.vendorProfile.findUnique({
          where: { id: booking.services[0].service.vendorId },
          select: { userId: true, commissionPercent: true },
        });
        if (vendorProfile) {
          vendorUserId = vendorProfile.userId;
          vendorCommissionPercent = vendorProfile.commissionPercent != null
            ? Number(vendorProfile.commissionPercent)
            : null;
        }
      } else if (booking?.jobBroadcast?.offers?.[0]?.winch?.vendor) {
        const winchVendor = booking.jobBroadcast.offers[0].winch.vendor;
        vendorUserId = winchVendor.userId;
        vendorCommissionPercent = winchVendor.commissionPercent != null
          ? Number(winchVendor.commissionPercent)
          : null;
      } else if (booking?.mobileWorkshop?.vendor) {
        const mwVendor = booking.mobileWorkshop.vendor;
        vendorUserId = mwVendor.userId;
        vendorCommissionPercent = mwVendor.commissionPercent != null
          ? Number(mwVendor.commissionPercent)
          : null;
      }
      // نسبة عمولة المنصة: المُسجلة وقت الحجز أولاً، ثم المسجلة عند الفيندور، ثم الإعداد العام (لتجنب تغيير الحجوزات القديمة)
      const commissionPercent = (booking?.platformCommissionPercent != null)
        ? Number(booking.platformCommissionPercent)
        : (vendorUserId && vendorCommissionPercent != null)
          ? vendorCommissionPercent
          : defaultCommissionPercent;

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
                commissionPercentUsed: commissionPercent,
                platformCommission,
                vendorEarnings,
              },
              performedById,
            },
          });
          await tx.wallet.update({
            where: { id: vendorWallet.id },
            data: { availableBalance: { increment: vendorEarnings } },
          });

          // إشعار محفظة: إضافة إيراد (Vendor)
          try {
            await tx.notification.create({
              data: {
                userId: vendorUserId,
                type: 'WALLET',
                title: 'Wallet credited',
                titleAr: 'تم إضافة رصيد للمحفظة',
                message: `You received ${vendorEarnings} SAR earnings.`,
                messageAr: `تم إضافة ${vendorEarnings} ر.س كإيراد إلى محفظتك.`,
                bookingId: invoice.bookingId,
                metadata: { invoiceId: invoice.id, paymentId: payment.id, vendorEarnings, platformCommission, commissionPercentUsed: commissionPercent },
              },
            });
          } catch (_) { /* non-blocking */ }
        }
      }

      // 6) إشعارات الدفع (للعميل + الفيندور إن وجد)
      try {
        const invNo = invoice.invoiceNumber || updatedInvoice.invoiceNumber || invoice.id;
        const bkgNo = booking?.bookingNumber || invoice.bookingId;

        await tx.notification.create({
          data: {
            userId: invoice.customerId,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment successful',
            titleAr: 'تم الدفع بنجاح',
            message: `Payment received for invoice ${invNo}.`,
            messageAr: `تم استلام الدفع للفاتورة ${invNo}.`,
            bookingId: invoice.bookingId,
            metadata: { invoiceId: invoice.id, invoiceNumber: invNo, bookingId: invoice.bookingId, bookingNumber: bkgNo, method, amount },
          },
        });

        if (vendorUserId) {
          await tx.notification.create({
            data: {
              userId: vendorUserId,
              type: 'PAYMENT_RECEIVED',
              title: 'Payment received',
              titleAr: 'تم استلام دفعة',
              message: `A customer paid for booking ${bkgNo}.`,
              messageAr: `تم دفع فاتورة للحجز ${bkgNo}.`,
              bookingId: invoice.bookingId,
              metadata: { invoiceId: invoice.id, invoiceNumber: invNo, bookingId: invoice.bookingId, bookingNumber: bkgNo, method, amount },
            },
          });
        }
      } catch (_) { /* non-blocking */ }

      return { payment, invoice: updatedInvoice };
  });
}

/**
 * Customer: pay my invoice (دفع الفاتورة — يفتح التتبع والشات بعد الدفع)
 * PATCH /api/invoices/my/:id/pay
 * Body: { method?: 'WALLET' | 'CARD' | 'MADA' | 'APPLE_PAY' }
 */
async function customerPayInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const method = (req.body?.method || 'WALLET').toUpperCase();
    const validMethods = ['WALLET', 'CARD', 'MADA', 'APPLE_PAY', 'BANK_TRANSFER'];
    if (!validMethods.includes(method)) {
      throw new AppError('Invalid payment method', 400, 'VALIDATION_ERROR');
    }

    const invoice = await resolveInvoice(id);
    if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    if (invoice.customerId !== req.user.id) {
      throw new AppError('Not authorized to pay this invoice', 403, 'FORBIDDEN');
    }
    if (invoice.status === 'PAID') {
      return res.json({ success: true, message: 'الفاتورة مدفوعة بالفعل', data: invoice });
    }

    const amount = Number(invoice.totalAmount) || 0;
    if (amount <= 0) throw new AppError('Invoice amount must be positive', 400, 'VALIDATION_ERROR');

    const defaultCommissionPercent = await getPlatformCommissionPercent();
    const result = await runPaymentTransaction(invoice, amount, method, req.user.id, defaultCommissionPercent);

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: invoice.bookingId },
        select: { id: true, customerId: true, technicianId: true },
      });
      if (booking?.customerId && booking?.technicianId) {
        emitInvoicePaid(booking.id, {
          customerId: booking.customerId,
          technicianId: booking.technicianId,
        });
      }
    } catch (_) { /* socket not ready */ }

    res.json({
      success: true,
      message: method === 'WALLET' ? 'تم الدفع من المحفظة؛ تم تفعيل التتبع والمحادثة' : 'تم الدفع؛ تم تفعيل التتبع والمحادثة',
      data: result.invoice,
      payment: result.payment,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllInvoices, getMyInvoicesAsVendor, getInvoiceById, getInvoiceByIdForVendor, getMyInvoice, markInvoicePaid, customerPayInvoice };
