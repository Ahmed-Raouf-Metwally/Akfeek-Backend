/**
 * Seed 6 vendors (one per vendor type) with linked entities/services.
 *
 * Includes:
 * - AUTO_PARTS: vendor-owned auto part
 * - TOWING_SERVICE: linked winch
 * - CERTIFIED_WORKSHOP: linked workshop + workshop services
 * - COMPREHENSIVE_CARE: linked services + pricing
 * - CAR_WASH: linked cleaning services + pricing
 * - MOBILE_WORKSHOP: linked mobile workshop + mobile services
 *
 * Run:
 *   node prisma/seed-6-vendors-linked.js
 *   npm run prisma:seed:6vendors-linked
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const PASSWORD = 'Vendor123!';

const VENDORS = [
  {
    key: 'AUTO_PARTS',
    email: 'vendor-autoparts-6@akfeek.com',
    phone: '+966551111601',
    businessName: 'Akfeek Auto Parts',
    businessNameAr: 'أكفيك قطع غيار',
    firstName: 'Auto',
    lastName: 'Parts',
  },
  {
    key: 'TOWING_SERVICE',
    email: 'vendor-winch-6@akfeek.com',
    phone: '+966551111602',
    businessName: 'Akfeek Winch',
    businessNameAr: 'أكفيك ونش',
    firstName: 'Winch',
    lastName: 'Vendor',
  },
  {
    key: 'CERTIFIED_WORKSHOP',
    email: 'vendor-certified-workshop-6@akfeek.com',
    phone: '+966551111603',
    businessName: 'Akfeek Certified Workshop',
    businessNameAr: 'أكفيك ورشة معتمدة',
    firstName: 'Certified',
    lastName: 'Workshop',
  },
  {
    key: 'COMPREHENSIVE_CARE',
    email: 'vendor-care-6@akfeek.com',
    phone: '+966551111604',
    businessName: 'Akfeek Comprehensive Care',
    businessNameAr: 'أكفيك العناية الشاملة',
    firstName: 'Care',
    lastName: 'Vendor',
  },
  {
    key: 'CAR_WASH',
    email: 'vendor-carwash-6@akfeek.com',
    phone: '+966551111605',
    businessName: 'Akfeek Car Wash',
    businessNameAr: 'أكفيك غسيل سيارات',
    firstName: 'Car',
    lastName: 'Wash',
  },
  {
    key: 'MOBILE_WORKSHOP',
    email: 'vendor-mobile-workshop-6@akfeek.com',
    phone: '+966551111606',
    businessName: 'Akfeek Mobile Workshop',
    businessNameAr: 'أكفيك ورشة متنقلة',
    firstName: 'Mobile',
    lastName: 'Workshop',
  },
];

function workshopServicesJson() {
  return JSON.stringify(['GENERAL', 'DIAGNOSIS', 'AC', 'BRAKE', 'OIL_CHANGE']);
}

async function upsertVendorAccount(def, passwordHash) {
  const user = await prisma.user.upsert({
    where: { email: def.email },
    update: {
      role: 'VENDOR',
      status: 'ACTIVE',
      passwordHash,
      phone: def.phone,
      emailVerified: true,
      phoneVerified: true,
      profile: {
        upsert: {
          update: { firstName: def.firstName, lastName: def.lastName },
          create: { firstName: def.firstName, lastName: def.lastName },
        },
      },
    },
    create: {
      email: def.email,
      phone: def.phone,
      passwordHash,
      role: 'VENDOR',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      profile: {
        create: { firstName: def.firstName, lastName: def.lastName },
      },
    },
  });

  const vendor = await prisma.vendorProfile.upsert({
    where: { userId: user.id },
    update: {
      vendorType: def.key,
      businessName: def.businessName,
      businessNameAr: def.businessNameAr,
      description: `${def.businessName} vendor account`,
      descriptionAr: `حساب فيندور ${def.businessNameAr}`,
      contactPhone: def.phone,
      contactEmail: def.email,
      status: 'ACTIVE',
      isVerified: true,
      verifiedAt: new Date(),
      city: 'Riyadh',
      country: 'SA',
      address: 'Riyadh',
      commercialLicense: `LIC-${def.key}-6`,
      taxNumber: `TAX-${def.key}-6`,
    },
    create: {
      userId: user.id,
      vendorType: def.key,
      businessName: def.businessName,
      businessNameAr: def.businessNameAr,
      description: `${def.businessName} vendor account`,
      descriptionAr: `حساب فيندور ${def.businessNameAr}`,
      contactPhone: def.phone,
      contactEmail: def.email,
      status: 'ACTIVE',
      isVerified: true,
      verifiedAt: new Date(),
      city: 'Riyadh',
      country: 'SA',
      address: 'Riyadh',
      commercialLicense: `LIC-${def.key}-6`,
      taxNumber: `TAX-${def.key}-6`,
    },
  });

  return { user, vendor };
}

async function ensureAutoPartsVendorAssets(vendor, userId) {
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
    throw new Error('No AutoPartCategory found. Run auto-part category seeds first.');
  }

  const sku = 'AKF-SEED6-AP-001';
  await prisma.autoPart.upsert({
    where: { sku },
    update: {
      name: 'Akfeek Brake Pad Set',
      nameAr: 'أكفيك طقم فحمات فرامل',
      vendorId: vendor.id,
      createdByUserId: userId,
      categoryId: category.id,
      brand: 'Akfeek',
      price: 199,
      stockQuantity: 45,
      isActive: true,
      isApproved: true,
      approvedAt: new Date(),
    },
    create: {
      sku,
      name: 'Akfeek Brake Pad Set',
      nameAr: 'أكفيك طقم فحمات فرامل',
      description: 'Vendor-owned seed part for marketplace testing',
      descriptionAr: 'قطعة غيار تجريبية مملوكة لفيندور قطع الغيار',
      vendorId: vendor.id,
      createdByUserId: userId,
      categoryId: category.id,
      brand: 'Akfeek',
      partNumber: 'AKF-BRK-6',
      price: 199,
      compareAtPrice: 235,
      stockQuantity: 45,
      lowStockThreshold: 5,
      isActive: true,
      isApproved: true,
      approvedAt: new Date(),
      images: {
        create: [
          {
            url: '/uploads/parts/seed/akf-brake-pad.webp',
            altText: 'Akfeek Brake Pad Set',
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });
}

async function ensureTowingVendorAssets(vendor) {
  const current = await prisma.winch.findFirst({ where: { vendorId: vendor.id } });
  if (current) {
    await prisma.winch.update({
      where: { id: current.id },
      data: {
        isActive: true,
        isAvailable: true,
        city: current.city || 'Riyadh',
        latitude: current.latitude || 24.7136,
        longitude: current.longitude || 46.6753,
      },
    });
    return;
  }

  let plateNumber = 'AKF-WN-6001';
  const exists = await prisma.winch.findUnique({ where: { plateNumber } });
  if (exists) {
    plateNumber = `AKF-WN-${Date.now().toString().slice(-6)}`;
  }

  await prisma.winch.create({
    data: {
      name: 'Akfeek Winch Unit',
      nameAr: 'أكفيك وحدة ونش',
      plateNumber,
      vehicleModel: 'Tow Truck',
      year: new Date().getFullYear(),
      capacity: 3.5,
      city: 'Riyadh',
      latitude: 24.7136,
      longitude: 46.6753,
      basePrice: 150,
      pricePerKm: 2.5,
      minPrice: 90,
      currency: 'SAR',
      isActive: true,
      isAvailable: true,
      isVerified: true,
      verifiedAt: new Date(),
      vendorId: vendor.id,
    },
  });
}

async function ensureCertifiedWorkshopAssets(vendor) {
  let workshop = await prisma.certifiedWorkshop.findFirst({ where: { vendorId: vendor.id } });
  if (!workshop) {
    workshop = await prisma.certifiedWorkshop.create({
      data: {
        name: 'Akfeek Certified Garage',
        nameAr: 'أكفيك كراج معتمد',
        description: 'Certified workshop linked to the seeded certified vendor',
        descriptionAr: 'ورشة معتمدة مرتبطة بفيندور الورش المعتمدة',
        address: 'Riyadh, King Fahd Road',
        addressAr: 'الرياض، طريق الملك فهد',
        city: 'Riyadh',
        cityAr: 'الرياض',
        latitude: 24.7201,
        longitude: 46.6841,
        phone: vendor.contactPhone,
        email: vendor.contactEmail,
        services: workshopServicesJson(),
        isActive: true,
        isVerified: true,
        verifiedAt: new Date(),
        vendorId: vendor.id,
      },
    });
  } else {
    await prisma.certifiedWorkshop.update({
      where: { id: workshop.id },
      data: {
        isActive: true,
        isVerified: true,
        phone: workshop.phone || vendor.contactPhone,
        email: workshop.email || vendor.contactEmail,
      },
    });
  }

  const services = [
    {
      serviceType: 'DIAGNOSIS',
      name: 'Vehicle Diagnosis',
      nameAr: 'فحص وتشخيص المركبة',
      price: 130,
      estimatedDuration: 45,
    },
    {
      serviceType: 'BRAKE',
      name: 'Brake Service',
      nameAr: 'خدمة الفرامل',
      price: 220,
      estimatedDuration: 90,
    },
    {
      serviceType: 'OIL_CHANGE',
      name: 'Oil Change',
      nameAr: 'تغيير زيت',
      price: 120,
      estimatedDuration: 35,
    },
  ];

  for (const svc of services) {
    const existing = await prisma.certifiedWorkshopService.findFirst({
      where: { workshopId: workshop.id, serviceType: svc.serviceType, name: svc.name },
      select: { id: true },
    });
    if (existing) {
      await prisma.certifiedWorkshopService.update({
        where: { id: existing.id },
        data: {
          nameAr: svc.nameAr,
          price: svc.price,
          estimatedDuration: svc.estimatedDuration,
          isActive: true,
        },
      });
    } else {
      await prisma.certifiedWorkshopService.create({
        data: {
          workshopId: workshop.id,
          serviceType: svc.serviceType,
          name: svc.name,
          nameAr: svc.nameAr,
          description: `${svc.name} service`,
          price: svc.price,
          currency: 'SAR',
          estimatedDuration: svc.estimatedDuration,
          isActive: true,
        },
      });
    }
  }
}

async function ensureComprehensiveCareAssets(vendor) {
  const services = [
    {
      name: 'Comprehensive Maintenance Package',
      nameAr: 'باقة صيانة شاملة',
      description: 'Multi-point maintenance package',
      estimatedDuration: 90,
      price: 280,
    },
    {
      name: 'Engine and Fluids Check',
      nameAr: 'فحص المحرك والسوائل',
      description: 'Engine check, fluids and basic diagnostics',
      estimatedDuration: 60,
      price: 190,
    },
  ];

  for (const svc of services) {
    let service = await prisma.service.findFirst({
      where: { vendorId: vendor.id, name: svc.name, category: 'COMPREHENSIVE_CARE' },
    });
    if (!service) {
      service = await prisma.service.create({
        data: {
          name: svc.name,
          nameAr: svc.nameAr,
          description: svc.description,
          descriptionAr: svc.nameAr,
          type: 'CATALOG',
          category: 'COMPREHENSIVE_CARE',
          vendorId: vendor.id,
          isActive: true,
          requiresVehicle: true,
          estimatedDuration: svc.estimatedDuration,
        },
      });
    } else {
      await prisma.service.update({
        where: { id: service.id },
        data: {
          isActive: true,
          estimatedDuration: svc.estimatedDuration,
        },
      });
    }

    await prisma.servicePricing.upsert({
      where: {
        serviceId_vehicleType: {
          serviceId: service.id,
          vehicleType: 'سيدان',
        },
      },
      update: { basePrice: svc.price, isActive: true },
      create: {
        serviceId: service.id,
        vehicleType: 'سيدان',
        basePrice: svc.price,
      },
    });
  }
}

async function ensureCarWashAssets(vendor) {
  const services = [
    {
      name: 'Exterior Wash',
      nameAr: 'غسيل خارجي',
      description: 'Exterior wash with foam',
      estimatedDuration: 30,
      price: 70,
    },
    {
      name: 'Interior + Exterior Wash',
      nameAr: 'غسيل داخلي وخارجي',
      description: 'Complete interior and exterior cleaning',
      estimatedDuration: 55,
      price: 120,
    },
  ];

  for (const svc of services) {
    let service = await prisma.service.findFirst({
      where: { vendorId: vendor.id, name: svc.name, category: 'CLEANING' },
    });
    if (!service) {
      service = await prisma.service.create({
        data: {
          name: svc.name,
          nameAr: svc.nameAr,
          description: svc.description,
          descriptionAr: svc.nameAr,
          type: 'CATALOG',
          category: 'CLEANING',
          vendorId: vendor.id,
          isActive: true,
          requiresVehicle: true,
          estimatedDuration: svc.estimatedDuration,
        },
      });
    } else {
      await prisma.service.update({
        where: { id: service.id },
        data: { isActive: true, estimatedDuration: svc.estimatedDuration },
      });
    }

    await prisma.servicePricing.upsert({
      where: {
        serviceId_vehicleType: {
          serviceId: service.id,
          vehicleType: 'سيدان',
        },
      },
      update: { basePrice: svc.price, isActive: true },
      create: {
        serviceId: service.id,
        vehicleType: 'سيدان',
        basePrice: svc.price,
      },
    });
  }
}

async function ensureMobileWorkshopAssets(vendor) {
  let mobileWorkshop = await prisma.mobileWorkshop.findFirst({ where: { vendorId: vendor.id } });
  if (!mobileWorkshop) {
    let plateNumber = 'AKF-MW-6001';
    const existingPlate = await prisma.mobileWorkshop.findFirst({ where: { plateNumber } });
    if (existingPlate) {
      plateNumber = `AKF-MW-${Date.now().toString().slice(-6)}`;
    }

    mobileWorkshop = await prisma.mobileWorkshop.create({
      data: {
        name: 'Akfeek Mobile Workshop',
        nameAr: 'أكفيك ورشة متنقلة',
        description: 'Seeded mobile workshop linked to vendor',
        vehicleType: 'Van',
        vehicleModel: 'Mercedes Sprinter',
        year: new Date().getFullYear(),
        plateNumber,
        city: 'Riyadh',
        latitude: 24.7167,
        longitude: 46.6901,
        serviceRadius: 45,
        basePrice: 110,
        pricePerKm: 2.2,
        minPrice: 85,
        currency: 'SAR',
        isActive: true,
        isAvailable: true,
        isVerified: true,
        verifiedAt: new Date(),
        vendorId: vendor.id,
      },
    });
  } else {
    await prisma.mobileWorkshop.update({
      where: { id: mobileWorkshop.id },
      data: {
        isActive: true,
        isAvailable: true,
        city: mobileWorkshop.city || 'Riyadh',
      },
    });
  }

  const services = [
    {
      serviceType: 'OIL_CHANGE',
      name: 'Mobile Oil Change',
      nameAr: 'تغيير زيت متنقل',
      price: 130,
      estimatedDuration: 30,
    },
    {
      serviceType: 'BATTERY',
      name: 'Mobile Battery Check',
      nameAr: 'فحص بطارية متنقل',
      price: 95,
      estimatedDuration: 25,
    },
  ];

  for (const svc of services) {
    const existing = await prisma.mobileWorkshopService.findFirst({
      where: { mobileWorkshopId: mobileWorkshop.id, serviceType: svc.serviceType, name: svc.name },
      select: { id: true },
    });
    if (existing) {
      await prisma.mobileWorkshopService.update({
        where: { id: existing.id },
        data: {
          nameAr: svc.nameAr,
          price: svc.price,
          estimatedDuration: svc.estimatedDuration,
          isActive: true,
        },
      });
    } else {
      await prisma.mobileWorkshopService.create({
        data: {
          mobileWorkshopId: mobileWorkshop.id,
          serviceType: svc.serviceType,
          name: svc.name,
          nameAr: svc.nameAr,
          description: svc.name,
          price: svc.price,
          currency: 'SAR',
          estimatedDuration: svc.estimatedDuration,
          isActive: true,
        },
      });
    }
  }
}

async function main() {
  console.log('🌱 Seeding 6 linked vendors (one per type)...');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const createdAccounts = [];

  for (const def of VENDORS) {
    const { user, vendor } = await upsertVendorAccount(def, passwordHash);

    if (def.key === 'AUTO_PARTS') {
      await ensureAutoPartsVendorAssets(vendor, user.id);
    } else if (def.key === 'TOWING_SERVICE') {
      await ensureTowingVendorAssets(vendor);
    } else if (def.key === 'CERTIFIED_WORKSHOP') {
      await ensureCertifiedWorkshopAssets(vendor);
    } else if (def.key === 'COMPREHENSIVE_CARE') {
      await ensureComprehensiveCareAssets(vendor);
    } else if (def.key === 'CAR_WASH') {
      await ensureCarWashAssets(vendor);
    } else if (def.key === 'MOBILE_WORKSHOP') {
      await ensureMobileWorkshopAssets(vendor);
    }

    createdAccounts.push({
      type: def.key,
      email: def.email,
      password: PASSWORD,
      vendorId: vendor.id,
    });
  }

  console.log('\n✅ Done. Seeded/updated linked vendors with related entities.');
  console.log('\nCredentials:');
  for (const acc of createdAccounts) {
    console.log(`- ${acc.type}: ${acc.email} / ${acc.password}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ seed-6-vendors-linked failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
