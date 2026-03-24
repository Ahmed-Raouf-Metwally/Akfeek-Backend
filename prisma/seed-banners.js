const prisma = require('../src/utils/database/prisma');

async function main() {
  console.log('🖼️ Seeding banners (TOP/BOTTOM)...');

  // صور ثابتة من placehold.co (PNG مباشر — غالباً أوثق من picsum على الموبايل)
  // روابط تجربة: example.com فقط
  const seeds = [
    {
      position: 'TOP',
      title: 'Top Banner 1',
      titleAr: 'بنر علوي 1',
      sortOrder: 0,
      images: [
        {
          imageUrl: 'https://placehold.co/1200x360/4f46e5/ffffff/png?text=Akfeek+Top+1',
          linkUrl: 'https://example.com/?src=banner-top-1a',
          sortOrder: 0,
        },
      ],
    },
    {
      position: 'TOP',
      title: 'Top Banner 2',
      titleAr: 'بنر علوي 2',
      sortOrder: 1,
      images: [
        {
          imageUrl: 'https://placehold.co/1200x360/059669/ffffff/png?text=Akfeek+Top+2',
          linkUrl: 'https://example.com/?src=banner-top-2',
          sortOrder: 0,
        },
      ],
    },
    {
      position: 'BOTTOM',
      title: 'Bottom Banner 1',
      titleAr: 'بنر سفلي 1',
      sortOrder: 0,
      images: [
        {
          imageUrl: 'https://placehold.co/1200x360/7c3aed/ffffff/png?text=Akfeek+Bottom+A',
          linkUrl: 'https://example.com/?src=banner-bottom-1a',
          sortOrder: 0,
        },
        {
          imageUrl: 'https://placehold.co/1200x360/b45309/ffffff/png?text=Akfeek+Bottom+B',
          linkUrl: 'https://example.com/?src=banner-bottom-1b',
          sortOrder: 1,
        },
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

