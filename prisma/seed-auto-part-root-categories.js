/**
 * إضافة الفئتين الجذرية لقطع الغيار: قطع غيار سيارات، قطع غيار دراجات نارية
 * يشغّل: node prisma/seed-auto-part-root-categories.js
 * أو: npm run prisma:seed:root-categories
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ROOT_CATEGORIES = [
  {
    name: 'Car Parts',
    nameAr: 'قطع غيار سيارات',
    description: 'Auto parts for cars and light vehicles',
    descriptionAr: 'قطع غيار السيارات والمركبات الخفيفة',
    rootType: 'CAR',
    sortOrder: 1,
  },
  {
    name: 'Motorcycle Parts',
    nameAr: 'قطع غيار دراجات نارية',
    description: 'Auto parts for motorcycles',
    descriptionAr: 'قطع غيار الدراجات النارية',
    rootType: 'MOTORCYCLE',
    sortOrder: 2,
  },
];

async function main() {
  console.log('🔧 إضافة الفئتين الجذرية لقطع الغيار...\n');

  for (const cat of ROOT_CATEGORIES) {
    const existing = await prisma.autoPartCategory.findFirst({
      where: { rootType: cat.rootType },
    });
    if (existing) {
      console.log(`  ⏭️  موجودة مسبقاً: ${cat.nameAr} (${cat.rootType}) — id: ${existing.id}`);
      continue;
    }
    const created = await prisma.autoPartCategory.create({
      data: {
        name: cat.name,
        nameAr: cat.nameAr,
        description: cat.description,
        descriptionAr: cat.descriptionAr,
        rootType: cat.rootType,
        parentId: null,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
    console.log(`  ✅ تم إنشاء: ${cat.nameAr} — id: ${created.id}`);
  }

  console.log('\n---');
  console.log('✅ انتهى. الفئات الجذرية لها الآن معرفات (id) ويمكن ربط الفئات الفرعية بها عبر parentId.');
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
