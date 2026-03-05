/**
 * إضافة 5 خدمات لكل ورشة متنقلة (التي لديها أقل من 5 خدمات)
 * التشغيل: node prisma/seed-5-services-per-mobile-workshop.js
 * أو: npm run prisma:seed:mobileworkshop-services
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_SERVICES = [
  { serviceType: 'OIL_CHANGE',  name: 'تغيير زيت المحرك',     nameAr: 'تغيير زيت المحرك',     description: 'تغيير زيت المحرك والفلتر',           price: 120, estimatedDuration: 30 },
  { serviceType: 'TIRE',        name: 'فحص واستبدال الإطارات', nameAr: 'فحص واستبدال الإطارات', description: 'فحص ضغط الهواء واستبدال إطار عند الحاجة', price: 80,  estimatedDuration: 25 },
  { serviceType: 'BATTERY',     name: 'فحص واستبدال البطارية', nameAr: 'فحص واستبدال البطارية', description: 'فحص شحن البطارية واستبدالها إن لزم',     price: 150, estimatedDuration: 20 },
  { serviceType: 'BRAKE',       name: 'فحص الفرامل',          nameAr: 'فحص الفرامل',          description: 'فحص نظام الفرامل وبطانة الفرامل',        price: 100, estimatedDuration: 35 },
  { serviceType: 'GENERAL',     name: 'صيانة عامة وفحص',      nameAr: 'صيانة عامة وفحص',      description: 'فحص عام للمركبة وتشخيص الأعطال',       price: 90,  estimatedDuration: 45 },
];

async function main() {
  console.log('🔧 جاري جلب الورش المتنقلة وعدد خدماتها...\n');

  const workshops = await prisma.mobileWorkshop.findMany({
    include: { _count: { select: { services: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (workshops.length === 0) {
    console.log('⚠️ لا توجد ورش متنقلة في قاعدة البيانات.');
    return;
  }

  let addedTotal = 0;

  for (const workshop of workshops) {
    const currentCount = workshop._count.services;
    const need = Math.max(0, 5 - currentCount);

    if (need === 0) {
      console.log(`   ✓ "${workshop.name}" — لديها بالفعل ${currentCount} خدمة/خدمات.`);
      continue;
    }

    console.log(`   📌 "${workshop.name}" — لديها ${currentCount}، نضيف ${need} خدمة.`);

    const existingTypes = await prisma.mobileWorkshopService.findMany({
      where: { mobileWorkshopId: workshop.id },
      select: { serviceType: true },
    });
    const existingSet = new Set(existingTypes.map((s) => s.serviceType));

    const toAdd = DEFAULT_SERVICES.filter((s) => !existingSet.has(s.serviceType)).slice(0, need);

    for (const svc of toAdd) {
      await prisma.mobileWorkshopService.create({
        data: {
          mobileWorkshopId: workshop.id,
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

  console.log(`\n✅ انتهى. تم إضافة ${addedTotal} خدمة إجمالاً.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
