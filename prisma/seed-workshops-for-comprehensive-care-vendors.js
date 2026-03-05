/**
 * إضافة ورشة معتمدة (CertifiedWorkshop) لكل فيندور من نوع "العناية الشاملة" (COMPREHENSIVE_CARE) الذي ليس له ورشة بعد
 * التشغيل: node prisma/seed-workshops-for-comprehensive-care-vendors.js
 * أو: npm run prisma:seed:care-workshops
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// أنواع الخدمات للورشة (نص بصيغة JSON كما في الحقل services)
const DEFAULT_SERVICES_JSON = JSON.stringify(['GENERAL', 'DIAGNOSIS', 'AC', 'BRAKE', 'OIL_CHANGE', 'BODY_REPAIR']);

async function main() {
  console.log('🔧 جاري البحث عن فيندورز العناية الشاملة بدون ورشة مرتبطة...\n');

  const careVendors = await prisma.vendorProfile.findMany({
    where: { vendorType: 'COMPREHENSIVE_CARE' },
    include: {
      workshop: true,
      user: { select: { phone: true, email: true } },
    },
  });

  const withoutWorkshop = careVendors.filter((v) => !v.workshop);
  if (withoutWorkshop.length === 0) {
    console.log('✅ كل فيندورز العناية الشاملة لديهم ورشة مرفقة مسبقاً. لا يوجد شيء لتنفيذه.');
    return;
  }

  console.log(`   عدد الفيندورز بدون ورشة: ${withoutWorkshop.length}\n`);

  for (let i = 0; i < withoutWorkshop.length; i++) {
    const vendor = withoutWorkshop[i];
    const phone = vendor.contactPhone || vendor.user?.phone || `+9665000${String(10000 + i).slice(-5)}`;
    const email = vendor.contactEmail || vendor.user?.email || null;
    const city = vendor.city || 'Riyadh';
    const name = vendor.businessNameAr || vendor.businessName || `مركز عناية ${i + 1}`;
    const nameAr = vendor.businessNameAr || vendor.businessName || `مركز عناية ${i + 1}`;

    const workshop = await prisma.certifiedWorkshop.create({
      data: {
        name: name.slice(0, 120),
        nameAr: nameAr.slice(0, 120),
        description: `ورشة عناية شاملة تابعة لـ ${vendor.businessName || vendor.businessNameAr || 'الفيندور'}`,
        descriptionAr: `ورشة عناية شاملة تابعة لـ ${vendor.businessNameAr || vendor.businessName || 'الفيندور'}`,
        address: `${city}, شارع الملك فهد`,
        addressAr: `${city}، شارع الملك فهد`,
        city,
        cityAr: city,
        latitude: 24.7136 + (i % 5) * 0.01,
        longitude: 46.6753 + (i % 5) * 0.01,
        phone,
        email,
        services: DEFAULT_SERVICES_JSON,
        isActive: true,
        isVerified: vendor.status === 'ACTIVE',
        verifiedAt: vendor.status === 'ACTIVE' ? new Date() : null,
        vendorId: vendor.id,
      },
    });

    console.log(`   ✅ ورشة: ${workshop.nameAr || workshop.name} — ${city} → فيندور ${vendor.businessNameAr || vendor.businessName} (${vendor.id.slice(0, 8)})`);
  }

  console.log(`\n✅ انتهى: تم إضافة ${withoutWorkshop.length} ورشة لفيندورز العناية الشاملة.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
