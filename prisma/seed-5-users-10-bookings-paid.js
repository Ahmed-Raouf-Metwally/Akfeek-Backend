/**
 * Seed: 5 مستخدمين (عملاء)، كل واحد له 10 حجوزات خدمة مكتملة + فاتورة مدفوعة + دفعة
 * يشغّل: node prisma/seed-5-users-10-bookings-paid.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const CUSTOMERS = [
  { email: 'customer-pay1@akfeek.com', phone: '+966501111001', firstName: 'خالد', lastName: 'المطيري' },
  { email: 'customer-pay2@akfeek.com', phone: '+966501111002', firstName: 'نورة', lastName: 'الغامدي' },
  { email: 'customer-pay3@akfeek.com', phone: '+966501111003', firstName: 'عبدالله', lastName: 'الشهري' },
  { email: 'customer-pay4@akfeek.com', phone: '+966501111004', firstName: 'لمى', lastName: 'العتيبي' },
  { email: 'customer-pay5@akfeek.com', phone: '+966501111005', firstName: 'فيصل', lastName: 'الروقي' },
];

const BOOKINGS_PER_USER = 10;
const PAYMENT_METHODS = ['CARD', 'MADA', 'CASH', 'WALLET', 'BANK_TRANSFER'];

function nextBookingNumber(seq) {
  return `BKG-5U-${String(seq).padStart(5, '0')}`;
}

function nextInvoiceNumber(seq) {
  return `INV-5U-${String(seq).padStart(5, '0')}`;
}

function nextPaymentNumber(seq) {
  return `PAY-5U-${String(seq).padStart(5, '0')}`;
}

async function main() {
  console.log('👥 إضافة 5 مستخدمين، كل واحد 10 حجوزات خدمة مدفوعة...\n');

  const hash = await bcrypt.hash('Customer123!', 10);

  // ── 1) مركبة: أول موديل متوفر
  const vehicleModel = await prisma.vehicleModel.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!vehicleModel) {
    console.log('⚠️  لا يوجد موديل مركبة. شغّل الـ seed الرئيسي أولاً (npm run prisma:seed).');
    return;
  }

  // ── 2) خدمات من الكتالوج (لربطها بالحجوزات)
  const services = await prisma.service.findMany({
    where: { isActive: true },
    take: 20,
    orderBy: { createdAt: 'asc' },
  });
  if (services.length === 0) {
    console.log('⚠️  لا توجد خدمات نشطة. شغّل seed الخدمات (مثلاً seed العناية الشاملة أو الورش).');
    return;
  }

  // ── 2b) ورشة معتمدة مرتبطة بفيندور (لعرض مقدم الخدمة/الفيندور في الحجوزات)
  const workshop = await prisma.certifiedWorkshop.findFirst({
    where: { vendorId: { not: null }, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!workshop) {
    console.log('⚠️  لا توجد ورشة معتمدة مرتبطة بفيندور. شغّل seed الورش/الفيندورات أولاً.');
  }

  const createdUsers = [];
  let bookingSeq = 1;
  let invoiceSeq = 1;
  let paymentSeq = 1;

  for (let u = 0; u < CUSTOMERS.length; u++) {
    const cust = CUSTOMERS[u];

    // upsert: إما بالـ email أو بالـ phone لأن الاثنين unique
    let user = await prisma.user.findFirst({
      where: { OR: [{ email: cust.email }, { phone: cust.phone }] },
      include: { profile: true },
    });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: cust.email,
          phone: cust.phone,
          passwordHash: hash,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          emailVerified: true,
          phoneVerified: true,
          ...(user.profile
            ? { profile: { update: { firstName: cust.firstName, lastName: cust.lastName } } }
            : { profile: { create: { firstName: cust.firstName, lastName: cust.lastName } } }),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: cust.email,
          phone: cust.phone,
          passwordHash: hash,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          emailVerified: true,
          phoneVerified: true,
          profile: {
            create: {
              firstName: cust.firstName,
              lastName: cust.lastName,
            },
          },
        },
      });
    }
    createdUsers.push(user);
    console.log(`  ✅ مستخدم: ${cust.email} (${cust.firstName} ${cust.lastName})`);

    // مركبة واحدة لكل عميل
    let vehicle = await prisma.userVehicle.findFirst({
      where: { userId: user.id },
    });
    if (!vehicle) {
      const plateNum = `5U-${String(u + 1).padStart(2, '0')}-${1000 + u}`;
      vehicle = await prisma.userVehicle.create({
        data: {
          userId: user.id,
          vehicleModelId: vehicleModel.id,
          plateDigits: String(1000 + u),
          plateLettersEn: 'ABC',
          plateLettersAr: 'أ ب ج',
          isDefault: true,
        },
      });
    }

    for (let b = 0; b < BOOKINGS_PER_USER; b++) {
      const service = services[(u * BOOKINGS_PER_USER + b) % services.length];
      const unitPrice = 80 + (u + 1) * 10 + (b % 5) * 15;
      const subtotal = unitPrice;
      const tax = Math.round(subtotal * 0.15 * 100) / 100;
      const totalPrice = Math.round((subtotal + tax) * 100) / 100;

      let bookingNumber = nextBookingNumber(bookingSeq);
      while (await prisma.booking.findUnique({ where: { bookingNumber } })) {
        bookingSeq++;
        bookingNumber = nextBookingNumber(bookingSeq);
      }
      bookingSeq++;

      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() - (u * BOOKINGS_PER_USER + b));

      const booking = await prisma.booking.create({
        data: {
          bookingNumber,
          customerId: user.id,
          vehicleId: vehicle.id,
          workshopId: workshop?.id ?? null,
          scheduledDate,
          scheduledTime: b % 2 === 0 ? '10:00' : '14:00',
          status: 'COMPLETED',
          completedAt: new Date(scheduledDate.getTime() + 3600000),
          subtotal,
          laborFee: 0,
          deliveryFee: 0,
          partsTotal: 0,
          discount: 0,
          tax,
          totalPrice,
          services: {
            create: {
              serviceId: service.id,
              quantity: 1,
              unitPrice,
              totalPrice: unitPrice,
              estimatedMinutes: service.estimatedDuration || 60,
            },
        },
      },
    });

      await prisma.bookingStatusHistory.createMany({
        data: [
          { bookingId: booking.id, fromStatus: null, toStatus: 'PENDING', changedBy: user.id, reason: 'تم إنشاء الحجز', timestamp: booking.createdAt },
          { bookingId: booking.id, fromStatus: 'PENDING', toStatus: 'CONFIRMED', changedBy: user.id, reason: 'تم التأكيد', timestamp: new Date(booking.createdAt.getTime() + 60000) },
          { bookingId: booking.id, fromStatus: 'CONFIRMED', toStatus: 'COMPLETED', changedBy: user.id, reason: 'تم إنجاز الخدمة والدفع', timestamp: booking.completedAt },
        ],
      });

      let invoiceNumber = nextInvoiceNumber(invoiceSeq);
      while (await prisma.invoice.findUnique({ where: { invoiceNumber } })) {
        invoiceSeq++;
        invoiceNumber = nextInvoiceNumber(invoiceSeq);
      }
      invoiceSeq++;

      const dueDate = new Date(scheduledDate);
      dueDate.setDate(dueDate.getDate() + 14);

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          bookingId: booking.id,
          customerId: user.id,
          subtotal,
          tax,
          discount: 0,
          totalAmount: totalPrice,
          paidAmount: totalPrice,
          status: 'PAID',
          issuedAt: booking.createdAt,
          dueDate,
          paidAt: new Date(),
        },
      });

      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: service.name,
          descriptionAr: service.nameAr || service.name,
          itemType: 'SERVICE',
          quantity: 1,
          unitPrice,
          totalPrice: unitPrice,
        },
      });

      let paymentNumber = nextPaymentNumber(paymentSeq);
      while (await prisma.payment.findUnique({ where: { paymentNumber } })) {
        paymentSeq++;
        paymentNumber = nextPaymentNumber(paymentSeq);
      }
      paymentSeq++;

      await prisma.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          customerId: user.id,
          amount: totalPrice,
          method: PAYMENT_METHODS[(u + b) % PAYMENT_METHODS.length],
          status: 'COMPLETED',
          processedAt: new Date(),
          gatewayReference: `GATEWAY-5U-${booking.id.slice(0, 8)}`,
        },
      });
    }

    console.log(`     → ${BOOKINGS_PER_USER} حجوزات مكتملة + فواتير مدفوعة + دفعات`);
  }

  // ربط الحجوزات القديمة (BKG-5U-*) التي بدون ورشة بأول ورشة معتمدة لها فيندور
  if (workshop) {
    const updated = await prisma.booking.updateMany({
      where: {
        bookingNumber: { startsWith: 'BKG-5U-' },
        workshopId: null,
      },
      data: { workshopId: workshop.id },
    });
    if (updated.count > 0) {
      console.log(`\n  📌 تم ربط ${updated.count} حجز سابق بالورشة (مقدم الخدمة).`);
    }
  }

  console.log(`\n✅ انتهى: ${createdUsers.length} مستخدمين، ${createdUsers.length * BOOKINGS_PER_USER} حجز، كل حجز له فاتورة ودفعة واحدة مدفوعة.`);
  console.log('   كلمة المرور للعملاء: Customer123!');
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
