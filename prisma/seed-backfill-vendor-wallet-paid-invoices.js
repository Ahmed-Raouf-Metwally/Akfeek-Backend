/**
 * Seed: إيداع رجعي — حصة الفيندور في محفظته لجميع الفواتير المدفوعة سابقاً
 * (الفواتير التي دُفعت قبل تفعيل منطق "إيداع الفيندور" في markInvoicePaid)
 * يشغّل: node prisma/seed-backfill-vendor-wallet-paid-invoices.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getDefaultCommissionPercent() {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: 'platform_commission' },
  });
  if (!setting) return 10;
  const v = setting.value;
  if (setting.type === 'NUMBER' || (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v))) {
    return parseFloat(v) || 10;
  }
  return 10;
}

async function main() {
  console.log('💰 إيداع رجعي: حصة الفيندور لمحفظته عن الفواتير المدفوعة سابقاً...\n');

  const defaultCommissionPercent = await getDefaultCommissionPercent();

  const paidInvoices = await prisma.invoice.findMany({
    where: { status: 'PAID' },
    include: {
      booking: {
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
      },
      payments: {
        where: { status: 'COMPLETED' },
        select: { id: true },
      },
    },
    orderBy: { paidAt: 'asc' },
  });

  // مجموعة الفواتير التي سبق إيداع رصيد الفيندور لها (من metadata.invoiceId في حركات EARNING)
  const earningTxns = await prisma.transaction.findMany({
    where: { type: 'EARNING' },
    select: { metadata: true },
  });
  const creditedInvoiceIds = new Set(
    earningTxns
      .filter((t) => t.metadata && typeof t.metadata === 'object' && t.metadata.invoiceId)
      .map((t) => t.metadata.invoiceId)
  );

  let processed = 0;
  let skipped = 0;
  let noVendor = 0;
  let alreadyCredited = 0;

  for (const invoice of paidInvoices) {
    if (creditedInvoiceIds.has(invoice.id)) {
      alreadyCredited++;
      continue;
    }

    const completedPaymentIds = (invoice.payments || []).map((p) => p.id);
    const booking = invoice.booking;
    if (!booking) {
      skipped++;
      continue;
    }

    let vendorUserId = null;
    let commissionPercent = defaultCommissionPercent;
    if (booking.workshop?.vendorId && booking.workshop.vendor) {
      vendorUserId = booking.workshop.vendor.userId;
      if (booking.workshop.vendor.commissionPercent != null) {
        commissionPercent = Number(booking.workshop.vendor.commissionPercent);
      }
    } else if (booking.services?.[0]?.service?.vendorId) {
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { id: booking.services[0].service.vendorId },
        select: { userId: true, commissionPercent: true },
      });
      if (vendorProfile) {
        vendorUserId = vendorProfile.userId;
        if (vendorProfile.commissionPercent != null) {
          commissionPercent = Number(vendorProfile.commissionPercent);
        }
      }
    }

    if (!vendorUserId) {
      noVendor++;
      continue;
    }

    const subtotal = Number(booking.subtotal) ?? Number(invoice.subtotal) ?? Number(invoice.totalAmount) ?? 0;
    if (subtotal <= 0) {
      skipped++;
      continue;
    }

    const platformCommission = Math.round(subtotal * (commissionPercent / 100) * 100) / 100;
    const vendorEarnings = Math.round((subtotal - platformCommission) * 100) / 100;
    if (vendorEarnings <= 0) {
      skipped++;
      continue;
    }

    const paymentId = completedPaymentIds.length > 0 ? completedPaymentIds[0] : null;

    await prisma.$transaction(async (tx) => {
      let vendorWallet = await tx.wallet.findUnique({ where: { userId: vendorUserId } });
      if (!vendorWallet) {
        vendorWallet = await tx.wallet.create({
          data: { userId: vendorUserId, availableBalance: 0, pendingBalance: 0 },
        });
      }
      const balanceBefore = Number(vendorWallet.availableBalance) || 0;
      const balanceAfter = Math.round((balanceBefore + vendorEarnings) * 100) / 100;
      const txnNumber = `TXN-V-BACKFILL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      await tx.transaction.create({
        data: {
          transactionNumber: txnNumber,
          walletId: vendorWallet.id,
          userId: vendorUserId,
          type: 'EARNING',
          amount: vendorEarnings,
          balanceBefore,
          balanceAfter,
          description: `إيراد رجعي من فاتورة ${invoice.invoiceNumber || invoice.id}`,
          status: 'COMPLETED',
          metadata: {
            paymentId,
            invoiceId: invoice.id,
            bookingId: invoice.bookingId,
            platformCommission,
            vendorEarnings,
            backfill: true,
          },
        },
      });
      await tx.wallet.update({
        where: { id: vendorWallet.id },
        data: { availableBalance: { increment: vendorEarnings } },
      });
    });

    processed++;
    console.log(`  ✅ ${invoice.invoiceNumber} → فيندور رصيد +${vendorEarnings} ر.س`);
  }

  console.log('\n---');
  console.log(`✅ تم إيداع رصيد الفيندور لـ ${processed} فاتورة.`);
  if (alreadyCredited > 0) console.log(`   (تخطي ${alreadyCredited} — مُودَع مسبقاً)`);
  if (noVendor > 0) console.log(`   (تخطي ${noVendor} — لا يوجد فيندور مرتبط بالحجز)`);
  if (skipped > 0) console.log(`   (تخطي ${skipped} — أخرى)`);
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
