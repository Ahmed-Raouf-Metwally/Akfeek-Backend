const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resolveSeedPhone(email, desiredPhone) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { phone: true },
  });
  if (existingUser?.phone) return existingUser.phone;

  let candidate = desiredPhone;
  let counter = 0;

  while (true) {
    const owner = await prisma.user.findFirst({
      where: { phone: candidate },
      select: { email: true },
    });
    if (!owner || owner.email === email) return candidate;

    counter += 1;
    const suffix = String(counter).padStart(2, '0');
    candidate = `${desiredPhone}${suffix}`;
  }
}

async function main() {
  const email = 'admin@akfeek.com';
  const password = 'admin123';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      preferredLanguage: 'AR',
    },
  });

  console.log('✅ Seeded admin user:', {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    status: admin.status
  });

  // Seed Mobile Workshop static catalog items (design-locked 7 keys)
  const mobileWorkshopCatalog = [
    { key: 'BATTERY', nameAr: 'بطارية', priceMin: 100, priceMax: 150, sortOrder: 1 },
    { key: 'TIRE_SERVICE', nameAr: 'إطار / بنشر', priceMin: 100, priceMax: 150, sortOrder: 2 },
    { key: 'ENGINE_OIL', nameAr: 'زيت المحرك', priceMin: 100, priceMax: 150, sortOrder: 3 },
    { key: 'ELECTRICAL', nameAr: 'كهرباء', priceMin: 100, priceMax: 150, sortOrder: 4 },
    { key: 'ENGINE_PROBLEMS', nameAr: 'مشاكل المحرك', priceMin: 100, priceMax: 150, sortOrder: 5 },
    { key: 'MAINTENANCE', nameAr: 'صيانة', priceMin: 100, priceMax: 150, sortOrder: 6 },
    { key: 'OTHER_ISSUE', nameAr: 'مشكلة أخرى', pricingNoteAr: 'حسب الفحص', priceMin: null, priceMax: null, sortOrder: 7 },
  ];

  for (const item of mobileWorkshopCatalog) {
    await prisma.mobileWorkshopCatalogItem.upsert({
      where: { key: item.key },
      update: {
        nameAr: item.nameAr,
        pricingNoteAr: item.pricingNoteAr || null,
        priceMin: item.priceMin,
        priceMax: item.priceMax,
        currency: 'SAR',
        sortOrder: item.sortOrder,
        isActive: true,
        imageUrl: null,
      },
      create: {
        key: item.key,
        nameAr: item.nameAr,
        pricingNoteAr: item.pricingNoteAr || null,
        priceMin: item.priceMin,
        priceMax: item.priceMax,
        currency: 'SAR',
        sortOrder: item.sortOrder,
        isActive: true,
        imageUrl: null,
      },
    });
  }
  console.log('✅ Seeded mobile workshop static catalog items');

  // Seed Mobile Workshop hierarchical catalog (Catalogs -> Categories -> Services)
  const mwCatalogName = 'Mobile Workshop';
  const mwCatalogNameAr = 'الورشة المتنقلة';

  const existingMwCatalog = await prisma.mobileWorkshopCatalog.findFirst({
    where: { name: mwCatalogName },
  });

  const mwCatalog = existingMwCatalog
    ? await prisma.mobileWorkshopCatalog.update({
        where: { id: existingMwCatalog.id },
        data: {
          nameAr: mwCatalogNameAr,
          imageUrl: null,
          sortOrder: 1,
          isActive: true,
        },
      })
    : await prisma.mobileWorkshopCatalog.create({
        data: {
          name: mwCatalogName,
          nameAr: mwCatalogNameAr,
          imageUrl: null,
          sortOrder: 1,
          isActive: true,
        },
      });

  const mwHierarchy = [
    { name: 'Battery', nameAr: 'بطارية', price: 120, sortOrder: 1 },
    { name: 'Tire service', nameAr: 'إطار / بنشر', price: 110, sortOrder: 2 },
    { name: 'Engine oil', nameAr: 'زيت المحرك', price: 130, sortOrder: 3 },
    { name: 'Electrical', nameAr: 'كهرباء', price: 140, sortOrder: 4 },
    { name: 'Engine problems', nameAr: 'مشاكل المحرك', price: 150, sortOrder: 5 },
    { name: 'Maintenance', nameAr: 'صيانة', price: 125, sortOrder: 6 },
    { name: 'Other issue', nameAr: 'مشكلة أخرى', price: null, pricingNoteAr: 'حسب الفحص', sortOrder: 7 },
  ];

  for (const item of mwHierarchy) {
    const existingCategory = await prisma.mobileWorkshopCategory.findFirst({
      where: { catalogId: mwCatalog.id, name: item.name },
    });

    const category = existingCategory
      ? await prisma.mobileWorkshopCategory.update({
          where: { id: existingCategory.id },
          data: {
            nameAr: item.nameAr,
            imageUrl: null,
            sortOrder: item.sortOrder,
            isActive: true,
          },
        })
      : await prisma.mobileWorkshopCategory.create({
          data: {
            catalogId: mwCatalog.id,
            name: item.name,
            nameAr: item.nameAr,
            imageUrl: null,
            sortOrder: item.sortOrder,
            isActive: true,
          },
        });

    const existingService = await prisma.mobileWorkshopCatalogService.findFirst({
      where: { categoryId: category.id, name: item.name },
    });

    if (existingService) {
      await prisma.mobileWorkshopCatalogService.update({
        where: { id: existingService.id },
        data: {
          nameAr: item.nameAr,
          imageUrl: null,
          priceMin: item.price,
          priceMax: item.price,
          currency: 'SAR',
          pricingNoteAr: item.pricingNoteAr || null,
          sortOrder: item.sortOrder,
          isActive: true,
        },
      });
    } else {
      await prisma.mobileWorkshopCatalogService.create({
        data: {
          categoryId: category.id,
          name: item.name,
          nameAr: item.nameAr,
          imageUrl: null,
          priceMin: item.price,
          priceMax: item.price,
          currency: 'SAR',
          pricingNoteAr: item.pricingNoteAr || null,
          sortOrder: item.sortOrder,
          isActive: true,
        },
      });
    }
  }

  console.log('✅ Seeded mobile workshop hierarchical catalog (catalogs/categories/services)');

  const createdCatalogItems = {};
  for (const item of mobileWorkshopCatalog) {
    const catalogItem = await prisma.mobileWorkshopCatalogItem.findUnique({
      where: { key: item.key },
      select: { id: true },
    });
    createdCatalogItems[item.key] = catalogItem;
  }

  const mobileWorkshopVendors = [
    {
      email: 'mobilevendor1@akfeek.com',
      phone: '+966700000001',
      firstName: 'ورشة',
      lastName: 'الشمال',
      businessName: 'الورشة المتنقلة - الشمال',
      businessNameAr: 'الورشة المتنقلة - الشمال',
      workshopName: 'Toyota Van Unit North',
      workshopNameAr: 'وحدة تويوتا - الشمال',
      type: 'Van',
      model: 'Toyota Hiace',
      year: 2023,
      plate: 'م و 101',
      latitude: 24.774265,
      longitude: 46.738586,
    },
    {
      email: 'mobilevendor2@akfeek.com',
      phone: '+966700000002',
      firstName: 'ورشة',
      lastName: 'الوسط',
      businessName: 'الورشة المتنقلة - الوسط',
      businessNameAr: 'الورشة المتنقلة - الوسط',
      workshopName: 'Toyota Van Unit Center',
      workshopNameAr: 'وحدة تويوتا - الوسط',
      type: 'Van',
      model: 'Toyota Hiace',
      year: 2024,
      plate: 'م و 102',
      latitude: 24.7136,
      longitude: 46.6753,
    },
    {
      email: 'mobilevendor3@akfeek.com',
      phone: '+966700000003',
      firstName: 'ورشة',
      lastName: 'الجنوب',
      businessName: 'الورشة المتنقلة - الجنوب',
      businessNameAr: 'الورشة المتنقلة - الجنوب',
      workshopName: 'Toyota Van Unit South',
      workshopNameAr: 'وحدة تويوتا - الجنوب',
      type: 'Van',
      model: 'Toyota Hiace',
      year: 2022,
      plate: 'م و 103',
      latitude: 24.6037,
      longitude: 46.7219,
    },
  ];

  for (const vendorSeed of mobileWorkshopVendors) {
    const resolvedPhone = await resolveSeedPhone(vendorSeed.email, vendorSeed.phone);

    const mobileWorkshopVendorUser = await prisma.user.upsert({
      where: { email: vendorSeed.email },
      update: {
        passwordHash,
        role: 'VENDOR',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        phone: resolvedPhone,
        preferredLanguage: 'AR',
      },
      create: {
        email: vendorSeed.email,
        passwordHash,
        role: 'VENDOR',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        phone: resolvedPhone,
        preferredLanguage: 'AR',
        profile: {
          create: {
            firstName: vendorSeed.firstName,
            lastName: vendorSeed.lastName,
          },
        },
      },
    });

    const existingProfile = await prisma.profile.findUnique({
      where: { userId: mobileWorkshopVendorUser.id },
      select: { id: true },
    });
    if (existingProfile) {
      await prisma.profile.update({
        where: { userId: mobileWorkshopVendorUser.id },
        data: {
          firstName: vendorSeed.firstName,
          lastName: vendorSeed.lastName,
        },
      });
    }

    const mobileWorkshopProfile = await prisma.vendorProfile.upsert({
      where: { userId: mobileWorkshopVendorUser.id },
      update: {
        vendorType: 'MOBILE_WORKSHOP',
        businessName: vendorSeed.businessName,
        businessNameAr: vendorSeed.businessNameAr,
        description: 'خدمات صيانة متنقلة',
        contactPhone: resolvedPhone,
        contactEmail: vendorSeed.email,
        city: 'الرياض',
        country: 'السعودية',
        address: 'الرياض',
        status: 'ACTIVE',
        isVerified: true,
        averageRating: 4.8,
        totalReviews: 15,
      },
      create: {
        userId: mobileWorkshopVendorUser.id,
        vendorType: 'MOBILE_WORKSHOP',
        businessName: vendorSeed.businessName,
        businessNameAr: vendorSeed.businessNameAr,
        description: 'خدمات صيانة متنقلة',
        contactPhone: resolvedPhone,
        contactEmail: vendorSeed.email,
        city: 'الرياض',
        country: 'السعودية',
        address: 'الرياض',
        status: 'ACTIVE',
        isVerified: true,
        averageRating: 4.8,
        totalReviews: 15,
      },
    });

    await prisma.mobileWorkshop.upsert({
      where: { vendorId: mobileWorkshopProfile.id },
      update: {
        name: vendorSeed.workshopName,
        nameAr: vendorSeed.workshopNameAr,
        vehicleType: vendorSeed.type,
        vehicleModel: vendorSeed.model,
        year: vendorSeed.year,
        plateNumber: vendorSeed.plate,
        city: 'الرياض',
        latitude: vendorSeed.latitude,
        longitude: vendorSeed.longitude,
        serviceRadius: 30,
        basePrice: 100,
        pricePerKm: 2,
        minPrice: 100,
        isAvailable: true,
        isActive: true,
        isVerified: true,
        catalogItemId: createdCatalogItems.BATTERY?.id || null,
      },
      create: {
        name: vendorSeed.workshopName,
        nameAr: vendorSeed.workshopNameAr,
        vendorId: mobileWorkshopProfile.id,
        vehicleType: vendorSeed.type,
        vehicleModel: vendorSeed.model,
        year: vendorSeed.year,
        plateNumber: vendorSeed.plate,
        city: 'الرياض',
        latitude: vendorSeed.latitude,
        longitude: vendorSeed.longitude,
        serviceRadius: 30,
        basePrice: 100,
        pricePerKm: 2,
        minPrice: 100,
        isAvailable: true,
        isActive: true,
        isVerified: true,
        catalogItemId: createdCatalogItems.BATTERY?.id || null,
      },
    });
  }

  // System settings (Towing pricing & timing defaults for admin dashboard)
  const towingSettings = [
    {
      key: 'TOWING_BASE_PRICE',
      category: 'TOWING',
      type: 'NUMBER',
      value: 100,
      description: 'Base towing price (SAR) added on every request',
      descriptionAr: 'السعر الأساسي (ر.س) يضاف على كل طلب',
      isEditable: true,
    },
    {
      key: 'TOWING_PRICE_PER_KM',
      category: 'TOWING',
      type: 'NUMBER',
      value: 2,
      description: 'Towing price per kilometer (SAR/km)',
      descriptionAr: 'سعر الكيلومتر (ر.س/كم) يضاف لكل كيلومتر',
      isEditable: true,
    },
    {
      key: 'TOWING_MIN_PRICE',
      category: 'TOWING',
      type: 'NUMBER',
      value: 100,
      description: 'Minimum final towing price (SAR) for a trip',
      descriptionAr: 'الحد الأدنى (ر.س) أقل سعر للرحلة',
      isEditable: true,
    },
    {
      key: 'TOWING_MINUTES_PER_KM',
      category: 'TOWING',
      type: 'NUMBER',
      value: 1,
      description: 'Estimated time in minutes per kilometer for customer (minutes/km)',
      descriptionAr: 'الوقت التقديري بالدقائق لكل كيلومتر قبل استقبال عروض الوينش',
      isEditable: true,
    },
    {
      key: 'TOWING_ADDITIONAL_MINUTES',
      category: 'TOWING',
      type: 'NUMBER',
      value: 0,
      description: 'Additional fixed minutes added to total estimated time',
      descriptionAr: 'وقت إضافي ثابت يضاف للوقت الكلي المقدر',
      isEditable: true,
    },
  ];

  for (const s of towingSettings) {
    await prisma.systemSettings.upsert({
      where: { key: s.key },
      update: {
        category: s.category,
        type: s.type,
        isEditable: s.isEditable,
        description: s.description,
        descriptionAr: s.descriptionAr,
      },
      create: {
        key: s.key,
        value: String(s.value),
        type: s.type,
        category: s.category,
        isEditable: s.isEditable,
        description: s.description,
        descriptionAr: s.descriptionAr,
      },
    });
  }

  console.log('✅ Seeded 3 mobile workshop vendors with current locations');

  // About Us (من نحن) — single page + default core values if missing
  const existingAbout = await prisma.aboutUsPage.findFirst({ select: { id: true } });
  if (!existingAbout) {
    await prisma.aboutUsPage.create({
      data: {
        brandNameEn: 'Akfeek',
        brandNameAr: 'أكفيك',
        introHeadingAr: 'نقدم صيانة و قطع غيار بثقة و سهولة',
        introHeadingEn: 'Maintenance and spare parts with trust and ease',
        introBodyAr:
          'أكفيك منصة سعودية تربطك بخدمات السيارات والصيانة وقطع الغيار الموثوقة، بخطوات بسيطة وأسعار واضحة.',
        introBodyEn:
          'Akfeek is a Saudi platform connecting you with trusted car services, maintenance, and spare parts — simple steps and transparent pricing.',
        valuesSectionTitleAr: 'القيم الأساسية',
        valuesSectionTitleEn: 'Core values',
        coreValues: {
          create: [
            {
              sortOrder: 0,
              titleAr: 'الثقة و الشفافية',
              titleEn: 'Trust and transparency',
              descriptionAr: 'نلتزم بالوضوح في السعر والخدمة وبناء علاقة طويلة مع عملائنا.',
              descriptionEn: 'Clear pricing, honest service, and lasting customer relationships.',
              iconKey: 'check_badge',
            },
            {
              sortOrder: 1,
              titleAr: 'راحة و تجربة مميزة',
              titleEn: 'Comfort and a distinctive experience',
              descriptionAr: 'من الطلب وحتى إتمام الخدمة، نوفّر لك تجربة سلسة ومريحة.',
              descriptionEn: 'A smooth, comfortable journey from booking to completion.',
              iconKey: 'sparkles',
            },
          ],
        },
      },
    });
    console.log('✅ Seeded About Us page (من نحن) with default core values');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });