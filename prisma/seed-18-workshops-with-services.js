/**
 * إنشاء ورشة معتمدة (CertifiedWorkshop) + 5 خدمات بأسعارها لفيندورات "الورش المعتمدة" (CERTIFIED_WORKSHOP) فقط
 * التشغيل: node prisma/seed-18-workshops-with-services.js
 * أو: npm run prisma:seed:18workshops
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FIVE_SERVICES = [
  { serviceType: 'GENERAL',     name: 'General Maintenance',     nameAr: 'صيانة عامة',        description: 'فحص وصيانة عامة للمركبة',           priceBase: 150, estimatedDuration: 60 },
  { serviceType: 'DIAGNOSIS',   name: 'Diagnosis',                nameAr: 'فحص وتشخيص',        description: 'فحص كمبيوتر وتشخيص الأعطال',       priceBase: 120, estimatedDuration: 45 },
  { serviceType: 'AC',          name: 'AC Service',               nameAr: 'صيانة التكييف',      description: 'تعبئة فريون وفحص التكييف',           priceBase: 180, estimatedDuration: 40 },
  { serviceType: 'BRAKE',       name: 'Brake Service',            nameAr: 'فحص وإصلاح الفرامل', description: 'فحص نظام الفرامل واستبدال البطانة', priceBase: 200, estimatedDuration: 90 },
  { serviceType: 'OIL_CHANGE',  name: 'Engine Oil Change',         nameAr: 'تغيير زيت المحرك',   description: 'تغيير زيت وفلتر المحرك',            priceBase: 130, estimatedDuration: 35 },
];

const SERVICES_JSON = JSON.stringify(['GENERAL', 'DIAGNOSIS', 'AC', 'BRAKE', 'OIL_CHANGE']);

async function main() {
  console.log('🔧 إنشاء ورشة معتمدة + 5 خدمات لفيندورات الورش المعتمدة (CERTIFIED_WORKSHOP) فقط...\n');

  const vendors = await prisma.vendorProfile.findMany({
    where: {
      vendorType: 'CERTIFIED_WORKSHOP',
      workshop: null,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (vendors.length === 0) {
    console.log('⚠️ لا يوجد فيندور ورش معتمدة بدون ورشة. لا شيء لتنفيذه.');
    return;
  }

  let workshopsCreated = 0;
  let servicesCreated = 0;

  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i];
    const city = vendor.city || 'Riyadh';
    const name = vendor.businessNameAr || vendor.businessName || `ورشة ${i + 1}`;
    const nameAr = vendor.businessNameAr || vendor.businessName || `ورشة ${i + 1}`;

    const workshop = await prisma.certifiedWorkshop.create({
      data: {
        name: (vendor.businessName || name).slice(0, 120),
        nameAr: nameAr.slice(0, 120),
        description: `ورشة معتمدة تابعة لـ ${vendor.businessName || vendor.businessNameAr || 'الفيندور'}`,
        descriptionAr: `ورشة معتمدة تابعة لـ ${vendor.businessNameAr || vendor.businessName || 'الفيندور'}`,
        address: `${city}, شارع الملك فهد`,
        addressAr: `${city}، شارع الملك فهد`,
        city,
        cityAr: city,
        latitude: 24.7136 + (i % 10) * 0.008,
        longitude: 46.6753 + (i % 10) * 0.008,
        phone: vendor.contactPhone || `+9665000${String(10000 + i).slice(-5)}`,
        email: vendor.contactEmail || null,
        services: SERVICES_JSON,
        isActive: true,
        isVerified: vendor.status === 'ACTIVE',
        verifiedAt: vendor.status === 'ACTIVE' ? new Date() : null,
        vendorId: vendor.id,
      },
    });
    workshopsCreated++;

    for (let s = 0; s < FIVE_SERVICES.length; s++) {
      const svc = FIVE_SERVICES[s];
      const priceOffset = (i * 10 + s * 5) % 50;
      const price = svc.priceBase + priceOffset;
      await prisma.certifiedWorkshopService.create({
        data: {
          workshopId: workshop.id,
          serviceType: svc.serviceType,
          name: svc.name,
          nameAr: svc.nameAr,
          description: svc.description,
          price,
          currency: 'SAR',
          estimatedDuration: svc.estimatedDuration,
          isActive: true,
        },
      });
      servicesCreated++;
    }

    console.log(`   ✅ ورشة معتمدة: ${nameAr} — ${city} (5 خدمات) → فيندور ${vendor.businessNameAr || vendor.businessName}`);
  }

  console.log(`\n✅ انتهى: ${workshopsCreated} ورشة معتمدة و ${servicesCreated} خدمة.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
