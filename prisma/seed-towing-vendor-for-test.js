/**
 * إنشاء فيندور ونش واحد + ونش بموقع الرياض للاختبار
 * التشغيل: node prisma/seed-towing-vendor-for-test.js
 * أو: npm run prisma:seed (لا — هذا للـ seed الرئيسي). استخدم node prisma/seed-towing-vendor-for-test.js
 *
 * المستخدم: winch.vendor@test.com / Admin123!
 * بعد التشغيل يمكنك تشغيل: npm run test:winch-flow
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const VENDOR_EMAIL = 'winch.vendor@test.com';
const VENDOR_PASSWORD = 'Admin123!';

// موقع الرياض — قريب من نقطة الطلب في الاختبار (24.7136, 46.6753)
const RIYADH_LAT = 24.72;
const RIYADH_LNG = 46.68;

async function main() {
  console.log('🔧 إنشاء فيندور ونش للاختبار...\n');

  const hash = await bcrypt.hash(VENDOR_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: VENDOR_EMAIL },
    update: {},
    create: {
      email: VENDOR_EMAIL,
      phone: '+966501111001',
      passwordHash: hash,
      role: 'VENDOR',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      profile: {
        create: {
          firstName: 'Winch',
          lastName: 'Vendor',
          avatar: 'https://ui-avatars.com/api/?name=WV&background=0ea5e9',
        },
      },
    },
    include: { profile: true },
  });

  let vendor = await prisma.vendorProfile.findFirst({
    where: { userId: user.id },
    include: { winch: true },
  });

  if (!vendor) {
    vendor = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        vendorType: 'TOWING_SERVICE',
        businessName: 'Test Winch Co.',
        businessNameAr: 'ونش الاختبار',
        contactPhone: user.phone,
        contactEmail: user.email,
        city: 'Riyadh',
        country: 'SA',
        status: 'ACTIVE',
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
    console.log('   ✅ VendorProfile (TOWING_SERVICE) created');
  } else {
    await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: { vendorType: 'TOWING_SERVICE', status: 'ACTIVE' },
    });
    console.log('   ✅ VendorProfile updated to TOWING_SERVICE');
  }

  if (!vendor.winch) {
    await prisma.winch.create({
      data: {
        vendorId: vendor.id,
        name: 'Test Winch Truck',
        nameAr: 'ونش الاختبار',
        plateNumber: `TST-${Date.now().toString(36).toUpperCase().slice(-6)}`,
        vehicleModel: 'Tow Truck',
        year: new Date().getFullYear(),
        capacity: 3,
        city: 'Riyadh',
        latitude: RIYADH_LAT,
        longitude: RIYADH_LNG,
        basePrice: 150,
        pricePerKm: 2.5,
        minPrice: 100,
        currency: 'SAR',
        isActive: true,
        isAvailable: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
    console.log('   ✅ Winch created with Riyadh location (lat/lng)');
  } else {
    await prisma.winch.update({
      where: { id: vendor.winch.id },
      data: {
        latitude: RIYADH_LAT,
        longitude: RIYADH_LNG,
        isActive: true,
        isAvailable: true,
      },
    });
    console.log('   ✅ Winch location updated (Riyadh)');
  }

  console.log(`\n✅ جاهز. استخدم للتسجيل: ${VENDOR_EMAIL} / ${VENDOR_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
