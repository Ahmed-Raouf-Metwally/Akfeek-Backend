/**
 * Seed أنواع الورش المتنقلة — نوع الورشة = نوع الخدمة (حقل واحد)
 * التشغيل: node prisma/seed-mobile-workshop-types.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TYPES = [
  { name: 'Oil Change', nameAr: 'تغيير زيت', serviceType: 'OIL_CHANGE', description: 'خدمة تغيير زيت المحرك والفلتر' },
  { name: 'Tire Service', nameAr: 'إطارات', serviceType: 'TIRE', description: 'فحص واستبدال الإطارات' },
  { name: 'Battery', nameAr: 'بطارية', serviceType: 'BATTERY', description: 'فحص واستبدال البطارية' },
  { name: 'Brake', nameAr: 'فرامل', serviceType: 'BRAKE', description: 'فحص وإصلاح الفرامل' },
  { name: 'AC', nameAr: 'تكييف', serviceType: 'AC', description: 'صيانة التكييف' },
  { name: 'General Maintenance', nameAr: 'صيانة عامة', serviceType: 'GENERAL', description: 'صيانة عامة وفحص' },
  { name: 'Diagnosis', nameAr: 'فحص وتشخيص', serviceType: 'DIAGNOSIS', description: 'فحص وتشخيص الأعطال' },
];

async function main() {
  for (let i = 0; i < TYPES.length; i++) {
    const t = TYPES[i];
    const existing = await prisma.mobileWorkshopType.findFirst({
      where: { serviceType: t.serviceType },
    });
    if (!existing) {
      await prisma.mobileWorkshopType.create({
        data: {
          name: t.name,
          nameAr: t.nameAr,
          description: t.description,
          serviceType: t.serviceType,
          sortOrder: i,
          isActive: true,
        },
      });
    }
  }
  const count = await prisma.mobileWorkshopType.count();
  console.log('Mobile workshop types seeded. Total types:', count);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
