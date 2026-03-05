/**
 * Seed: حجوزات مكتملة لكل الفيندورز الذين لديهم ورشة معتمدة
 * يشغّل: node prisma/seed-completed-bookings-for-vendors.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📅 إضافة حجوزات مكتملة لكل الفيندورز (الورش المعتمدة)...\n');

  // 1) ورش معتمدة مرتبطة بفيندور
  const workshops = await prisma.certifiedWorkshop.findMany({
    where: { vendorId: { not: null } },
    include: {
      vendor: {
        select: { id: true, commissionPercent: true, vendorType: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (workshops.length === 0) {
    console.log('⚠️  لا توجد ورش معتمدة مرتبطة بفيندور. أضف ورشاً ومعرّف فيندور (vendorId) ثم شغّل السكربت مرة أخرى.');
    return;
  }

  // 2) عميل ومركبة: أول مستخدم له مركبة
  const userWithVehicle = await prisma.user.findFirst({
    where: {
      vehicles: { some: {} },
    },
    include: {
      vehicles: { take: 1 },
    },
  });

  if (!userWithVehicle || !userWithVehicle.vehicles?.length) {
    console.log('⚠️  لا يوجد مستخدم لديه مركبة. شغّل الـ seed الرئيسي أولاً (npm run prisma:seed).');
    return;
  }

  const customerId = userWithVehicle.id;
  const vehicleId = userWithVehicle.vehicles[0].id;

  // 3) خدمة واحدة من الكتالوج (لربطها بالحجز)
  const service = await prisma.service.findFirst({
    where: { isActive: true },
  });

  if (!service) {
    console.log('⚠️  لا توجد خدمة نشطة في الكتالوج. أضف خدمة ثم شغّل السكربت مرة أخرى.');
    return;
  }

  const unitPrice = 150;
  const totalServicePrice = unitPrice;
  const subtotal = totalServicePrice;
  const laborFee = 0;
  const deliveryFee = 0;
  const partsTotal = 0;
  const discount = 0;
  const tax = Math.round(subtotal * 0.15 * 100) / 100;
  const totalPrice = Math.round((subtotal + tax - discount) * 100) / 100;

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < workshops.length; i++) {
    const workshop = workshops[i];
    const vendor = workshop.vendor;
    const commissionPercent = vendor?.commissionPercent != null ? Number(vendor.commissionPercent) : 10;
    const platformCommission = Math.round(subtotal * commissionPercent / 100 * 100) / 100;
    const vendorEarnings = Math.round((subtotal - platformCommission) * 100) / 100;

    const bookingNumber = `BKG-VENDOR-${String(i + 1).padStart(5, '0')}`;
    const existing = await prisma.booking.findUnique({ where: { bookingNumber } });
    if (existing) {
      skipped++;
      continue;
    }

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() - (workshops.length - i));

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
        laborFee,
        deliveryFee,
        partsTotal,
        discount,
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
            serviceId: service.id,
            quantity: 1,
            unitPrice,
            totalPrice: totalServicePrice,
          },
        },
      },
    });

    await prisma.bookingStatusHistory.createMany({
      data: [
        {
          bookingId: booking.id,
          fromStatus: null,
          toStatus: 'PENDING',
          changedBy: customerId,
          reason: 'تم إنشاء الحجز',
          timestamp: new Date(booking.createdAt.getTime()),
        },
        {
          bookingId: booking.id,
          fromStatus: 'PENDING',
          toStatus: 'CONFIRMED',
          changedBy: customerId,
          reason: 'تم التأكيد',
          timestamp: new Date(booking.createdAt.getTime() + 60000),
        },
        {
          bookingId: booking.id,
          fromStatus: 'CONFIRMED',
          toStatus: 'COMPLETED',
          changedBy: customerId,
          reason: 'تم إنجاز الخدمة',
          timestamp: new Date(booking.createdAt.getTime() + 120000),
        },
      ],
    });

    created++;
    console.log(`  ✅ حجز ${bookingNumber} → ورشة: ${workshop.nameAr || workshop.name} (فيندور: ${vendor?.id?.slice(0, 8) || '—'})`);
  }

  console.log(`\n✅ انتهى: تم إنشاء ${created} حجز مكتمل، وتخطي ${skipped} (موجود مسبقاً).`);
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
