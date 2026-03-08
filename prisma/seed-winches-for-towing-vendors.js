/**
 * إضافة ونش خاص بكل فيندور سحب (TOWING_SERVICE) الذي ليس له ونش بعد
 * التشغيل: node prisma/seed-winches-for-towing-vendors.js
 * أو: npm run prisma:seed:winches
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 جاري البحث عن فيندورز السحب بدون ونش...\n');

  const towingVendors = await prisma.vendorProfile.findMany({
    where: { vendorType: 'TOWING_SERVICE' },
    include: { winch: true },
  });

  const withoutWinch = towingVendors.filter((v) => !v.winch);
  if (withoutWinch.length === 0) {
    console.log('✅ كل فيندورز السحب لديهم ونش مرفق مسبقاً. لا يوجد شيء لتنفيذه.');
    return;
  }

  console.log(`   عدد الفيندورز بدون ونش: ${withoutWinch.length}\n`);

  const usedPlates = new Set(
    (await prisma.winch.findMany({ select: { plateNumber: true } })).map((w) => w.plateNumber)
  );

  for (let i = 0; i < withoutWinch.length; i++) {
    const vendor = withoutWinch[i];
    let plateNumber = `WN-${vendor.id.slice(0, 8).toUpperCase()}`;
    let suffix = 0;
    while (usedPlates.has(plateNumber)) {
      suffix++;
      plateNumber = `WN-${vendor.id.slice(0, 6).toUpperCase()}-${suffix}`;
    }
    usedPlates.add(plateNumber);

    const name = vendor.businessNameAr || vendor.businessName || `ونش ${i + 1}`;
    const nameAr = vendor.businessNameAr || `ونش ${vendor.businessName || i + 1}`;

    // إحداثيات الرياض — ضرورية لـ findNearbyWinches واختبار فلو السحب (test:winch-flow)
    const riyadhLat = 24.7136;
    const riyadhLng = 46.6753;
    const winch = await prisma.winch.create({
      data: {
        name: name.slice(0, 80),
        nameAr: nameAr.slice(0, 80),
        plateNumber,
        vehicleModel: 'Tow Truck',
        year: new Date().getFullYear(),
        capacity: 3,
        city: vendor.city || 'Riyadh',
        latitude: riyadhLat,
        longitude: riyadhLng,
        basePrice: 150,
        pricePerKm: 2.5,
        minPrice: 100,
        currency: 'SAR',
        isAvailable: true,
        isActive: true,
        isVerified: vendor.status === 'ACTIVE',
        verifiedAt: vendor.status === 'ACTIVE' ? new Date() : null,
        vendorId: vendor.id,
      },
    });

    console.log(`   ✅ ونش: ${winch.nameAr || winch.name} — لوحة ${winch.plateNumber} → فيندور ${vendor.businessNameAr || vendor.businessName} (${vendor.id.slice(0, 8)})`);
  }

  console.log(`\n✅ انتهى: تم إضافة ${withoutWinch.length} ونش لفيندورز السحب.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
