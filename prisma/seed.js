const { PrismaClient, OrderStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create 10 users
  const users = [];
  const userData = [
    { email: 'user1@akfeek.com', role: 'CUSTOMER', name: 'أحمد محمد' },
    { email: 'user2@akfeek.com', role: 'CUSTOMER', name: 'خالد عمر' },
    { email: 'user3@akfeek.com', role: 'CUSTOMER', name: 'علي حسن' },
    { email: 'user4@akfeek.com', role: 'CUSTOMER', name: 'محمد علي' },
    { email: 'user5@akfeek.com', role: 'CUSTOMER', name: 'سعد الدين' },
    { email: 'user6@akfeek.com', role: 'CUSTOMER', name: 'يزيد فهد' },
    { email: 'user7@akfeek.com', role: 'CUSTOMER', name: 'عبد الرحمن' },
    { email: 'user8@akfeek.com', role: 'CUSTOMER', name: 'طلالittest' },
    { email: 'user9@akfeek.com', role: 'CUSTOMER', name: 'نايفittest' },
    { email: 'user10@akfeek.com', role: 'CUSTOMER', name: 'سلطانittest' },
  ];

  for (const data of userData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash,
        role: data.role,
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: false,
        preferredLanguage: 'AR',
        profile: {
          create: {
            firstName: data.name.split(' ')[0],
            lastName: data.name.split(' ')[1] || '',
          },
        },
      },
    });
    users.push(user);
    console.log(`✅ Created user: ${data.email}`);
  }

  // 2. Create vehicle brands
  const brands = [
    { name: 'Toyota', nameAr: 'تويوتا' },
    { name: 'Honda', nameAr: 'هوندا' },
    { name: 'BMW', nameAr: 'بي ام دبليو' },
    { name: 'Mercedes-Benz', nameAr: 'مرسيدس' },
    { name: 'Ford', nameAr: 'فورد' },
  ];

  const createdBrands = [];
  for (const brand of brands) {
    const created = await prisma.vehicleBrand.upsert({
      where: { name: brand.name },
      update: {},
      create: brand,
    });
    createdBrands.push(created);
  }
  console.log('✅ Created vehicle brands');

  // 3. Create vehicle models for each brand
  const modelsData = [
    { brandIdx: 0, name: 'Camry', nameAr: 'كامري', year: 2023, type: 'SEDAN' },
    { brandIdx: 0, name: 'Corolla', nameAr: 'كورولا', year: 2022, type: 'SEDAN' },
    { brandIdx: 0, name: 'Land Cruiser', nameAr: 'لاند كروزر', year: 2023, type: 'SUV' },
    { brandIdx: 1, name: 'Civic', nameAr: 'سيفيك', year: 2022, type: 'SEDAN' },
    { brandIdx: 1, name: 'Accord', nameAr: 'أكورد', year: 2023, type: 'SEDAN' },
    { brandIdx: 2, name: 'X5', nameAr: 'اكس 5', year: 2023, type: 'SUV' },
    { brandIdx: 2, name: '3 Series', nameAr: '3 سيريز', year: 2022, type: 'SEDAN' },
    { brandIdx: 3, name: 'C-Class', nameAr: 'سي كلاس', year: 2023, type: 'SEDAN' },
    { brandIdx: 3, name: 'G-Class', nameAr: 'جي كلاس', year: 2023, type: 'SUV' },
    { brandIdx: 4, name: 'F-150', nameAr: 'اف 150', year: 2023, type: 'TRUCK' },
  ];

  const createdModels = [];
  for (const m of modelsData) {
    const model = await prisma.vehicleModel.upsert({
      where: {
        brandId_name_year: {
          brandId: createdBrands[m.brandIdx].id,
          name: m.name,
          year: m.year,
        },
      },
      update: {},
      create: {
        brandId: createdBrands[m.brandIdx].id,
        name: m.name,
        nameAr: m.nameAr,
        year: m.year,
        type: m.type,
      },
    });
    createdModels.push(model);
  }
  console.log('✅ Created vehicle models');

  // 4. Assign one vehicle to each user
  for (let i = 0; i < users.length; i++) {
    await prisma.userVehicle.create({
      data: {
        userId: users[i].id,
        vehicleModelId: createdModels[i % createdModels.length].id,
        plateDigits: String(1000 + i).padStart(4, '0'),
        plateLettersEn: String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i + 1) % 26)),
        plateRegion: 'K',
        color: 'أبيض',
        isDefault: true,
      },
    });
  }
  console.log('✅ Created user vehicles');

  // 5. Create Vendor Profiles (6 vendors with different types)
  const vendorUsers = [];
  const vendorTypes = [
    { type: 'AUTO_PARTS', name: 'محلات قطع غيار الرياض', email: 'vendor1@akfeek.com' },
    { type: 'TOWING_SERVICE', name: 'ونش الرياض السريع', email: 'vendor2@akfeek.com' },
    { type: 'CAR_WASH', name: 'غسيل السيارات الذهبي', email: 'vendor3@akfeek.com' },
    { type: 'COMPREHENSIVE_CARE', name: 'العناية الشاملة للسيارات', email: 'vendor4@akfeek.com' },
    { type: 'CERTIFIED_WORKSHOP', name: 'ورشة维修 المعتمدة', email: 'vendor5@akfeek.com' },
    { type: 'AUTO_PARTS', name: 'قطع غيار دراجات نارية', email: 'vendor6@akfeek.com' },
  ];

  const vendorProfiles = [];

  for (let i = 0; i < vendorTypes.length; i++) {
    const v = vendorTypes[i];
    const vendorUser = await prisma.user.upsert({
      where: { email: v.email },
      update: {},
      create: {
        email: v.email,
        passwordHash,
        role: 'VENDOR',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        phone: '+96650000000' + (i + 1),
        preferredLanguage: 'AR',
        profile: {
          create: {
            firstName: v.name.split(' ')[0],
            lastName: v.name.split(' ').slice(1).join(' ') || 'Store',
          },
        },
      },
    });
    vendorUsers.push(vendorUser);

    const profile = await prisma.vendorProfile.upsert({
      where: { userId: vendorUser.id },
      update: {},
      create: {
        userId: vendorUser.id,
        vendorType: v.type,
        businessName: v.name,
        businessNameAr: v.name,
        description: `${v.name} - خدمات متميزة`,
        contactPhone: '+96650000000' + (i + 1),
        contactEmail: v.email,
        city: 'الرياض',
        country: 'السعودية',
        address: 'الرياض',
        status: 'ACTIVE',
        isVerified: true,
        averageRating: 4.5,
        totalReviews: 10,
      },
    });
    vendorProfiles.push(profile);
    console.log(`✅ Created vendor profile: ${v.name} (${v.type})`);
  }

  // 6. Create AutoPart Categories (3 for CAR, 3 for MOTORCYCLE)
  
  // Create Certified Workshop linked to vendor index 4
  const workshop = await prisma.certifiedWorkshop.upsert({
    where: { vendorId: vendorProfiles[4].id },
    update: {},
    create: {
      name: 'ورشة维修 المعتمدة - الرئيسية',
      nameAr: 'ورشة维修 المعتمدة - الرئيسية',
      description: 'ورشة صيانة معتمدة主营汽车维修',
      descriptionAr: 'ورشة صيانة معتمدة主营汽车维修',
      address: 'الرياض - حي النرجس',
      addressAr: 'الرياض - حي النرجس',
      city: 'الرياض',
      cityAr: 'الرياض',
      latitude: 24.7136,
      longitude: 46.6753,
      phone: '+966500000005',
      email: 'vendor5@akfeek.com',
      services: JSON.stringify(['Oil Change', 'Brake Service', 'Tire Service', 'General Inspection', 'AC Repair']),
      workingHours: JSON.stringify({
        sunday: { open: '08:00', close: '18:00' },
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
      }),
      averageRating: 4.5,
      totalReviews: 10,
      isActive: true,
      isVerified: true,
      vendorId: vendorProfiles[4].id,
    },
  });
  console.log('✅ Created certified workshop');

  // Create categories
  const categories = [
    { name: 'Engine Parts', nameAr: 'قطع المحرك', rootType: 'CAR' },
    { name: 'Brakes', nameAr: 'الفرامل', rootType: 'CAR' },
    { name: 'Suspension', nameAr: 'التعليق', rootType: 'CAR' },
    { name: 'Motorcycle Engine', nameAr: 'محرك الدراجة', rootType: 'MOTORCYCLE' },
    { name: 'Motorcycle Brakes', nameAr: 'فرامل الدراجة', rootType: 'MOTORCYCLE' },
    { name: 'Motorcycle Wheels', nameAr: 'إطارات الدراجة', rootType: 'MOTORCYCLE' },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const created = await prisma.autoPartCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    createdCategories.push(created);
  }
  console.log('✅ Created auto part categories');

  // 7. Create Auto Parts for Car Parts vendor (categories 0-2)
  const carParts = [
    { categoryIdx: 0, name: 'Oil Filter', nameAr: 'فلتر الزيت', price: 50, brand: 'Toyota', brandIdx: 0, modelIdx: 0, year: 2023 },
    { categoryIdx: 0, name: 'Air Filter', nameAr: 'فلتر الهواء', price: 35, brand: 'Toyota', brandIdx: 0, modelIdx: 1, year: 2022 },
    { categoryIdx: 0, name: 'Spark Plugs', nameAr: 'شمعات الإشعال', price: 80, brand: 'NGK', brandIdx: 0, modelIdx: 0, year: 2023 },
    { categoryIdx: 1, name: 'Brake Pads', nameAr: 'فاصلات الفرامل', price: 150, brand: 'Bosch', brandIdx: 0, modelIdx: 0, year: 2023 },
    { categoryIdx: 1, name: 'Brake Discs', nameAr: 'أقراص الفرامل', price: 250, brand: 'Bosch', brandIdx: 0, modelIdx: 1, year: 2022 },
    { categoryIdx: 2, name: 'Shock Absorber', nameAr: 'ماص الصدمات', price: 300, brand: 'Monroe', brandIdx: 3, modelIdx: 7, year: 2023 },
    { categoryIdx: 2, name: 'Strut Mount', nameAr: 'حامل الدعامات', price: 120, brand: 'Monroe', brandIdx: 3, modelIdx: 7, year: 2023 },
  ];

  for (const part of carParts) {
    await prisma.autoPart.create({
      data: {
        sku: `PART-${Math.random().toString(36).substring(7).toUpperCase()}`,
        name: part.name,
        nameAr: part.nameAr,
        description: `${part.name} - عالية الجودة`,
        vendorId: vendorProfiles[0].id,
        createdByUserId: users[0].id,
        categoryId: createdCategories[part.categoryIdx].id,
        brand: part.brand,
        brandId: createdBrands[part.brandIdx].id,
        vehicleModelId: createdModels[part.modelIdx].id,
        year: part.year,
        price: part.price,
        stockQuantity: 50,
        badges: ['Original', 'Warranty'],
        isApproved: true,
        isActive: true,
      },
    });
  }
  console.log('✅ Created auto parts for car parts vendor');

  // Ensure all auto parts have badges (backfill old rows seeded previously)
  await prisma.autoPart.updateMany({
    where: { badges: null },
    data: { badges: ['Original'] },
  });

  // 8. Create Services for Car Wash (vendor index 2)
  const carWashServices = [
    { name: 'Standard Wash', nameAr: 'غسيل عادي', price: 50, duration: 30 },
    { name: 'Premium Wash', nameAr: 'غسيل premium', price: 100, duration: 45 },
    { name: 'Full Detailing', nameAr: 'تلميع كامل', price: 200, duration: 90 },
  ];

  for (const svc of carWashServices) {
    await prisma.service.create({
      data: {
        name: svc.name,
        nameAr: svc.nameAr,
        description: `${svc.nameAr} - خدمة متميزة`,
        type: 'FIXED',
        category: 'CLEANING',
        vendorId: vendorProfiles[2].id,
        estimatedDuration: svc.duration,
        isActive: true,
        pricing: {
          create: {
            vehicleType: 'all',
            basePrice: svc.price,
            isActive: true,
          },
        },
      },
    });
  }
  console.log('✅ Created car wash services');

  // 9. Create Services for Comprehensive Care (vendor index 3)
  const careServices = [
    { name: 'Interior Cleaning', nameAr: 'تنظيف الداخلية', price: 150, duration: 60 },
    { name: 'Polishing', nameAr: 'التلميع', price: 200, duration: 75 },
    { name: 'Ceramic Coating', nameAr: 'طلاء سيراميك', price: 500, duration: 180 },
  ];

  for (const svc of careServices) {
    await prisma.service.create({
      data: {
        name: svc.name,
        nameAr: svc.nameAr,
        description: `${svc.nameAr} - خدمة متميزة`,
        type: 'FIXED',
        category: 'COMPREHENSIVE_CARE',
        vendorId: vendorProfiles[3].id,
        estimatedDuration: svc.duration,
        isActive: true,
        pricing: {
          create: {
            vehicleType: 'all',
            basePrice: svc.price,
            isActive: true,
          },
        },
      },
    });
  }
  console.log('✅ Created comprehensive care services');

  // 10. Create Services for Certified Workshop (vendor index 4)
  const workshopServices = [
    { name: 'Oil Change', nameAr: 'تغيير الزيت', price: 100, duration: 30 },
    { name: 'General Inspection', nameAr: 'فحص شامل', price: 150, duration: 45 },
    { name: 'Tire Rotation', nameAr: 'تدوير الإطارات', price: 80, duration: 30 },
  ];

  for (const svc of workshopServices) {
    await prisma.service.create({
      data: {
        name: svc.name,
        nameAr: svc.nameAr,
        description: `${svc.nameAr} - خدمة معتمدة`,
        type: 'FIXED',
        category: 'CERTIFIED_WORKSHOP',
        vendorId: vendorProfiles[4].id,
        estimatedDuration: svc.duration,
        isActive: true,
        pricing: {
          create: {
            vehicleType: 'all',
            basePrice: svc.price,
            isActive: true,
          },
        },
      },
    });
  }
  console.log('✅ Created certified workshop services');

  // 11. Create Winch for Winch vendor (vendor index 1)
  await prisma.winch.upsert({
    where: { plateNumber: 'ونش 001' },
    update: {},
    create: {
      vendorId: vendorProfiles[1].id,
      name: 'Ford F-150 Towing',
      nameAr: 'ونش فورد اف 150',
      plateNumber: 'ونش 001',
      vehicleModel: 'Ford F-150',
      year: 2022,
      capacity: 5,
      city: 'الرياض',
      latitude: 24.7136,
      longitude: 46.6753,
      basePrice: 100,
      pricePerKm: 2,
      minPrice: 100,
      isAvailable: true,
      isActive: true,
      isVerified: true,
    },
  });
  console.log('✅ Created winch vehicle');

  // 12. Create 3 Coupons
  const coupons = [
    { vendorIdx: 2, code: 'CARWASH10', discountValue: 10, discountType: 'PERCENT', minOrderAmount: 50 },
    { vendorIdx: 0, code: 'PARTS20', discountValue: 20, discountType: 'PERCENT', minOrderAmount: 200 },
    { vendorIdx: 3, code: 'CARE15', discountValue: 15, discountType: 'PERCENT', minOrderAmount: 100 },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: {
        vendorId_code: {
          vendorId: vendorProfiles[c.vendorIdx].id,
          code: c.code,
        },
      },
      update: {},
      create: {
        vendorId: vendorProfiles[c.vendorIdx].id,
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderAmount: c.minOrderAmount,
        validUntil: new Date('2026-12-31'),
        maxUses: 100,
        isActive: true,
      },
    });
  }
  console.log('✅ Created coupons');

  // 13. Create Service Packages
  const packages = [
    {
      name: 'Basic Package',
      nameAr: 'الباقة الأساسية',
      description: '包括了基本服务',
      price: 300,
      validityDays: 30,
      services: ['Oil Change', 'Standard Wash', 'General Inspection'],
    },
    {
      name: 'Premium Package',
      nameAr: 'الباقة المميزة',
      description: '包括所有服务',
      price: 800,
      validityDays: 60,
      services: ['Oil Change', 'Premium Wash', 'Full Detailing', 'General Inspection'],
    },
  ];

  for (const pkg of packages) {
    const createdPkg = await prisma.package.create({
      data: {
        name: pkg.name,
        nameAr: pkg.nameAr,
        description: pkg.description,
        price: pkg.price,
        validityDays: pkg.validityDays,
        isActive: true,
      },
    });

    for (const svcName of pkg.services) {
      const svc = await prisma.service.findFirst({
        where: { name: svcName },
      });
      if (svc) {
        await prisma.packageService.create({
          data: {
            packageId: createdPkg.id,
            serviceId: svc.id,
          },
        });
      }
    }
  }
  console.log('✅ Created service packages');

  // 14. Create Customer Service Employees (Support Staff)
  const supportStaff = [
    { email: 'support1@akfeek.com', name: 'سارة أحمد', phone: '+96660000001' },
    { email: 'support2@akfeek.com', name: 'فاطمة علي', phone: '+96660000002' },
    { email: 'support3@akfeek.com', name: 'منى خالد', phone: '+96660000003' },
  ];

  const supportUsers = [];
  for (const staff of supportStaff) {
    const user = await prisma.user.upsert({
      where: { email: staff.email },
      update: {},
      create: {
        email: staff.email,
        passwordHash,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        phone: staff.phone,
        preferredLanguage: 'AR',
        profile: {
          create: {
            firstName: staff.name.split(' ')[0],
            lastName: staff.name.split(' ').slice(1).join(' ') || 'Support',
          },
        },
      },
    });
    supportUsers.push(user);
  }
  console.log('✅ Created customer service employees');

  // 15. Create Vendor Registration Applications (PENDING, APPROVED, REJECTED)
  const vendorApplications = [
    { userIdx: 0, vendorType: 'AUTO_PARTS', businessName: 'محلات_parts_new', status: 'PENDING' },
    { userIdx: 1, vendorType: 'CAR_WASH', businessName: 'غسيل_جديد', status: 'APPROVED' },
    { userIdx: 2, vendorType: 'COMPREHENSIVE_CARE', businessName: 'عناية_شاملة_جديدة', status: 'REJECTED' },
  ];

  for (const app of vendorApplications) {
    const vendorUser = await prisma.user.upsert({
      where: { email: `app${app.userIdx}@akfeek.com` },
      update: {},
      create: {
        email: `app${app.userIdx}@akfeek.com`,
        passwordHash,
        role: 'VENDOR',
        status: 'PENDING_VERIFICATION',
        emailVerified: true,
        preferredLanguage: 'AR',
        profile: {
          create: {
            firstName: `مقدم${app.userIdx}`,
            lastName: 'طلب',
          },
        },
      },
    });

    await prisma.vendor.upsert({
      where: { userId: vendorUser.id },
      update: {},
      create: {
        userId: vendorUser.id,
        vendorType: app.vendorType,
        legalName: app.businessName,
        tradeName: app.businessName,
        supplierType: 'RESELLER',
        country: 'السعودية',
        city: 'الرياض',
        addressLine1: 'عنوان الطلب',
        nationalAddress: 'الرياض',
        postalCode: '12345',
        commercialRegNo: `CR${Date.now()}${app.userIdx}`,
        companyEmail: vendorUser.email,
        companyPhone: '+966500000000',
        contactPersonName: 'مقدم الطلب',
        contactPersonTitle: 'مدير',
        contactPersonMobile: '+966500000000',
        mainService: app.vendorType,
        servicesOffered: 'خدمات متنوعة',
        coverageRegion: 'الرياض',
        payoutMethod: 'BANK_TRANSFER',
        status: app.status,
      },
    });
  }
  console.log('✅ Created vendor applications');

  // 16. Create Mobile Workshop Types
  const workshopTypes = [
    { name: 'Battery Change', nameAr: 'تغيير البطارية', description: 'تغيير بطاريات السيارات', serviceType: 'BATTERY' },
    { name: 'Tire Repair', nameAr: 'إصلاح الإطارات', description: 'إصلاح وفحص الإطارات', serviceType: 'TIRE' },
    { name: 'Oil Change', nameAr: 'تغيير الزيت', description: 'تغيير زيت المحرك', serviceType: 'OIL_CHANGE' },
    { name: 'Emergency Repair', nameAr: 'إصلاح طوارئ', description: 'إصلاحات طوارئ بسيطة', serviceType: 'EMERGENCY' },
    { name: 'Car Cleaning', nameAr: 'تنظيف السيارة', description: 'تنظيف سريع للسيارة', serviceType: 'CLEANING' },
  ];

  const createdWorkshopTypes = [];
  for (const wt of workshopTypes) {
    const type = await prisma.mobileWorkshopType.create({
      data: {
        name: wt.name,
        nameAr: wt.nameAr,
        description: wt.description,
        serviceType: wt.serviceType,
        isActive: true,
      },
    });
    createdWorkshopTypes.push(type);
  }
  console.log('✅ Created mobile workshop types');

  // 17. Create Mobile Workshop Vendor and Units
  const mobileWorkshopVendorUser = await prisma.user.upsert({
    where: { email: 'mobilevendor@akfeek.com' },
    update: {},
    create: {
      email: 'mobilevendor@akfeek.com',
      passwordHash,
      role: 'VENDOR',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      phone: '+966700000001',
      preferredLanguage: 'AR',
      profile: {
        create: {
          firstName: 'ورشة',
          lastName: 'متنقلة',
        },
      },
    },
  });

  const mobileWorkshopProfile = await prisma.vendorProfile.upsert({
    where: { userId: mobileWorkshopVendorUser.id },
    update: {},
    create: {
      userId: mobileWorkshopVendorUser.id,
      vendorType: 'MOBILE_WORKSHOP',
      businessName: 'الورشة المتنقلة',
      businessNameAr: 'الورشة المتنقلة',
      description: 'خدمات صيانة متنقلة',
      contactPhone: '+966700000001',
      contactEmail: 'mobilevendor@akfeek.com',
      city: 'الرياض',
      country: 'السعودية',
      address: 'الرياض',
      status: 'ACTIVE',
      isVerified: true,
      averageRating: 4.8,
      totalReviews: 15,
    },
  });

  // Create Mobile Workshop Units (only one per vendor due to unique constraint)
  const mobileWorkshops = [
    { name: 'Toyota Van Unit 1', nameAr: 'وحدة تويوتا 1', type: 'Van', model: 'Toyota Hiace', year: 2023, plate: 'م و 001', typeIdx: 0 },
  ];

  const createdMobileWorkshops = [];
  for (const mw of mobileWorkshops) {
    const workshop = await prisma.mobileWorkshop.upsert({
      where: { vendorId: mobileWorkshopProfile.id },
      update: {},
      create: {
        name: mw.name,
        nameAr: mw.nameAr,
        vendorId: mobileWorkshopProfile.id,
        workshopTypeId: createdWorkshopTypes[mw.typeIdx].id,
        vehicleType: mw.type,
        vehicleModel: mw.model,
        year: mw.year,
        plateNumber: mw.plate,
        city: 'الرياض',
        latitude: 24.7136 + Math.random() * 0.1,
        longitude: 46.6753 + Math.random() * 0.1,
        serviceRadius: 30,
        basePrice: 100,
        pricePerKm: 2,
        minPrice: 100,
        isAvailable: true,
        isActive: true,
        isVerified: true,
      },
    });
    createdMobileWorkshops.push(workshop);
  }
  console.log('✅ Created mobile workshop vendor and units');

  // 18. Create Bookings (some CONFIRMED, some PENDING)
  // Get existing services
  const services = await prisma.service.findMany({ take: 10 });

  // Get existing user vehicles
  const userVehicles = await prisma.userVehicle.findMany({ take: 10 });

  const bookings = [
    { userIdx: 0, vehicleIdx: 0, serviceIdx: 0, status: 'CONFIRMED', scheduledDate: '2026-04-15', scheduledTime: '10:00', total: 150 },
    { userIdx: 1, vehicleIdx: 1, serviceIdx: 1, status: 'CONFIRMED', scheduledDate: '2026-04-16', scheduledTime: '14:00', total: 200 },
    { userIdx: 2, vehicleIdx: 2, serviceIdx: 2, status: 'PENDING', scheduledDate: '2026-04-20', scheduledTime: '09:00', total: 300 },
    { userIdx: 3, vehicleIdx: 3, serviceIdx: 0, status: 'PENDING', scheduledDate: '2026-04-18', scheduledTime: '11:00', total: 100 },
    { userIdx: 4, vehicleIdx: 4, serviceIdx: 1, status: 'CONFIRMED', scheduledDate: '2026-04-12', scheduledTime: '16:00', total: 180 },
  ];

  for (const b of bookings) {
    const service = services[b.serviceIdx % services.length];
    const vehicle = userVehicles[b.vehicleIdx % userVehicles.length];
    const user = users[b.userIdx];

    await prisma.booking.create({
      data: {
        bookingNumber: `BKG-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
        customerId: user.id,
        vehicleId: vehicle.id,
        status: b.status,
        scheduledDate: new Date(b.scheduledDate),
        scheduledTime: b.scheduledTime,
        subtotal: b.total,
        laborFee: 0,
        deliveryFee: 0,
        partsTotal: 0,
        discount: 0,
        tax: 0,
        totalPrice: b.total,
        services: {
          create: {
            serviceId: service.id,
            unitPrice: b.total,
            totalPrice: b.total,
            quantity: 1,
            quantity: 1,
          },
        },
      },
    });
  }
  console.log('✅ Created bookings');

  // 19. Create Feedback (Complaints and Suggestions)
  const feedbacks = [
    { userIdx: 0, type: 'COMPLAINT', subject: 'تأخر في الخدمة', message: 'تم تأخير الموعد ساعة كاملة', category: 'OTHER', status: 'OPEN' },
    { userIdx: 1, type: 'SUGGESTION', subject: 'تحسين التطبيق', message: 'أتمنى إضافة إمكانية تتبع الفني', category: 'UI_UX', status: 'RESOLVED' },
    { userIdx: 2, type: 'COMPLAINT', subject: 'جودة الخدمة', message: 'لم أكن راضيا عن جودة الغسيل', category: 'OTHER', status: 'OPEN' },
    { userIdx: 3, type: 'SUGGESTION', subject: 'أسعار أفضل', message: 'أتمنى وجود خصومات أكثر', category: 'OTHER', status: 'OPEN' },
  ];

  for (const fb of feedbacks) {
    await prisma.feedback.create({
      data: {
        userId: users[fb.userIdx].id,
        type: fb.type,
        category: fb.category,
        subject: fb.subject,
        message: fb.message,
        status: fb.status,
        priority: fb.type === 'COMPLAINT' ? 'HIGH' : 'LOW',
      },
    });
  }
  console.log('✅ Created feedback (complaints and suggestions)');

  // 20. Create Banners
  const banners = [
    { position: 'TOP', title: 'خصم 20% على الغسيل', titleAr: 'خصم 20% على الغسيل', sortOrder: 1 },
    { position: 'AUTO_PARTS', title: 'قطع غيار بأفضل الأسعار', titleAr: 'قطع غيار بأفضل الأسعار', sortOrder: 2 },
    { position: 'CAR_WASH', title: 'غسيل سياراتVIP', titleAr: 'غسيل سيارات VIP بأفضل الأسعار', sortOrder: 3 },
    { position: 'BOTTOM', title: 'احجز الآن ورشة متنقلة', titleAr: 'احجز الآن ورشة متنقلة', sortOrder: 4 },
  ];

  for (const b of banners) {
    const banner = await prisma.banner.create({
      data: {
        position: b.position,
        title: b.title,
        titleAr: b.titleAr,
        sortOrder: b.sortOrder,
        isActive: true,
        images: {
          create: {
            imageUrl: `https://placehold.co/800x400?text=${encodeURIComponent(b.title)}`,
            sortOrder: 1,
          },
        },
      },
    });
  }
  console.log('✅ Created banners');

  // 17. Create Workshop Reviews
  const workshops = await prisma.certifiedWorkshop.findMany({ take: 3 });
  const workshopReviews = [
    { rating: 5, comment: 'Excellent service, very professional!', commentAr: 'خدمة ممتازة، احترافي جداً!', isApproved: true, isVerified: true },
    { rating: 4, comment: 'Good work, timely delivery', commentAr: 'عمل جيد، تسليم في الوقت', isApproved: true, isVerified: true },
    { rating: 5, comment: 'Highly recommended!', commentAr: 'موصى به بشدة!', isApproved: true, isVerified: true },
    { rating: 3, comment: 'Average service', commentAr: 'خدمة متوسطة', isApproved: true, isVerified: false },
  ];

  for (let i = 0; i < workshops.length; i++) {
    const workshop = workshops[i];
    for (let j = 0; j < 2; j++) {
      const userIdx = (i + j) % users.length;
      const review = workshopReviews[(i * 2 + j) % workshopReviews.length];
      await prisma.workshopReview.upsert({
        where: { id: `review-${workshop.id}-${userIdx}` },
        update: {},
        create: {
          id: `review-${workshop.id}-${userIdx}`,
          workshopId: workshop.id,
          userId: users[userIdx].id,
          rating: review.rating,
          comment: review.comment,
          commentAr: review.commentAr,
          isApproved: review.isApproved,
          isVerified: review.isVerified,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log('✅ Created workshop reviews');

  // 18. Create Vendor Reviews
  const vendors = await prisma.vendorProfile.findMany({ take: 3 });
  const vendorReviews = [
    { rating: 5, comment: 'Great quality parts!' },
    { rating: 4, comment: 'Fast delivery' },
    { rating: 5, comment: 'Best prices in town' },
  ];

  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i];
    for (let j = 0; j < 2; j++) {
      const userIdx = (i + j) % users.length;
      const review = vendorReviews[(i * 2 + j) % vendorReviews.length];
      await prisma.vendorReview.upsert({
        where: { id: `vreview-${vendor.id}-${userIdx}` },
        update: {},
        create: {
          id: `vreview-${vendor.id}-${userIdx}`,
          vendorId: vendor.id,
          userId: users[userIdx].id,
          rating: review.rating,
          comment: review.comment,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log('✅ Created vendor reviews');

  // 19. Create Auto Parts Orders
  const parts = await prisma.autoPart.findMany({ take: 5 });
  
  for (let i = 0; i < 5; i++) {
    const part = parts[i % parts.length];
    const userIdx = i % users.length;
    const statusKey = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'][i % 5];
    
    await prisma.marketplaceOrder.upsert({
      where: { id: `order-${i}` },
      update: {},
      create: {
        id: `order-${i}`,
        orderNumber: `ORD-2026-${String(1000 + i).padStart(4, '0')}`,
        customerId: users[userIdx].id,
        status: OrderStatus[statusKey],
        subtotal: part.price,
        tax: 0,
        shippingCost: 20,
        totalAmount: Number(part.price) + 20,
        shippingAddress: 'Riyadh, Saudi Arabia',
        shippingCountry: 'SA',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        items: {
          create: [{
            autoPartId: part.id,
            vendorId: part.vendorId,
            quantity: 1,
            unitPrice: part.price,
            totalPrice: part.price,
          }],
        },
      },
    });
  }
  console.log('✅ Created auto parts orders');

  // 20. Create User Package Subscriptions
  const dbPackages = await prisma.package.findMany({ take: 2 });
  for (let i = 0; i < 3; i++) {
    const pkg = dbPackages[i % dbPackages.length];
    const userIdx = i % users.length;
    const purchasedAt = new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(purchasedAt.getTime() + pkg.validityDays * 24 * 60 * 60 * 1000);
    
    await prisma.userPackage.upsert({
      where: { id: `userpkg-${i}` },
      update: {},
      create: {
        id: `userpkg-${i}`,
        userId: users[userIdx].id,
        packageId: pkg.id,
        purchasedAt,
        expiresAt,
        isActive: expiresAt > new Date(),
      },
    });
  }
  console.log('✅ Created user package subscriptions');

  console.log('🎉 Seed extended successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });