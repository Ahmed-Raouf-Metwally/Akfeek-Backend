const prisma = require('../src/utils/database/prisma');

async function main() {
  console.log('🖼️ Seeding banners (TOP/BOTTOM)...');

  const seeds = [
    {
      position: 'TOP',
      title: 'Top Banner 1',
      titleAr: 'بنر علوي 1',
      sortOrder: 0,
      images: [
        { imageUrl: '/uploads/banners/seed/top-1-a.jpg', linkUrl: 'https://akfeek.com/top-1-a', sortOrder: 0 },
        { imageUrl: '/uploads/banners/seed/top-1-b.jpg', linkUrl: 'https://akfeek.com/top-1-b', sortOrder: 1 },
      ],
    },
    {
      position: 'TOP',
      title: 'Top Banner 2',
      titleAr: 'بنر علوي 2',
      sortOrder: 1,
      images: [
        { imageUrl: '/uploads/banners/seed/top-2-a.jpg', linkUrl: 'https://akfeek.com/top-2-a', sortOrder: 0 },
      ],
    },
    {
      position: 'BOTTOM',
      title: 'Bottom Banner 1',
      titleAr: 'بنر سفلي 1',
      sortOrder: 0,
      images: [
        { imageUrl: '/uploads/banners/seed/bottom-1-a.jpg', linkUrl: 'https://akfeek.com/bottom-1-a', sortOrder: 0 },
        { imageUrl: '/uploads/banners/seed/bottom-1-b.jpg', linkUrl: 'https://akfeek.com/bottom-1-b', sortOrder: 1 },
      ],
    },
  ];

  for (const item of seeds) {
    const banner = await prisma.banner.upsert({
      where: {
        id: `${item.position}-${item.sortOrder}`.toLowerCase(),
      },
      update: {
        position: item.position,
        title: item.title,
        titleAr: item.titleAr,
        isActive: true,
        sortOrder: item.sortOrder,
      },
      create: {
        id: `${item.position}-${item.sortOrder}`.toLowerCase(),
        position: item.position,
        title: item.title,
        titleAr: item.titleAr,
        isActive: true,
        sortOrder: item.sortOrder,
      },
    });

    await prisma.bannerImage.deleteMany({ where: { bannerId: banner.id } });
    if (item.images.length) {
      await prisma.bannerImage.createMany({
        data: item.images.map((img) => ({
          bannerId: banner.id,
          imageUrl: img.imageUrl,
          linkUrl: img.linkUrl,
          sortOrder: img.sortOrder,
        })),
      });
    }
  }

  const count = await prisma.banner.count();
  console.log(`✅ Seeded banners. Total banners: ${count}`);
}

main()
  .catch((e) => {
    console.error('❌ seed-banners failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

