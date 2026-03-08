/**
 * إضافة خدمات غسيل (CLEANING) لفيندورز ورش الغسيل (CAR_WASH) — لاستخدام الفلو مثل العناية الشاملة (حجز مباشر).
 * التشغيل: node prisma/seed-carwash-vendor-services.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_SERVICES = [
  { name: 'غسيل خارجي', nameAr: 'غسيل خارجي', description: 'Exterior car wash', estimatedDuration: 30 },
  { name: 'غسيل داخلي وخارجي', nameAr: 'غسيل داخلي وخارجي', description: 'Full interior and exterior wash', estimatedDuration: 60 },
  { name: 'غسيل وتلميع', nameAr: 'غسيل وتلميع', description: 'Wash and polish', estimatedDuration: 90 },
];

async function main() {
  const vendors = await prisma.vendorProfile.findMany({
    where: { vendorType: 'CAR_WASH' },
    orderBy: { createdAt: 'asc' },
  });

  if (vendors.length === 0) {
    console.log('⚠️ لا يوجد فيندورز من نوع ورش الغسيل (CAR_WASH). شغّل seed-24-vendors أولاً.');
    return;
  }

  let added = 0;
  for (const vendor of vendors) {
    const existing = await prisma.service.findMany({
      where: { vendorId: vendor.id },
      select: { name: true },
    });
    const names = new Set(existing.map((s) => s.name));
    const toAdd = DEFAULT_SERVICES.filter((s) => !names.has(s.name)).slice(0, 3);

    for (const svc of toAdd) {
      const service = await prisma.service.create({
        data: {
          name: svc.name,
          nameAr: svc.nameAr,
          description: svc.description,
          type: 'CATALOG',
          category: 'CLEANING',
          isActive: true,
          requiresVehicle: true,
          estimatedDuration: svc.estimatedDuration,
          vendorId: vendor.id,
        },
      });
      await prisma.servicePricing.create({
        data: { serviceId: service.id, vehicleType: 'سيدان', basePrice: 80 },
      });
      names.add(svc.name);
      added++;
    }
  }
  console.log('✅ تم إضافة خدمات غسيل لفيندورز CAR_WASH. إجمالي الخدمات المضافة:', added);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
