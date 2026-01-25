const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // ============================================
  // 1. Vehicle Masters (كتالوج المركبات)
  // ============================================
  console.log('📦 Seeding Vehicle Masters...');
  
  const vehicleMasters = [
    // Toyota
    { make: 'Toyota', model: 'Camry', year: 2023, size: 'MEDIUM' },
    { make: 'Toyota', model: 'Camry', year: 2022, size: 'MEDIUM' },
    { make: 'Toyota', model: 'Corolla', year: 2023, size: 'SMALL' },
    { make: 'Toyota', model: 'Corolla', year: 2022, size: 'SMALL' },
    { make: 'Toyota', model: 'Land Cruiser', year: 2023, size: 'LARGE' },
    { make: 'Toyota', model: 'Hilux', year: 2023, size: 'LARGE' },
    { make: 'Toyota', model: 'RAV4', year: 2023, size: 'MEDIUM' },
    
    // Honda
    { make: 'Honda', model: 'Accord', year: 2023, size: 'MEDIUM' },
    { make: 'Honda', model: 'Civic', year: 2023, size: 'SMALL' },
    { make: 'Honda', model: 'CR-V', year: 2023, size: 'MEDIUM' },
    { make: 'Honda', model: 'Pilot', year: 2023, size: 'LARGE' },
    
    // BMW
    { make: 'BMW', model: 'X5', year: 2023, size: 'LARGE' },
    { make: 'BMW', model: 'X3', year: 2023, size: 'MEDIUM' },
    { make: 'BMW', model: '3 Series', year: 2023, size: 'MEDIUM' },
    { make: 'BMW', model: '5 Series', year: 2023, size: 'MEDIUM' },
    { make: 'BMW', model: '7 Series', year: 2023, size: 'LARGE' },
    
    // Mercedes-Benz
    { make: 'Mercedes-Benz', model: 'C-Class', year: 2023, size: 'MEDIUM' },
    { make: 'Mercedes-Benz', model: 'E-Class', year: 2023, size: 'MEDIUM' },
    { make: 'Mercedes-Benz', model: 'S-Class', year: 2023, size: 'LARGE' },
    { make: 'Mercedes-Benz', model: 'GLE', year: 2023, size: 'LARGE' },
    { make: 'Mercedes-Benz', model: 'GLC', year: 2023, size: 'MEDIUM' },
    
    // Nissan
    { make: 'Nissan', model: 'Altima', year: 2023, size: 'MEDIUM' },
    { make: 'Nissan', model: 'Maxima', year: 2023, size: 'MEDIUM' },
    { make: 'Nissan', model: 'Patrol', year: 2023, size: 'LARGE' },
    { make: 'Nissan', model: 'X-Trail', year: 2023, size: 'MEDIUM' },
    
    // Hyundai
    { make: 'Hyundai', model: 'Elantra', year: 2023, size: 'SMALL' },
    { make: 'Hyundai', model: 'Sonata', year: 2023, size: 'MEDIUM' },
    { make: 'Hyundai', model: 'Tucson', year: 2023, size: 'MEDIUM' },
    { make: 'Hyundai', model: 'Santa Fe', year: 2023, size: 'LARGE' },
    
    // Kia
    { make: 'Kia', model: 'Optima', year: 2023, size: 'MEDIUM' },
    { make: 'Kia', model: 'Sportage', year: 2023, size: 'MEDIUM' },
    { make: 'Kia', model: 'Sorento', year: 2023, size: 'LARGE' },
    
    // Ford
    { make: 'Ford', model: 'Explorer', year: 2023, size: 'LARGE' },
    { make: 'Ford', model: 'Expedition', year: 2023, size: 'LARGE' },
    { make: 'Ford', model: 'Edge', year: 2023, size: 'MEDIUM' },
    
    // Chevrolet
    { make: 'Chevrolet', model: 'Tahoe', year: 2023, size: 'LARGE' },
    { make: 'Chevrolet', model: 'Suburban', year: 2023, size: 'EXTRA_LARGE' },
    { make: 'Chevrolet', model: 'Traverse', year: 2023, size: 'LARGE' },
    
    // GMC
    { make: 'GMC', model: 'Yukon', year: 2023, size: 'LARGE' },
    { make: 'GMC', model: 'Acadia', year: 2023, size: 'MEDIUM' },
  ];

  for (const vehicle of vehicleMasters) {
    await prisma.vehicleMaster.upsert({
      where: {
        make_model_year: {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year
        }
      },
      update: {},
      create: vehicle
    });
  }
  
  console.log(`✅ Created ${vehicleMasters.length} vehicle masters\n`);

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

  for (const service of services) {
    await prisma.service.create({
      data: service
    });
  }
  
  console.log(`✅ Created ${services.length} services\n`);

  // ============================================
  // 3. Service Pricing (الأسعار)
  // ============================================
  console.log('💰 Setting up service pricing...');
  
  const createdServices = await prisma.service.findMany();
  let pricingCount = 0;
  
  for (const service of createdServices) {
    const basePrices = {
      SMALL: 50,
      MEDIUM: 75,
      LARGE: 100,
      EXTRA_LARGE: 150
    };
    
    // Adjust prices based on service type
    let multiplier = 1;
    if (service.category === 'REPAIR') multiplier = 3;
    else if (service.category === 'MAINTENANCE') multiplier = 1.5;
    else if (service.category === 'EMERGENCY') multiplier = 2;
    else if (service.category === 'INSPECTION') multiplier = 2.5;
    
    for (const size of ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']) {
      await prisma.servicePricing.create({
        data: {
          serviceId: service.id,
          vehicleSize: size,
          basePrice: basePrices[size] * multiplier,
          discountedPrice: basePrices[size] * multiplier * 0.9 // 10% discount
        }
      });
      pricingCount++;
    }
  }
  
  console.log(`✅ Created ${pricingCount} pricing entries\n`);

  console.log('✅ Database seeding completed successfully! 🎉\n');
  
  // Summary
  const summary = await Promise.all([
    prisma.vehicleMaster.count(),
    prisma.service.count(),
    prisma.servicePricing.count()
  ]);
  
  console.log('📊 Summary:');
  console.log(`   - Vehicle Masters: ${summary[0]}`);
  console.log(`   - Services: ${summary[1]}`);
  console.log(`   - Service Pricing: ${summary[2]}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
