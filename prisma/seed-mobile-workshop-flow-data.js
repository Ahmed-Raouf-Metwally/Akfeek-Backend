/**
 * بيانات لاختبار فلو الورش المتنقلة: نوع ورشة + خدمة نوع + ربط ورشة الفيندور الأول بها
 * التشغيل: node prisma/seed-mobile-workshop-flow-data.js
 * المتطلبات: تشغيل seed-24-vendors, seed-mobile-workshops-for-vendors, seed-5-services-per-mobile-workshop
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 إعداد بيانات فلو الورش المتنقلة (نوع + خدمة نوع + ربط ورشة)...\n');

  // نفس ترتيب الـ API (sortOrder, createdAt) ليكون النوع المستخدم هو أول نوع يرجعه الـ API
  let type = await prisma.mobileWorkshopType.findFirst({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { typeServices: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], take: 1 } },
  });

  if (!type) {
    type = await prisma.mobileWorkshopType.create({
      data: {
        name: 'Oil Change',
        nameAr: 'تغيير زيت',
        description: 'خدمات تغيير الزيت',
        serviceType: 'OIL_CHANGE',
        sortOrder: 0,
        isActive: true,
      },
      include: { typeServices: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
    console.log('   ✅ تم إنشاء نوع الورشة:', type.nameAr || type.name);
  }

  let typeService = (type.typeServices && type.typeServices[0]) || null;
  if (!typeService) {
    typeService = await prisma.mobileWorkshopTypeService.create({
      data: {
        workshopTypeId: type.id,
        name: 'Standard Oil Change',
        nameAr: 'تغيير زيت عادي',
        description: 'تغيير زيت المحرك والفلتر',
        sortOrder: 0,
        isActive: true,
      },
    });
    console.log('   ✅ تم إنشاء خدمة النوع:', typeService.nameAr || typeService.name);
  }

  // ورشة الفيندور الأول (نفس المستخدم في الاختبار vendor-mobile-workshop-1@akfeek.com)
  const firstVendor = await prisma.vendorProfile.findFirst({
    where: { vendorType: 'MOBILE_WORKSHOP' },
    orderBy: { createdAt: 'asc' },
    include: { mobileWorkshop: { include: { services: { where: { isActive: true } } } } },
  });

  if (!firstVendor?.mobileWorkshop) {
    console.log('   ⚠️ لا توجد ورشة متنقلة لفيندور. شغّل: npm run prisma:seed:mobileworkshops');
    return;
  }

  const workshop = firstVendor.mobileWorkshop;

  await prisma.mobileWorkshop.update({
    where: { id: workshop.id },
    data: { workshopTypeId: type.id },
  });
  console.log('   ✅ رُبطت ورشة الفيندور الأول بنوع الورشة:', workshop.nameAr || workshop.name);

  const serviceToLink = workshop.services.find(
    (s) => s.serviceType === 'OIL_CHANGE' || s.workshopTypeServiceId === null
  ) || workshop.services[0];
  if (serviceToLink) {
    await prisma.mobileWorkshopService.update({
      where: { id: serviceToLink.id },
      data: { workshopTypeServiceId: typeService.id },
    });
    console.log('   ✅ رُبطت خدمة الورشة بخدمة النوع:', serviceToLink.nameAr || serviceToLink.name);
  }

  console.log('\n✅ انتهى. يمكن تشغيل: npm run test:mobile-workshop-flow\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
