/**
 * إضافة 10 مستخدمين:
 * - 3 قدّموا طلب أن يصبحوا فيندور (Vendor طلب تسجيل - PENDING)
 * - 7 حجزوا خدمات ودفعوا: حجز مرتبط بالعميل + الورشة/مزود الخدمة + فاتورة مدفوعة
 *
 * التشغيل: node prisma/seed-10-users-3-vendor-requests-7-bookings-paid.js
 * أو: npm run prisma:seed:10users-bookings
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const PASSWORD = 'Customer123!';

const USERS = [
  { email: 'user1@akfeek.com',  phone: '+966501000001', firstName: 'أحمد',   lastName: 'الغامدي' },
  { email: 'user2@akfeek.com',  phone: '+966501000002', firstName: 'سارة',   lastName: 'المطيري' },
  { email: 'user3@akfeek.com',  phone: '+966501000003', firstName: 'محمد',   lastName: 'الشهري' },
  { email: 'user4@akfeek.com',  phone: '+966501000004', firstName: 'فاطمة',  lastName: 'العتيبي' },
  { email: 'user5@akfeek.com',  phone: '+966501000005', firstName: 'خالد',   lastName: 'الروقي' },
  { email: 'user6@akfeek.com',  phone: '+966501000006', firstName: 'نورة',   lastName: 'الحربي' },
  { email: 'user7@akfeek.com',  phone: '+966501000007', firstName: 'عمر',    lastName: 'القرني' },
  { email: 'user8@akfeek.com',  phone: '+966501000008', firstName: 'هند',   lastName: 'الدوسري' },
  { email: 'user9@akfeek.com',  phone: '+966501000009', firstName: 'يوسف',  lastName: 'الزهراني' },
  { email: 'user10@akfeek.com', phone: '+966501000010', firstName: 'لينا',   lastName: 'القحطاني' },
];

// أول 3 قدّموا طلب فيندور
const VENDOR_APPLICANT_INDICES = [0, 1, 2]; // user1, user2, user3

// من 4 إلى 10 (7 مستخدمين) حجزوا ودفعوا
const BOOKING_CUSTOMER_INDICES = [3, 4, 5, 6, 7, 8, 9]; // user4..user10

const PAYMENT_METHODS = ['CARD', 'MADA', 'CASH', 'WALLET', 'BANK_TRANSFER'];

function nextBookingNumber(seq) {
  return `BKG-10U-${String(seq).padStart(5, '0')}`;
}
function nextInvoiceNumber(seq) {
  return `INV-10U-${String(seq).padStart(5, '0')}`;
}
function nextPaymentNumber(seq) {
  return `PAY-10U-${String(seq).padStart(5, '0')}`;
}

async function main() {
  console.log('👥 إضافة 10 مستخدمين: 3 طلبوا فيندور، 7 حجزوا خدمات ودفعوا...\n');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const vehicleModel = await prisma.vehicleModel.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!vehicleModel) {
    console.log('⚠️ لا يوجد موديل مركبة. شغّل الـ seed الرئيسي أولاً.');
    return;
  }

  let services = await prisma.service.findMany({
    where: { isActive: true },
    take: 10,
    orderBy: { createdAt: 'asc' },
  });
  if (services.length === 0) {
    console.log('   إنشاء خدمات أساسية للكتالوج...');
    const defaultServices = [
      { name: 'Oil Change', nameAr: 'تغيير الزيت', type: 'CATALOG', category: 'MAINTENANCE', estimatedDuration: 45 },
      { name: 'Brake Check', nameAr: 'فحص الفرامل', type: 'CATALOG', category: 'MAINTENANCE', estimatedDuration: 60 },
      { name: 'General Maintenance', nameAr: 'صيانة عامة', type: 'FIXED', category: 'MAINTENANCE', estimatedDuration: 90 },
    ];
    for (const s of defaultServices) {
      const created = await prisma.service.create({
        data: {
          name: s.name,
          nameAr: s.nameAr,
          type: s.type,
          category: s.category,
          isActive: true,
          requiresVehicle: true,
          estimatedDuration: s.estimatedDuration,
        },
      });
      services.push(created);
    }
    console.log(`   تم إنشاء ${services.length} خدمة.`);
  }

  const workshop = await prisma.certifiedWorkshop.findFirst({
    where: { vendorId: { not: null }, isActive: true },
    include: { vendor: { select: { id: true, businessNameAr: true, commissionPercent: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!workshop) {
    console.log('⚠️ لا توجد ورشة معتمدة مرتبطة بفيندور. شغّل seed الورش/الفيندورات.');
    return;
  }

  const createdUsers = [];
  let bookingSeq = 1;
  let invoiceSeq = 1;
  let paymentSeq = 1;

  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        phone: u.phone,
        passwordHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: u.firstName,
            lastName: u.lastName,
          },
        },
      },
    });
    createdUsers.push(user);

    const isVendorApplicant = VENDOR_APPLICANT_INDICES.includes(i);
    if (isVendorApplicant) {
      const companyEmail = `vendor-apply-${i + 1}@akfeek.com`;
      const existingVendorApp = await prisma.vendor.findFirst({
        where: { userId: user.id },
      });
      if (!existingVendorApp) {
        await prisma.vendor.create({
          data: {
            userId: user.id,
            legalName: `${u.firstName} ${u.lastName}`,
            tradeName: `متجر ${u.firstName}`,
            supplierType: 'AUTO_PARTS',
            country: 'SA',
            city: 'Riyadh',
            addressLine1: 'شارع الملك فهد',
            nationalAddress: 'الرياض، حي النخيل',
            postalCode: '12345',
            commercialRegNo: `CR-10U-${String(i + 1).padStart(4, '0')}`,
            companyEmail,
            companyPhone: u.phone,
            contactPersonName: `${u.firstName} ${u.lastName}`,
            contactPersonTitle: 'مالك',
            contactPersonMobile: u.phone,
            mainService: 'قطع غيار',
            servicesOffered: 'بيع قطع غيار سيارات وإكسسوارات',
            coverageRegion: 'الرياض',
            payoutMethod: 'BANK_TRANSFER',
            bankName: 'بنك الراجحي',
            status: 'PENDING',
          },
        });
        console.log(`  ✅ مستخدم (طلب فيندور): ${u.email} — طلب تسجيل فيندور PENDING`);
      } else {
        console.log(`  ✓ مستخدم (طلب فيندور موجود): ${u.email}`);
      }
      // إضافة مركبة للمستخدمين الـ 3 (طلب فيندور) إذا لم توجد
      let vehicleApplicant = await prisma.userVehicle.findFirst({
        where: { userId: user.id },
      });
      if (!vehicleApplicant) {
        vehicleApplicant = await prisma.userVehicle.create({
          data: {
            userId: user.id,
            vehicleModelId: vehicleModel.id,
            plateDigits: String(5000 + i + 1),
            plateLettersEn: 'SEJ',
            plateLettersAr: 'س ي ج',
            isDefault: true,
          },
        });
        console.log(`     → مركبة مضافة (لوحة ${vehicleApplicant.plateLettersEn} ${vehicleApplicant.plateDigits})`);
      }
      continue;
    }

    console.log(`  ✅ مستخدم (عميل): ${u.email} (${u.firstName} ${u.lastName})`);

    let vehicle = await prisma.userVehicle.findFirst({
      where: { userId: user.id },
    });
    if (!vehicle) {
      vehicle = await prisma.userVehicle.create({
        data: {
          userId: user.id,
          vehicleModelId: vehicleModel.id,
          plateDigits: String(5000 + i),
          plateLettersEn: 'ABC',
          plateLettersAr: 'أ ب ج',
          isDefault: true,
        },
      });
    }

    const service = services[i % services.length];
    const unitPrice = 100 + (i % 5) * 25;
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
    scheduledDate.setDate(scheduledDate.getDate() - (i % 7));

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId: user.id,
        vehicleId: vehicle.id,
        workshopId: workshop.id,
        scheduledDate,
        scheduledTime: i % 2 === 0 ? '10:00' : '15:00',
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
        method: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
        status: 'COMPLETED',
        processedAt: new Date(),
        gatewayReference: `GATEWAY-10U-${booking.id.slice(0, 8)}`,
      },
    });

    console.log(`     → حجز ${bookingNumber} → ورشة "${workshop.nameAr || workshop.name}" (فيندور: ${workshop.vendor?.businessNameAr || '—'}) → فاتورة ${invoiceNumber} مدفوعة`);
  }

  console.log('\n✅ انتهى:');
  console.log('   • 10 مستخدمين (كلمة المرور: ' + PASSWORD + ')');
  console.log('   • 3 قدّموا طلب فيندور (Vendor status PENDING) — user1@, user2@, user3@');
  console.log('   • 7 حجزوا خدمة ودفعوا: الحجز مرتبط بالعميل + الورشة/مزود الخدمة + فاتورة + دفعة مكتملة');
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
