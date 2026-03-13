/**
 * بيانات فلو الورش المتنقلة: أنواع الورش + خدمات النوع + ربط الورش والخدمات الموجودة
 * يضمن أن GET /api/mobile-workshop-types يعيد نوعاً وخدمة، والورش المتنقلة تظهر عند إنشاء الطلب.
 *
 * التشغيل: node prisma/seed-mobile-workshop-flow-data.js
 * أو: npm run prisma:seed:mobile-workshop-flow
 *
 * يُفضّل تشغيله بعد: seed-mobile-workshops-for-vendors و seed-5-services-per-mobile-workshop
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 إعداد بيانات فلو الورش المتنقلة (أنواع + ربط ورش)...\n');

  // 1) إنشاء أو استخدام نوع ورشة مع خدمة (نفس ترتيب الـ API: sortOrder ثم createdAt)
  let type = await prisma.mobileWorkshopType.findFirst({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      typeServices: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!type) {
    type = await prisma.mobileWorkshopType.create({
      data: {
        name: 'General Maintenance',
        nameAr: 'صيانة عامة',
        description: 'صيانة وفحص عام للمركبة',
        serviceType: 'GENERAL',
        sortOrder: 0,
        isActive: true,
      },
    });
    console.log('   ✅ تم إنشاء نوع الورشة:', type.nameAr || type.name);
  } else {
    console.log('   ✓ نوع الورشة موجود:', type.nameAr || type.name);
  }

  let typeService = type.typeServices?.[0];
  if (!typeService) {
    typeService = await prisma.mobileWorkshopTypeService.create({
      data: {
        workshopTypeId: type.id,
        name: 'General check and maintenance',
        nameAr: 'صيانة عامة وفحص',
        description: 'فحص عام للمركبة وتشخيص الأعطال',
        sortOrder: 0,
        isActive: true,
      },
    });
    console.log('   ✅ تم إنشاء خدمة النوع:', typeService.nameAr || typeService.name);
  } else {
    console.log('   ✓ خدمة النوع موجودة:', typeService.nameAr || typeService.name);
  }

  // 2) ورش متنقلة بدون workshopTypeId أو بدون خدمة مرتبطة بالنوع
  const workshops = await prisma.mobileWorkshop.findMany({
    where: { isActive: true },
    include: {
      services: {
        where: { isActive: true },
        take: 10,
      },
    },
  });

  if (workshops.length === 0) {
    console.log('\n   ⚠️ لا توجد ورش متنقلة. شغّل: npm run prisma:seed:mobileworkshops');
    return;
  }

  let linked = 0;
  for (const workshop of workshops) {
    const updates = [];

    if (workshop.workshopTypeId !== type.id) {
      updates.push(
        prisma.mobileWorkshop.update({
          where: { id: workshop.id },
          data: { workshopTypeId: type.id },
        })
      );
    }

    const hasLinkedService = workshop.services.some((s) => s.workshopTypeServiceId === typeService.id);
    if (!hasLinkedService && workshop.services.length > 0) {
      const generalOrFirst = workshop.services.find((s) => s.serviceType === 'GENERAL') || workshop.services[0];
      updates.push(
        prisma.mobileWorkshopService.update({
          where: { id: generalOrFirst.id },
          data: { workshopTypeServiceId: typeService.id },
        })
      );
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      linked++;
    }
  }

  console.log(`\n   ✅ تم ربط ${linked} ورشة متنقلة بنوع "صيانة عامة" وخدمة النوع.`);
  console.log('\n✅ جاهز لاختبار الفلو: npm run test:mobile-workshop-flow\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
