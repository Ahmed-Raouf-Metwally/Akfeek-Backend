/**
 * إضافة الخدمات بأسعارها لكل ورشة معتمدة (بديل الخدمات القديمة GENERAL, DIAGNOSIS, AC, BRAKE, OIL_CHANGE, BODY_REPAIR)
 * التشغيل: node prisma/seed-workshop-services-with-prices.js
 * أو: npm run prisma:seed:workshop-services
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_SERVICES = [
  { serviceType: 'GENERAL',     name: 'صيانة عامة',        nameAr: 'صيانة عامة',        description: 'فحص وصيانة عامة للمركبة',     price: 150, estimatedDuration: 60 },
  { serviceType: 'DIAGNOSIS',   name: 'فحص وتشخيص',        nameAr: 'فحص وتشخيص',        description: 'فحص كمبيوتر وتشخيص الأعطال',   price: 120, estimatedDuration: 45 },
  { serviceType: 'AC',          name: 'صيانة التكييف',      nameAr: 'صيانة التكييف',      description: 'تعبئة فريون وفحص التكييف',     price: 180, estimatedDuration: 40 },
  { serviceType: 'BRAKE',       name: 'فحص وإصلاح الفرامل', nameAr: 'فحص وإصلاح الفرامل', description: 'فحص نظام الفرامل واستبدال البطانة', price: 200, estimatedDuration: 90 },
  { serviceType: 'OIL_CHANGE',  name: 'تغيير زيت المحرك',   nameAr: 'تغيير زيت المحرك',   description: 'تغيير زيت وفلتر المحرك',      price: 130, estimatedDuration: 35 },
  { serviceType: 'BODY_REPAIR', name: 'إصلاح هيكل وسمكرة', nameAr: 'إصلاح هيكل وسمكرة', description: 'إصلاح تعرجات الهيكل والسمكرة',  price: 350, estimatedDuration: 120 },
];

async function main() {
  console.log('🔧 إزالة الخدمات القديمة (نص) من الورش المعتمدة واستبدالها بخدمات بأسعار...\n');

  await prisma.certifiedWorkshop.updateMany({
    data: { services: '[]' },
  });
  console.log('   تم تعيين حقل الخدمات القديم إلى [] لجميع الورش.\n');

  const workshops = await prisma.certifiedWorkshop.findMany({
    include: { _count: { select: { workshopServices: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (workshops.length === 0) {
    console.log('⚠️ لا توجد ورش معتمدة في قاعدة البيانات.');
    return;
  }

  let addedTotal = 0;

  for (const workshop of workshops) {
    const currentCount = workshop._count.workshopServices;
    const need = Math.max(0, 6 - currentCount);

    if (need === 0) {
      console.log(`   ✓ "${workshop.nameAr || workshop.name}" — لديها ${currentCount} خدمة/خدمات.`);
      continue;
    }

    console.log(`   📌 "${workshop.nameAr || workshop.name}" — لديها ${currentCount}، نضيف حتى 6 خدمات.`);

    const existing = await prisma.certifiedWorkshopService.findMany({
      where: { workshopId: workshop.id },
      select: { serviceType: true },
    });
    const existingSet = new Set(existing.map((s) => s.serviceType));

    const toAdd = DEFAULT_SERVICES.filter((s) => !existingSet.has(s.serviceType)).slice(0, need);

    for (const svc of toAdd) {
      await prisma.certifiedWorkshopService.create({
        data: {
          workshopId: workshop.id,
          serviceType: svc.serviceType,
          name: svc.name,
          nameAr: svc.nameAr,
          description: svc.description,
          price: svc.price,
          currency: 'SAR',
          estimatedDuration: svc.estimatedDuration,
          isActive: true,
        },
      });
      existingSet.add(svc.serviceType);
      addedTotal++;
    }

    console.log(`      تمت إضافة ${toAdd.length} خدمة.`);
  }

  console.log(`\n✅ انتهى. تم إضافة ${addedTotal} خدمة بأسعارها للورش المعتمدة.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
