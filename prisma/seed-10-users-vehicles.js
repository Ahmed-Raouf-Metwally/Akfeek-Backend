/**
 * إضافة مركبة لكل مستخدم من المستخدمين العشرة (user1@ .. user10@) إذا لم توجد له مركبة
 * التشغيل: node prisma/seed-10-users-vehicles.js
 * أو: npm run prisma:seed:10users-vehicles
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USER_EMAILS = [
  'user1@akfeek.com',
  'user2@akfeek.com',
  'user3@akfeek.com',
  'user4@akfeek.com',
  'user5@akfeek.com',
  'user6@akfeek.com',
  'user7@akfeek.com',
  'user8@akfeek.com',
  'user9@akfeek.com',
  'user10@akfeek.com',
];

async function main() {
  console.log('🚗 إضافة مركبات لمستخدمي user1@ .. user10@ (من لا يملك مركبة)...\n');

  const vehicleModel = await prisma.vehicleModel.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!vehicleModel) {
    console.log('⚠️ لا يوجد موديل مركبة. شغّل الـ seed الرئيسي أولاً.');
    return;
  }

  let added = 0;
  for (let i = 0; i < USER_EMAILS.length; i++) {
    const email = USER_EMAILS[i];
    const user = await prisma.user.findUnique({
      where: { email },
      include: { _count: { select: { vehicles: true } } },
    });
    if (!user) {
      console.log(`   ⏭️ ${email} غير موجود — تخطي`);
      continue;
    }
    if (user._count.vehicles > 0) {
      console.log(`   ✓ ${email} — لديه ${user._count.vehicles} مركبة`);
      continue;
    }

    const vehicle = await prisma.userVehicle.create({
      data: {
        userId: user.id,
        vehicleModelId: vehicleModel.id,
        plateDigits: String(6000 + i + 1),
        plateLettersEn: ['ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQR', 'STU', 'VWX', 'YZA', 'SEJ'][i],
        plateLettersAr: ['أ ب ج', 'د هـ و', 'ز ح ط', 'ي ك ل', 'م ن س', 'ع ف ص', 'ق ر ش', 'ت ث خ', 'ذ ض ظ', 'س ي ج'][i],
        isDefault: true,
      },
    });
    added++;
    console.log(`   ✅ ${email} — مركبة مضافة (لوحة ${vehicle.plateLettersEn} ${vehicle.plateDigits})`);
  }

  console.log(`\n✅ انتهى: تم إضافة ${added} مركبة.`);
}

main()
  .catch((e) => {
    console.error('❌ خطأ:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
