/**
 * إضافة ورشة متنقلة خاصة بكل فيندور من نوع "الورش المتنقلة" (MOBILE_WORKSHOP) الذي ليس له ورشة بعد
 * التشغيل: node prisma/seed-mobile-workshops-for-vendors.js
 * أو: npm run prisma:seed:mobileworkshops
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 جاري البحث عن فيندورز الورش المتنقلة بدون ورشة مرتبطة...\n');

  const mobileVendors = await prisma.vendorProfile.findMany({
    where: { vendorType: 'MOBILE_WORKSHOP' },
    include: { mobileWorkshop: true },
  });

  const withoutWorkshop = mobileVendors.filter((v) => !v.mobileWorkshop);
  if (withoutWorkshop.length === 0) {
    console.log('✅ كل فيندورز الورش المتنقلة لديهم ورشة مرفقة مسبقاً. لا يوجد شيء لتنفيذه.');
    return;
  }

  console.log(`   عدد الفيندورز بدون ورشة متنقلة: ${withoutWorkshop.length}\n`);

  const usedPlates = new Set(
    (await prisma.mobileWorkshop.findMany({ where: { plateNumber: { not: null } }, select: { plateNumber: true } }))
      .map((w) => w.plateNumber)
      .filter(Boolean)
  );

  for (let i = 0; i < withoutWorkshop.length; i++) {
    const vendor = withoutWorkshop[i];
    let plateNumber = `MW-${vendor.id.slice(0, 8).toUpperCase()}`;
    let suffix = 0;
    while (usedPlates.has(plateNumber)) {
      suffix++;
      plateNumber = `MW-${vendor.id.slice(0, 6).toUpperCase()}-${suffix}`;
    }
    usedPlates.add(plateNumber);

    const name = vendor.businessNameAr || vendor.businessName || `ورشة متنقلة ${i + 1}`;
    const nameAr = vendor.businessNameAr || `ورشة متنقلة ${vendor.businessName || i + 1}`;

    const workshop = await prisma.mobileWorkshop.create({
      data: {
        name: name.slice(0, 120),
        nameAr: nameAr.slice(0, 120),
        description: `ورشة متنقلة تابعة لـ ${vendor.businessName || vendor.businessNameAr || 'الفيندور'}`,
        vehicleType: 'Van',
        vehicleModel: 'Mobile Workshop Van',
        year: new Date().getFullYear(),
        plateNumber,
        city: vendor.city || 'Riyadh',
        serviceRadius: 50,
        basePrice: 120,
        pricePerKm: 2,
        minPrice: 80,
        currency: 'SAR',
        isAvailable: true,
        isActive: true,
        isVerified: vendor.status === 'ACTIVE',
        verifiedAt: vendor.status === 'ACTIVE' ? new Date() : null,
        vendorId: vendor.id,
      },
    });

    console.log(`   ✅ ورشة: ${workshop.nameAr || workshop.name} — لوحة ${workshop.plateNumber} → فيندور ${vendor.businessNameAr || vendor.businessName} (${vendor.id.slice(0, 8)})`);
  }

  console.log(`\n✅ انتهى: تم إضافة ${withoutWorkshop.length} ورشة متنقلة لفيندورز الورش المتنقلة.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
