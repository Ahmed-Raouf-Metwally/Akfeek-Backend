/**
 * Ensures each active VehicleBrand has a fixed set of marketplace auto parts (5 per brand).
 * Idempotent: uses deterministic SKUs; upserts parts and compatibility rows.
 */
const prisma = require('../src/utils/database/prisma');

const PART_TEMPLATES = [
  { key: 'OIL', name: 'Oil filter', nameAr: 'فلتر زيت', price: 45.0 },
  { key: 'AIR', name: 'Air filter', nameAr: 'فلتر هواء', price: 38.5 },
  { key: 'BRK', name: 'Brake pads (front)', nameAr: 'فحمات فرامل أمامية', price: 220.0 },
  { key: 'SPK', name: 'Spark plugs (set)', nameAr: 'بواجي (طقم)', price: 95.0 },
  { key: 'BAT', name: '12V battery', nameAr: 'بطارية 12 فولت', price: 450.0 },
];

async function main() {
  console.log('🔩 Seeding auto parts for every active vehicle brand...');

  const adminUser =
    (await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })) ||
    (await prisma.user.findFirst({ select: { id: true } }));

  if (!adminUser) {
    console.error('❌ No user found (need at least one user for createdByUserId).');
    process.exit(1);
  }

  const category =
    (await prisma.autoPartCategory.findFirst({
      where: { isActive: true, rootType: 'CAR' },
      select: { id: true },
    })) ||
    (await prisma.autoPartCategory.findFirst({
      where: { isActive: true },
      select: { id: true },
    }));

  if (!category) {
    console.error('❌ No AutoPartCategory found. Run auto part category seed first.');
    process.exit(1);
  }

  const partsVendor = await prisma.vendorProfile.findFirst({
    where: { vendorType: 'AUTO_PARTS', status: 'ACTIVE' },
    select: { id: true },
  });

  const brands = await prisma.vehicleBrand.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      nameAr: true,
      models: {
        where: { isActive: true },
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (!brands.length) {
    console.log('⚠️ No active vehicle brands. Skipping auto parts by brand.');
    return;
  }

  let created = 0;
  let updated = 0;
  let compatAdded = 0;

  for (const brand of brands) {
    const prefix = brand.id.replace(/-/g, '').slice(0, 12).toUpperCase();
    const modelIds = brand.models.map((m) => m.id);

    for (const t of PART_TEMPLATES) {
      const sku = `AKF-BR-${prefix}-${t.key}`;
      const displayName = `${brand.name} — ${t.name}`;
      const displayNameAr = `${brand.nameAr || brand.name} — ${t.nameAr}`;

      const existing = await prisma.autoPart.findUnique({
        where: { sku },
        select: { id: true },
      });

      const part = await prisma.autoPart.upsert({
        where: { sku },
        create: {
          sku,
          name: displayName,
          nameAr: displayNameAr,
          description: `Seed part compatible with ${brand.name} vehicles.`,
          descriptionAr: `قطعة تجريبية متوافقة مع مركبات ${brand.nameAr || brand.name}.`,
          vendorId: partsVendor?.id ?? null,
          createdByUserId: adminUser.id,
          categoryId: category.id,
          brand: brand.name,
          partNumber: `${t.key}-${prefix}`,
          oemNumber: null,
          price: t.price,
          compareAtPrice: t.price * 1.12,
          stockQuantity: 80,
          lowStockThreshold: 10,
          isActive: true,
          isFeatured: false,
          isApproved: true,
          approvedAt: new Date(),
          images: {
            create: [
              {
                url: `/uploads/parts/seed/${t.key.toLowerCase()}-placeholder.webp`,
                altText: displayName,
                sortOrder: 0,
                isPrimary: true,
              },
            ],
          },
        },
        update: {
          name: displayName,
          nameAr: displayNameAr,
          brand: brand.name,
          categoryId: category.id,
          vendorId: partsVendor?.id ?? undefined,
          price: t.price,
          isActive: true,
          isApproved: true,
          approvedAt: new Date(),
        },
      });

      if (existing) updated += 1;
      else created += 1;

      for (const vehicleModelId of modelIds) {
        await prisma.autoPartCompatibility.upsert({
          where: {
            partId_vehicleModelId: { partId: part.id, vehicleModelId },
          },
          update: {},
          create: {
            partId: part.id,
            vehicleModelId,
            fitmentType: 'OEM_STYLE',
            notes: 'Seed fitment',
          },
        });
        compatAdded += 1;
      }
    }
  }

  const totalParts = await prisma.autoPart.count();
  console.log(
    `✅ Auto parts by brand: +${created} created, ${updated} updated, compatibility upserts ${compatAdded}, total AutoPart rows: ${totalParts}`
  );
}

main()
  .catch((e) => {
    console.error('❌ seed-auto-parts-by-brand failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
