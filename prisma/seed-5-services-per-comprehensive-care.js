/**
 * إضافة 5 خدمات (Service) لكل فيندور عناية شاملة (COMPREHENSIVE_CARE) الذي لديه أقل من 5 خدمات
 * التشغيل: node prisma/seed-5-services-per-comprehensive-care.js
 * أو: npm run prisma:seed:care-services
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 5 خدمات افتراضية للعناية الشاملة (نوع Service مع category COMPREHENSIVE_CARE)
const DEFAULT_SERVICES = [
  { name: 'تغيير زيت وفلاتر', nameAr: 'تغيير زيت وفلاتر', description: 'تغيير زيت المحرك والفلتر مع فحص مستوى السوائل', estimatedDuration: 45 },
  { name: 'فحص وإصلاح الفرامل', nameAr: 'فحص وإصلاح الفرامل', description: 'فحص نظام الفرامل وبطانة الفرامل وتغييرها عند الحاجة', estimatedDuration: 60 },
  { name: 'صيانة التكييف', nameAr: 'صيانة التكييف', description: 'تعبئة فريون وفحص ضغط التكييف وتنظيف الفلاتر', estimatedDuration: 30 },
  { name: 'فحص البطارية والشحن', nameAr: 'فحص البطارية والشحن', description: 'فحص شحن البطارية ومسامير التوصيل واستبدالها إن لزم', estimatedDuration: 25 },
  { name: 'فحص عام وتشخيص', nameAr: 'فحص عام وتشخيص', description: 'فحص شامل للمحرك والإطارات والإلكترونيات وتقرير الحالة', estimatedDuration: 50 },
];

async function main() {
  console.log('🔧 جاري جلب فيندورز العناية الشاملة وعدد خدماتهم...\n');

  const vendors = await prisma.vendorProfile.findMany({
    where: { vendorType: 'COMPREHENSIVE_CARE' },
    include: { _count: { select: { comprehensiveCareServices: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (vendors.length === 0) {
    console.log('⚠️ لا يوجد فيندورز من نوع العناية الشاملة.');
    return;
  }

  let addedTotal = 0;

  for (const vendor of vendors) {
    const currentCount = vendor._count.comprehensiveCareServices;
    const need = Math.max(0, 5 - currentCount);

    if (need === 0) {
      console.log(`   ✓ "${vendor.businessNameAr || vendor.businessName}" — لديه بالفعل ${currentCount} خدمة.`);
      continue;
    }

    console.log(`   📌 "${vendor.businessNameAr || vendor.businessName}" — لديه ${currentCount}، نضيف ${need} خدمة.`);

    const existing = await prisma.service.findMany({
      where: { vendorId: vendor.id },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((s) => s.name));

    const toAdd = DEFAULT_SERVICES.filter((s) => !existingNames.has(s.name)).slice(0, need);

    for (const svc of toAdd) {
      const service = await prisma.service.create({
        data: {
          name: svc.name,
          nameAr: svc.nameAr,
          description: svc.description,
          type: 'CATALOG',
          category: 'COMPREHENSIVE_CARE',
          isActive: true,
          requiresVehicle: true,
          estimatedDuration: svc.estimatedDuration,
          vendorId: vendor.id,
        },
      });
      // سعر افتراضي لكل خدمة (حسب نوع المركبة)
      await prisma.servicePricing.create({
        data: {
          serviceId: service.id,
          vehicleType: 'سيدان',
          basePrice: 120,
        },
      });
      existingNames.add(svc.name);
      addedTotal++;
    }

    console.log(`      تمت إضافة ${toAdd.length} خدمة.`);
  }

  console.log(`\n✅ انتهى. تم إضافة ${addedTotal} خدمة إجمالاً لفيندورز العناية الشاملة.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
