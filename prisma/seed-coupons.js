const prisma = require('../src/utils/database/prisma');

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function couponTemplates(vendor) {
  const key = String(vendor.vendorType || 'VENDOR').replace(/[^A-Z]/g, '').slice(0, 4) || 'VNDR';
  const id4 = vendor.id.slice(0, 4).toUpperCase();
  return [
    {
      code: `${key}NEW${id4}`, // New-customer style coupon
      discountType: 'PERCENT',
      discountValue: 10,
      minOrderAmount: 100,
      maxUses: 300,
      validDays: 120,
    },
    {
      code: `${key}SAVE${id4}`, // Normal seasonal coupon
      discountType: 'PERCENT',
      discountValue: 15,
      minOrderAmount: 200,
      maxUses: 200,
      validDays: 90,
    },
    {
      code: `${key}FIX${id4}`, // Fixed value coupon
      discountType: 'FIXED',
      discountValue: 50,
      minOrderAmount: 300,
      maxUses: 150,
      validDays: 75,
    },
  ];
}

async function main() {
  console.log('🎟️ Seeding vendor-specific coupons...');

  const vendors = await prisma.vendorProfile.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, vendorType: true, businessName: true, businessNameAr: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!vendors.length) {
    console.log('⚠️ No active vendors found. Skipping coupons seed.');
    return;
  }

  let upserts = 0;
  for (const v of vendors) {
    const templates = couponTemplates(v);
    for (const tpl of templates) {
      await prisma.coupon.upsert({
        where: { vendorId_code: { vendorId: v.id, code: tpl.code } },
        update: {
          discountType: tpl.discountType,
          discountValue: tpl.discountValue,
          minOrderAmount: tpl.minOrderAmount,
          validFrom: new Date(),
          validUntil: addDays(tpl.validDays),
          maxUses: tpl.maxUses,
          isActive: true,
        },
        create: {
          vendorId: v.id,
          code: tpl.code,
          discountType: tpl.discountType,
          discountValue: tpl.discountValue,
          minOrderAmount: tpl.minOrderAmount,
          validFrom: new Date(),
          validUntil: addDays(tpl.validDays),
          maxUses: tpl.maxUses,
          isActive: true,
        },
      });
      upserts += 1;
    }

    const vendorLabel = v.businessNameAr || v.businessName || v.id.slice(0, 8);
    console.log(`   ✅ ${vendorLabel} (${v.vendorType}): ${templates.map((t) => t.code).join(', ')}`);
  }

  const total = await prisma.coupon.count();
  console.log(`\n✅ Coupons seeded/updated: ${upserts}, total coupons: ${total}`);
}

main()
  .catch((e) => {
    console.error('❌ seed-coupons failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

