/**
 * تعيين إحداثيات الرياض للوينشات التي لا تملك موقعًا (ضروري لاختبار فلو السحب)
 * التشغيل: node prisma/seed-winches-set-riyadh-location.js
 * أو: npm run prisma:seed:winches-location
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RIYADH_LAT = 24.7136;
const RIYADH_LNG = 46.6753;

async function main() {
  const updated = await prisma.winch.updateMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
      ],
    },
    data: {
      latitude: RIYADH_LAT,
      longitude: RIYADH_LNG,
    },
  });

  console.log(`✅ تم تحديث ${updated.count} ونش بإحداثيات الرياض (${RIYADH_LAT}, ${RIYADH_LNG}).`);
  console.log('   يمكنك تشغيل: npm run test:winch-flow\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
