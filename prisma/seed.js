const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // ============================================
  // 0. Admin user & roles (إدارة الصلاحيات)
  // ============================================
  console.log('👤 Seeding Admin user...');
  const adminPassword = 'Admin123!';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: 'admin@akfeek.com' },
    update: {},
    create: {
      email: 'admin@akfeek.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      profile: {
        create: { firstName: 'Admin', lastName: 'User' }
      }
    }
  });
  console.log('✅ Admin user: admin@akfeek.com / Admin123!\n');

  // ============================================
  // 1. Vehicle Brands & Models (كتالوج المركبات)
  // ============================================
  console.log('📦 Seeding Vehicle Brands & Models...');

  // Map legacy size to Prisma VehicleType enum
  const sizeToVehicleType = {
    SMALL: 'SEDAN',
    MEDIUM: 'CROSSOVER',
    LARGE: 'SUV',
    EXTRA_LARGE: 'TRUCK'
  };

  const vehicleData = [
    { make: 'Toyota', model: 'Camry', year: 2023, size: 'MEDIUM' },
    { make: 'Toyota', model: 'Camry', year: 2022, size: 'MEDIUM' },
    { make: 'Toyota', model: 'Corolla', year: 2023, size: 'SMALL' },
    { make: 'Toyota', model: 'Corolla', year: 2022, size: 'SMALL' },
    { make: 'Toyota', model: 'Land Cruiser', year: 2023, size: 'LARGE' },
    { make: 'Toyota', model: 'Hilux', year: 2023, size: 'LARGE' },
    { make: 'Toyota', model: 'RAV4', year: 2023, size: 'MEDIUM' },
    { make: 'Honda', model: 'Accord', year: 2023, size: 'MEDIUM' },
    { make: 'Honda', model: 'Civic', year: 2023, size: 'SMALL' },
    { make: 'Honda', model: 'CR-V', year: 2023, size: 'MEDIUM' },
    { make: 'Honda', model: 'Pilot', year: 2023, size: 'LARGE' },
    { make: 'BMW', model: 'X5', year: 2023, size: 'LARGE' },
    { make: 'BMW', model: 'X3', year: 2023, size: 'MEDIUM' },
    { make: 'BMW', model: '3 Series', year: 2023, size: 'MEDIUM' },
    { make: 'BMW', model: '5 Series', year: 2023, size: 'MEDIUM' },
    { make: 'BMW', model: '7 Series', year: 2023, size: 'LARGE' },
    { make: 'Mercedes-Benz', model: 'C-Class', year: 2023, size: 'MEDIUM' },
    { make: 'Mercedes-Benz', model: 'E-Class', year: 2023, size: 'MEDIUM' },
    { make: 'Mercedes-Benz', model: 'S-Class', year: 2023, size: 'LARGE' },
    { make: 'Mercedes-Benz', model: 'GLE', year: 2023, size: 'LARGE' },
    { make: 'Mercedes-Benz', model: 'GLC', year: 2023, size: 'MEDIUM' },
    { make: 'Nissan', model: 'Altima', year: 2023, size: 'MEDIUM' },
    { make: 'Nissan', model: 'Maxima', year: 2023, size: 'MEDIUM' },
    { make: 'Nissan', model: 'Patrol', year: 2023, size: 'LARGE' },
    { make: 'Nissan', model: 'X-Trail', year: 2023, size: 'MEDIUM' },
    { make: 'Hyundai', model: 'Elantra', year: 2023, size: 'SMALL' },
    { make: 'Hyundai', model: 'Sonata', year: 2023, size: 'MEDIUM' },
    { make: 'Hyundai', model: 'Tucson', year: 2023, size: 'MEDIUM' },
    { make: 'Hyundai', model: 'Santa Fe', year: 2023, size: 'LARGE' },
    { make: 'Kia', model: 'Optima', year: 2023, size: 'MEDIUM' },
    { make: 'Kia', model: 'Sportage', year: 2023, size: 'MEDIUM' },
    { make: 'Kia', model: 'Sorento', year: 2023, size: 'LARGE' },
    { make: 'Ford', model: 'Explorer', year: 2023, size: 'LARGE' },
    { make: 'Ford', model: 'Expedition', year: 2023, size: 'LARGE' },
    { make: 'Ford', model: 'Edge', year: 2023, size: 'MEDIUM' },
    { make: 'Chevrolet', model: 'Tahoe', year: 2023, size: 'LARGE' },
    { make: 'Chevrolet', model: 'Suburban', year: 2023, size: 'EXTRA_LARGE' },
    { make: 'Chevrolet', model: 'Traverse', year: 2023, size: 'LARGE' },
    { make: 'GMC', model: 'Yukon', year: 2023, size: 'LARGE' },
    { make: 'GMC', model: 'Acadia', year: 2023, size: 'MEDIUM' },
  ];

  const brandNames = [...new Set(vehicleData.map((v) => v.make))];
  const brandIdByName = {};

  for (const name of brandNames) {
    const brand = await prisma.vehicleBrand.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    brandIdByName[name] = brand.id;
  }

  for (const v of vehicleData) {
    await prisma.vehicleModel.upsert({
      where: {
        brandId_name_year: {
          brandId: brandIdByName[v.make],
          name: v.model,
          year: v.year
        }
      },
      update: {},
      create: {
        brandId: brandIdByName[v.make],
        name: v.model,
        year: v.year,
        type: sizeToVehicleType[v.size] || 'SEDAN'
      }
    });
  }

  console.log(`✅ Created ${brandNames.length} brands, ${vehicleData.length} vehicle models\n`);

  // ============================================
  // 2. Services (الخدمات)
  // ============================================
  console.log('🔧 Seeding Services...');
  
  const services = [
    // CLEANING Services
    {
      name: 'Basic Car Wash',
      nameAr: 'غسيل سيارة أساسي',
      description: 'Exterior wash and interior vacuum',
      descriptionAr: 'غسيل خارجي وشفط الداخل',
      type: 'FIXED',
      category: 'CLEANING',
      estimatedDuration: 30
    },
    {
      name: 'Premium Car Wash',
      nameAr: 'غسيل سيارة متميز',
      description: 'Full wash, wax, and interior detailing',
      descriptionAr: 'غسيل كامل، تلميع، وتنظيف داخلي شامل',
      type: 'FIXED',
      category: 'CLEANING',
      estimatedDuration: 90
    },
    {
      name: 'Polishing & Waxing',
      nameAr: 'تلميع وشمع',
      description: 'Professional polishing and wax coating',
      descriptionAr: 'تلميع احترافي وطبقة شمع',
      type: 'FIXED',
      category: 'CLEANING',
      estimatedDuration: 120
    },
    
    // MAINTENANCE Services
    {
      name: 'Oil Change',
      nameAr: 'تغيير الزيت',
      description: 'Engine oil and filter replacement',
      descriptionAr: 'تغيير زيت المحرك والفلتر',
      type: 'CATALOG',
      category: 'MAINTENANCE',
      estimatedDuration: 45
    },
    {
      name: 'Brake Service',
      nameAr: 'خدمة الفرامل',
      description: 'Brake inspection and pad replacement',
      descriptionAr: 'فحص الفرامل وتغيير الفحمات',
      type: 'CATALOG',
      category: 'MAINTENANCE',
      estimatedDuration: 90
    },
    {
      name: 'Tire Rotation',
      nameAr: 'تدوير الإطارات',
      description: 'Professional tire rotation and balancing',
      descriptionAr: 'تدوير وموازنة الإطارات احترافياً',
      type: 'FIXED',
      category: 'MAINTENANCE',
      estimatedDuration: 60
    },
    {
      name: 'Battery Replacement',
      nameAr: 'تغيير البطارية',
      description: 'Old battery removal and new installation',
      descriptionAr: 'إزالة البطارية القديمة وتركيب جديدة',
      type: 'CATALOG',
      category: 'MAINTENANCE',
      estimatedDuration: 30
    },
    
    // REPAIR Services
    {
      name: 'Engine Repair',
      nameAr: 'إصلاح المحرك',
      description: 'Complete engine diagnostic and repair',
      descriptionAr: 'فحص وإصلاح المحرك الكامل',
      type: 'CATALOG',
      category: 'REPAIR',
      estimatedDuration: 240
    },
    {
      name: 'Transmission Repair',
      nameAr: 'إصلاح ناقل الحركة',
      description: 'Transmission diagnostic and repair',
      descriptionAr: 'فحص وإصلاح ناقل الحركة',
      type: 'CATALOG',
      category: 'REPAIR',
      estimatedDuration: 300
    },
    {
      name: 'AC Repair',
      nameAr: 'إصلاح المكيف',
      description: 'Air conditioning system repair and recharge',
      descriptionAr: 'إصلاح نظام التكييف وإعادة الشحن',
      type: 'CATALOG',
      category: 'REPAIR',
      estimatedDuration: 120
    },
    
    // EMERGENCY Services
    {
      name: 'Roadside Assistance',
      nameAr: 'مساعدة على الطريق',
      description: 'On-location emergency assistance',
      descriptionAr: 'مساعدة طارئة في الموقع',
      type: 'EMERGENCY',
      category: 'EMERGENCY',
      estimatedDuration: 60
    },
    {
      name: 'Towing Service',
      nameAr: 'خدمة السحب',
      description: 'Vehicle towing to workshop',
      descriptionAr: 'سحب المركبة إلى الورشة',
      type: 'EMERGENCY',
      category: 'EMERGENCY',
      estimatedDuration: 45
    },
    {
      name: 'Battery Jump Start',
      nameAr: 'تشغيل البطارية',
      description: 'Emergency battery jump start',
      descriptionAr: 'تشغيل البطارية الطارئ',
      type: 'EMERGENCY',
      category: 'EMERGENCY',
      estimatedDuration: 20
    },
    
    // INSPECTION Services
    {
      name: 'Ekfik Full Inspection',
      nameAr: 'فحص أكفيك الكامل',
      description: 'Comprehensive vehicle inspection with valet service',
      descriptionAr: 'فحص شامل للمركبة مع خدمة الڤاليه',
      type: 'INSPECTION',
      category: 'INSPECTION',
      estimatedDuration: 180
    },
    {
      name: 'Pre-Purchase Inspection',
      nameAr: 'فحص قبل الشراء',
      description: 'Complete inspection before buying',
      descriptionAr: 'فحص كامل قبل الشراء',
      type: 'INSPECTION',
      category: 'INSPECTION',
      estimatedDuration: 120
    }
  ];

  let servicesCreated = 0;
  for (const service of services) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name, category: service.category }
    });
    if (!existing) {
      await prisma.service.create({ data: service });
      servicesCreated++;
    }
  }
  console.log(`✅ Services: ${servicesCreated} new, ${services.length} total in seed\n`);

  // ============================================
  // 3. Service Pricing (الأسعار) — by VehicleType
  // ============================================
  console.log('💰 Setting up service pricing...');

  const vehicleTypes = ['SEDAN', 'SMALL_SUV', 'SUV', 'TRUCK'];
  const basePricesByType = {
    SEDAN: 50,
    SMALL_SUV: 75,
    SUV: 100,
    TRUCK: 150
  };

  const createdServices = await prisma.service.findMany();
  let pricingCount = 0;

  for (const service of createdServices) {
    let multiplier = 1;
    if (service.category === 'REPAIR') multiplier = 3;
    else if (service.category === 'MAINTENANCE') multiplier = 1.5;
    else if (service.category === 'EMERGENCY') multiplier = 2;
    else if (service.category === 'INSPECTION') multiplier = 2.5;

    for (const vehicleType of vehicleTypes) {
      const base = (basePricesByType[vehicleType] ?? 75) * multiplier;
      await prisma.servicePricing.upsert({
        where: {
          serviceId_vehicleType: {
            serviceId: service.id,
            vehicleType
          }
        },
        update: {
          basePrice: base,
          discountedPrice: base * 0.9
        },
        create: {
          serviceId: service.id,
          vehicleType,
          basePrice: base,
          discountedPrice: base * 0.9
        }
      });
      pricingCount++;
    }
  }

  console.log(`✅ Created ${pricingCount} pricing entries\n`);

  // ============================================
  // 4. System Settings (العمولات والضرائب والأسعار)
  // ============================================
  console.log('⚙️ Seeding System Settings (commissions, tax, pricing)...');

  const systemSettingsRows = [
    // العمولات والنسب
    {
      key: 'PLATFORM_COMMISSION_PERCENT',
      value: '10',
      type: 'NUMBER',
      category: 'COMMISSION',
      description: 'Platform commission percentage applied to bookings',
      descriptionAr: 'نسبة عمولة المنصة على الحجوزات %',
      isEditable: true,
    },
    {
      key: 'TECHNICIAN_COMMISSION_PERCENT',
      value: '85',
      type: 'NUMBER',
      category: 'COMMISSION',
      description: 'Technician share (remainder after platform commission) %',
      descriptionAr: 'نسبة الفني من الحجز (باقي بعد عمولة المنصة) %',
      isEditable: true,
    },
    // الضرائب
    {
      key: 'VAT_PERCENT',
      value: '15',
      type: 'NUMBER',
      category: 'TAX',
      description: 'VAT / Tax percentage applied to services',
      descriptionAr: 'نسبة ضريبة القيمة المضافة على الخدمات %',
      isEditable: true,
    },
    {
      key: 'TAX_INCLUDED_IN_PRICE',
      value: 'false',
      type: 'BOOLEAN',
      category: 'TAX',
      description: 'If true, displayed prices include tax',
      descriptionAr: 'إذا true فإن الأسعار المعروضة تشمل الضريبة',
      isEditable: true,
    },
    // أسعار الخدمات والنسب العامة
    {
      key: 'SERVICE_DEFAULT_MARKUP_PERCENT',
      value: '0',
      type: 'NUMBER',
      category: 'PRICING',
      description: 'Default markup % on base service prices',
      descriptionAr: 'نسبة الزيادة الافتراضية على أسعار الخدمات الأساسية %',
      isEditable: true,
    },
    {
      key: 'MIN_BOOKING_AMOUNT_SAR',
      value: '0',
      type: 'NUMBER',
      category: 'PRICING',
      description: 'Minimum booking amount in SAR',
      descriptionAr: 'الحد الأدنى لمبلغ الحجز بالريال',
      isEditable: true,
    },
    {
      key: 'CURRENCY_DISPLAY',
      value: 'SAR',
      type: 'STRING',
      category: 'PRICING',
      description: 'Currency code for display (e.g. SAR, USD)',
      descriptionAr: 'رمز العملة للعرض (مثلاً SAR, USD)',
      isEditable: true,
    },
  ];

  for (const row of systemSettingsRows) {
    await prisma.systemSettings.upsert({
      where: { key: row.key },
      update: {
        value: row.value,
        type: row.type,
        category: row.category,
        description: row.description,
        descriptionAr: row.descriptionAr,
        isEditable: row.isEditable,
      },
      create: {
        key: row.key,
        value: row.value,
        type: row.type,
        category: row.category,
        description: row.description,
        descriptionAr: row.descriptionAr,
        isEditable: row.isEditable,
      },
    });
  }
  console.log(`✅ System settings: ${systemSettingsRows.length} keys (COMMISSION, TAX, PRICING)\n`);

  console.log('✅ Database seeding completed successfully! 🎉\n');
  
  // Summary
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const settingsCount = await prisma.systemSettings.count();
  const summary = await Promise.all([
    prisma.vehicleBrand.count(),
    prisma.vehicleModel.count(),
    prisma.service.count(),
    prisma.servicePricing.count()
  ]);

  console.log('📊 Summary:');
  console.log(`   - Admin users: ${adminCount}`);
  console.log(`   - Vehicle Brands: ${summary[0]}`);
  console.log(`   - Vehicle Models: ${summary[1]}`);
  console.log(`   - Services: ${summary[2]}`);
  console.log(`   - Service Pricing: ${summary[3]}`);
  console.log(`   - System Settings: ${settingsCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
