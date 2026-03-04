/**
 * إزالة الورش المعتمدة المرتبطة بفيندورات ليست من نوع "الورش المعتمدة" (CERTIFIED_WORKSHOP)
 * فقط فيندور الورش المعتمدة يجب أن يكون له CertifiedWorkshop
 * التشغيل: node prisma/fix-wrong-workshops.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 جاري البحث عن ورش معتمدة مرتبطة بفيندورات من نوع غير الورش المعتمدة...\n');

  const workshops = await prisma.certifiedWorkshop.findMany({
    where: { vendorId: { not: null } },
    include: { vendor: { select: { vendorType: true, businessNameAr: true } } },
  });

  const wrong = workshops.filter((w) => w.vendor && w.vendor.vendorType !== 'CERTIFIED_WORKSHOP');
  if (wrong.length === 0) {
    console.log('✅ لا توجد ورش معتمدة مرتبطة بفيندورات خاطئة.');
    return;
  }

  console.log(`   عدد الورش الخاطئة (ستُحذف): ${wrong.length}\n`);

  for (const w of wrong) {
    await prisma.certifiedWorkshopService.deleteMany({ where: { workshopId: w.id } });
    await prisma.certifiedWorkshop.delete({ where: { id: w.id } });
    console.log(`   🗑️ حذف ورشة "${w.nameAr || w.name}" (كانت مرتبطة بفيندور ${w.vendor?.vendorType})`);
  }

  console.log(`\n✅ تم حذف ${wrong.length} ورشة معتمدة وخدماتها.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
