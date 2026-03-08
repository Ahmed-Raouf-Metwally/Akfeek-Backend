/**
 * إنشاء خدمة "Mobile Car Wash" (نوع EMERGENCY) إن لم تكن موجودة — مطلوبة لفلو غسيل السيارة (طلب → عروض → قبول).
 * Run: node prisma/seed-carwash-service.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  let service = await prisma.service.findFirst({
    where: { name: 'Mobile Car Wash', type: 'EMERGENCY' },
  });
  if (!service) {
    service = await prisma.service.create({
      data: {
        name: 'Mobile Car Wash',
        nameAr: 'غسيل سيارة متنقل',
        description: 'Mobile car wash at your location',
        descriptionAr: 'غسيل السيارة في موقعك',
        type: 'EMERGENCY',
        category: 'CLEANING',
        estimatedDuration: 45,
        isActive: true,
        requiresVehicle: true,
      },
    });
    console.log('✅ Created service: Mobile Car Wash (EMERGENCY)');
  } else {
    console.log('✅ Service "Mobile Car Wash" already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
