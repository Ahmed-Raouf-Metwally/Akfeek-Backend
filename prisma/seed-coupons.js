const prisma = require('../src/utils/database/prisma');

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log('🎟️ Seeding coupons for vendors...');

  const vendors = await prisma.vendorProfile.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, vendorType: true, businessName: true },
  });

  if (!vendors.length) {
    console.log('⚠️ No active vendors found. Skipping coupons seed.');
    return;
  }

  let createdOrUpdated = 0;
  for (const v of vendors) {
    const code1 = `${String(v.vendorType).slice(0, 3)}10${v.id.slice(0, 4)}`.toUpperCase();
    const code2 = `${String(v.vendorType).slice(0, 3)}50${v.id.slice(0, 4)}`.toUpperCase();

    await prisma.coupon.upsert({
      where: { vendorId_code: { vendorId: v.id, code: code1 } },
      update: {
        discountType: 'PERCENT',
        discountValue: 10,
        minOrderAmount: 100,
        validFrom: new Date(),
        validUntil: addDays(120),
        maxUses: 300,
        isActive: true,
      },
      create: {
        vendorId: v.id,
        code: code1,
        discountType: 'PERCENT',
        discountValue: 10,
        minOrderAmount: 100,
        validFrom: new Date(),
        validUntil: addDays(120),
        maxUses: 300,
        isActive: true,
      },
    });

    await prisma.coupon.upsert({
      where: { vendorId_code: { vendorId: v.id, code: code2 } },
      update: {
        discountType: 'FIXED',
        discountValue: 50,
        minOrderAmount: 250,
        validFrom: new Date(),
        validUntil: addDays(120),
        maxUses: 200,
        isActive: true,
      },
      create: {
        vendorId: v.id,
        code: code2,
        discountType: 'FIXED',
        discountValue: 50,
        minOrderAmount: 250,
        validFrom: new Date(),
        validUntil: addDays(120),
        maxUses: 200,
        isActive: true,
      },
    });

    createdOrUpdated += 2;
  }

  const total = await prisma.coupon.count();
  console.log(`✅ Coupons seeded/updated: ${createdOrUpdated}, total coupons: ${total}`);
}

main()
  .catch((e) => {
    console.error('❌ seed-coupons failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

