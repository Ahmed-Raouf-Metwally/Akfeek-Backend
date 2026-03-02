/**
 * Seed: ورش معتمدة مرتبطة بفيندور + خدمات الورش + حجوزات مكتملة
 * يشغّل: node prisma/seed-workshops-vendors-bookings.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const WORKSHOP_SERVICES = [
  { serviceType: 'OIL_CHANGE', name: 'Oil Change', nameAr: 'تغيير الزيت', price: 120, duration: 45 },
  { serviceType: 'BRAKE', name: 'Brake Service', nameAr: 'خدمة الفرامل', price: 250, duration: 90 },
  { serviceType: 'ENGINE_REPAIR', name: 'Engine Diagnostic', nameAr: 'تشخيص المحرك', price: 150, duration: 60 },
  { serviceType: 'AC', name: 'AC Service', nameAr: 'خدمة التكييف', price: 180, duration: 75 },
  { serviceType: 'TIRE', name: 'Tire Rotation', nameAr: 'تدوير الإطارات', price: 80, duration: 30 },
  { serviceType: 'BATTERY', name: 'Battery Check', nameAr: 'فحص البطارية', price: 50, duration: 20 },
];

async function main() {
  console.log('🏢 إضافة ورش مرتبطة بفيندور + خدمات + حجوزات مكتملة...\n');

  const hash = await bcrypt.hash('Admin123!', 10);

  // ── 1) فيندورز نوعهم ورش معتمدة (أو إنشاء واحد إن لم يوجد)
  let workshopVendors = await prisma.vendorProfile.findMany({
    where: { vendorType: 'CERTIFIED_WORKSHOP' },
    take: 5,
  });

  if (workshopVendors.length === 0) {
    console.log('   إنشاء مستخدم وفيندور للورش المعتمدة...');
    const user = await prisma.user.create({
      data: {
        email: 'vendor-workshop-seed@akfeek.com',
        phone: '+966501234500',
        passwordHash: hash,
        role: 'VENDOR',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: 'Vendor',
            lastName: 'Workshop',
          },
        },
      },
    });
    const vendor = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        vendorType: 'CERTIFIED_WORKSHOP',
        businessName: 'Seed Workshop Vendor',
        businessNameAr: 'فيندور ورشة البذرة',
        contactEmail: user.email,
        contactPhone: user.phone,
        city: 'Riyadh',
        country: 'SA',
        status: 'ACTIVE',
        commissionPercent: 10,
      },
    });
    workshopVendors = [vendor];
    console.log('   ✅ تم إنشاء فيندور ورشة: vendor-workshop-seed@akfeek.com / Admin123!');
  }

  // ── 2) ورش جديدة مرتبطة بكل فيندور (ورشة واحدة لكل فيندور إن لم تكن له ورشة بعد)
  const workshopsCreated = [];
  for (const vendor of workshopVendors) {
    const existingWorkshop = await prisma.certifiedWorkshop.findFirst({
      where: { vendorId: vendor.id },
    });
    if (existingWorkshop) {
      workshopsCreated.push(existingWorkshop);
      continue;
    }

    const name = `Workshop ${vendor.businessName?.slice(0, 15) || vendor.id.slice(0, 8)}`;
    const nameAr = `ورشة ${vendor.businessNameAr || 'الفيندور'}`;
    const phone = `+9665${Math.floor(1000000 + Math.random() * 8999999)}`;

    const workshop = await prisma.certifiedWorkshop.create({
      data: {
        name,
        nameAr,
        description: 'Certified workshop linked to vendor with full services.',
        descriptionAr: 'ورشة معتمدة مرتبطة بفيندور مع خدمات كاملة.',
        address: 'Industrial Area, King Fahd Road',
        addressAr: 'المنطقة الصناعية، طريق الملك فهد',
        city: vendor.city || 'Riyadh',
        cityAr: 'الرياض',
        latitude: 24.71 + (Math.random() * 0.05),
        longitude: 46.67 + (Math.random() * 0.05),
        phone,
        email: vendor.contactEmail || `workshop-${vendor.id.slice(0, 8)}@akfeek.com`,
        workingHours: {
          sunday: { open: '08:00', close: '18:00' },
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          saturday: { open: '09:00', close: '15:00' },
        },
        services: JSON.stringify(['OIL_CHANGE', 'BRAKE', 'ENGINE_REPAIR', 'AC', 'TIRE', 'BATTERY']),
        isActive: true,
        isVerified: true,
        verifiedAt: new Date(),
        averageRating: 4.5,
        totalReviews: 0,
        totalBookings: 0,
        vendorId: vendor.id,
      },
    });
    workshopsCreated.push(workshop);
    console.log(`   ✅ ورشة: ${workshop.nameAr} (فيندور: ${vendor.id.slice(0, 8)})`);
  }

  // ── 3) خدمات لكل ورشة (CertifiedWorkshopService)
  let serviceCount = 0;
  for (const workshop of workshopsCreated) {
    const existing = await prisma.certifiedWorkshopService.count({ where: { workshopId: workshop.id } });
    if (existing > 0) continue;

    for (const svc of WORKSHOP_SERVICES) {
      await prisma.certifiedWorkshopService.create({
        data: {
          workshopId: workshop.id,
          serviceType: svc.serviceType,
          name: svc.name,
          nameAr: svc.nameAr,
          price: svc.price,
          currency: 'SAR',
          estimatedDuration: svc.duration,
          isActive: true,
        },
      });
      serviceCount++;
    }
    console.log(`   ✅ خدمات الورشة ${workshop.nameAr}: ${WORKSHOP_SERVICES.length} خدمات`);
  }
  if (serviceCount > 0) {
    console.log(`   إجمالي خدمات الورش المضافة: ${serviceCount}\n`);
  }

  // ── 4) عميل ومركبة وخدمة من الكتالوج (للحجز)
  const userWithVehicle = await prisma.user.findFirst({
    where: { vehicles: { some: {} } },
    include: { vehicles: { take: 1 } },
  });
  if (!userWithVehicle?.vehicles?.length) {
    console.log('⚠️  لا يوجد عميل بمركبة. شغّل الـ seed الرئيسي أولاً (npm run prisma:seed).');
    return;
  }
  const catalogService = await prisma.service.findFirst({ where: { isActive: true } });
  if (!catalogService) {
    console.log('⚠️  لا توجد خدمة نشطة في الكتالوج.');
    return;
  }

  const customerId = userWithVehicle.id;
  const vehicleId = userWithVehicle.vehicles[0].id;
  const unitPrice = 150;
  const subtotal = unitPrice;
  const tax = Math.round(subtotal * 0.15 * 100) / 100;
  const totalPrice = Math.round((subtotal + tax) * 100) / 100;

  // ── 5) حجز مكتمل لكل ورشة
  let bookingNum = 1;
  let bookingsCreated = 0;
  for (const workshop of workshopsCreated) {
    const vendor = workshop.vendorId ? await prisma.vendorProfile.findUnique({ where: { id: workshop.vendorId } }) : null;
    const commissionPercent = vendor?.commissionPercent != null ? Number(vendor.commissionPercent) : 10;
    const platformCommission = Math.round(subtotal * commissionPercent / 100 * 100) / 100;
    const vendorEarnings = Math.round((subtotal - platformCommission) * 100) / 100;

    const bookingNumber = `BKG-WS-${String(bookingNum).padStart(5, '0')}`;
    bookingNum++;
    const existingBooking = await prisma.booking.findUnique({ where: { bookingNumber } });
    if (existingBooking) continue;

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() - workshopsCreated.length + bookingNum - 2);

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId,
        vehicleId,
        workshopId: workshop.id,
        scheduledDate,
        scheduledTime: '10:00',
        status: 'COMPLETED',
        completedAt: new Date(),
        subtotal,
        laborFee: 0,
        deliveryFee: 0,
        partsTotal: 0,
        discount: 0,
        tax,
        totalPrice,
        metadata: {
          commissionPercent,
          platformCommission,
          vendorEarnings,
          vatRate: 0.15,
        },
        services: {
          create: {
            serviceId: catalogService.id,
            quantity: 1,
            unitPrice,
            totalPrice: unitPrice,
          },
        },
      },
    });

    await prisma.bookingStatusHistory.createMany({
      data: [
        { bookingId: booking.id, fromStatus: null, toStatus: 'PENDING', changedBy: customerId, reason: 'تم إنشاء الحجز', timestamp: booking.createdAt },
        { bookingId: booking.id, fromStatus: 'PENDING', toStatus: 'CONFIRMED', changedBy: customerId, reason: 'تم التأكيد', timestamp: new Date(booking.createdAt.getTime() + 60000) },
        { bookingId: booking.id, fromStatus: 'CONFIRMED', toStatus: 'COMPLETED', changedBy: customerId, reason: 'تم إنجاز الخدمة', timestamp: new Date(booking.createdAt.getTime() + 120000) },
      ],
    });

    await prisma.certifiedWorkshop.update({
      where: { id: workshop.id },
      data: { totalBookings: { increment: 1 } },
    });

    bookingsCreated++;
    console.log(`   ✅ حجز مكتمل ${booking.bookingNumber} → ${workshop.nameAr}`);
  }

  console.log(`\n✅ انتهى: ${workshopsCreated.length} ورشة، خدمات لكل ورشة، ${bookingsCreated} حجز مكتمل.`);
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
