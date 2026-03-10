const { PrismaClient, VendorType, AutoPartRootType } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// Real image URLs from Unsplash (free, reliable)
const IMAGES = {
  // Vehicle Brand Logos
  toyota: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=200&h=200&fit=crop',
  honda: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=200&h=200&fit=crop',
  bmw: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=200&h=200&fit=crop',
  mercedes: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=200&h=200&fit=crop',
  nissan: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=200&h=200&fit=crop',
  hyundai: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=200&h=200&fit=crop',
  kia: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=200&h=200&fit=crop',
  ford: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=200&h=200&fit=crop',
  chevrolet: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=200&h=200&fit=crop',
  gmc: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=200&h=200&fit=crop',

  // Vehicle Model Images
  sedan: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop',
  suv: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=300&fit=crop',
  truck: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',

  // Service Images
  carWash: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
  oilChange: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop',
  brakeService: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop',
  engineRepair: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop',
  towing: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',

  // Product Images
  oil: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=300&h=300&fit=crop',
  filter: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=300&h=300&fit=crop',
  brakePad: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=300&h=300&fit=crop',
  battery: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=300&h=300&fit=crop',
  tire: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
  fluid: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=300&h=300&fit=crop',
  accessory: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
};

async function main() {
  console.log('🌱 Starting comprehensive database seeding...\n');

  const hash = await bcrypt.hash('Admin123!', 10);
  const now = new Date();

  // ============================================
  // 0. Admin User
  // ============================================
  console.log('👤 Seeding Admin user...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@akfeek.com' },
    update: {},
    create: {
      email: 'admin@akfeek.com',
      passwordHash: hash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'User',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
        },
      },
    },
  });
  console.log('✅ Admin user: admin@akfeek.com / Admin123!\n');

  // ============================================
  // 1. Vehicle Brands with Logos
  // ============================================
  console.log('🚗 Seeding Vehicle Brands with logos...');
  const brandsData = [
    { name: 'Toyota', nameAr: 'تويوتا', logo: IMAGES.toyota },
    { name: 'Honda', nameAr: 'هوندا', logo: IMAGES.honda },
    { name: 'BMW', nameAr: 'بي إم دبليو', logo: IMAGES.bmw },
    { name: 'Mercedes-Benz', nameAr: 'مرسيدس بنز', logo: IMAGES.mercedes },
    { name: 'Nissan', nameAr: 'نيسان', logo: IMAGES.nissan },
    { name: 'Hyundai', nameAr: 'هيونداي', logo: IMAGES.hyundai },
    { name: 'Kia', nameAr: 'كيا', logo: IMAGES.kia },
    { name: 'Ford', nameAr: 'فورد', logo: IMAGES.ford },
    { name: 'Chevrolet', nameAr: 'شيفروليه', logo: IMAGES.chevrolet },
    { name: 'GMC', nameAr: 'جي إم سي', logo: IMAGES.gmc },
  ];

  const brandIdByName = {};
  for (const brandData of brandsData) {
    const brand = await prisma.vehicleBrand.upsert({
      where: { name: brandData.name },
      update: { logo: brandData.logo, nameAr: brandData.nameAr },
      create: brandData,
    });
    brandIdByName[brandData.name] = brand.id;
  }
  console.log(`✅ Created ${brandsData.length} vehicle brands\n`);

  // ============================================
  // 2. Vehicle Models with Images
  // ============================================
  console.log('📦 Seeding Vehicle Models with images...');
  const modelsData = [
    { brand: 'Toyota', name: 'Camry', nameAr: 'كامري', year: 2023, type: 'SEDAN', image: IMAGES.sedan },
    { brand: 'Toyota', name: 'Camry', nameAr: 'كامري', year: 2022, type: 'SEDAN', image: IMAGES.sedan },
    { brand: 'Toyota', name: 'Corolla', nameAr: 'كورولا', year: 2023, type: 'SEDAN', image: IMAGES.sedan },
    { brand: 'Toyota', name: 'Land Cruiser', nameAr: 'لاندكروزر', year: 2023, type: 'SUV', image: IMAGES.suv },
    { brand: 'Toyota', name: 'RAV4', nameAr: 'راف4', year: 2023, type: 'SMALL_SUV', image: IMAGES.suv },
    { brand: 'Honda', name: 'Accord', nameAr: 'أكورد', year: 2023, type: 'SEDAN', image: IMAGES.sedan },
    { brand: 'Honda', name: 'Civic', nameAr: 'سيفيك', year: 2023, type: 'SEDAN', image: IMAGES.sedan },
    { brand: 'Honda', name: 'CR-V', nameAr: 'سي آر في', year: 2023, type: 'SMALL_SUV', image: IMAGES.suv },
    { brand: 'BMW', name: 'X5', nameAr: 'إكس 5', year: 2023, type: 'SUV', image: IMAGES.suv },
    { brand: 'BMW', name: '3 Series', nameAr: 'سيريز 3', year: 2023, type: 'SEDAN', image: IMAGES.sedan },
    { brand: 'Mercedes-Benz', name: 'C-Class', nameAr: 'فئة سي', year: 2023, type: 'SEDAN', image: IMAGES.sedan },
    { brand: 'Mercedes-Benz', name: 'GLE', nameAr: 'جي إل إي', year: 2023, type: 'SUV', image: IMAGES.suv },
    { brand: 'Nissan', name: 'Altima', nameAr: 'ألتيما', year: 2023, type: 'SEDAN', image: IMAGES.sedan },
    { brand: 'Nissan', name: 'Patrol', nameAr: 'باترول', year: 2023, type: 'SUV', image: IMAGES.suv },
    { brand: 'Hyundai', name: 'Elantra', nameAr: 'إلنترا', year: 2023, type: 'SEDAN', image: IMAGES.sedan },
    { brand: 'Hyundai', name: 'Tucson', nameAr: 'توسان', year: 2023, type: 'SMALL_SUV', image: IMAGES.suv },
    { brand: 'Kia', name: 'Optima', nameAr: 'أوبتيما', year: 2023, type: 'SEDAN', image: IMAGES.sedan },
    { brand: 'Kia', name: 'Sportage', nameAr: 'سبورتاج', year: 2023, type: 'SMALL_SUV', image: IMAGES.suv },
    { brand: 'Ford', name: 'Explorer', nameAr: 'إكسبلورر', year: 2023, type: 'SUV', image: IMAGES.suv },
    { brand: 'Ford', name: 'F-150', nameAr: 'إف 150', year: 2023, type: 'TRUCK', image: IMAGES.truck },
    { brand: 'Chevrolet', name: 'Tahoe', nameAr: 'تاهو', year: 2023, type: 'SUV', image: IMAGES.suv },
    { brand: 'GMC', name: 'Yukon', nameAr: 'يوكون', year: 2023, type: 'SUV', image: IMAGES.suv },
  ];

  const modelIdByKey = {};
  for (const modelData of modelsData) {
    const model = await prisma.vehicleModel.upsert({
      where: {
        brandId_name_year: {
          brandId: brandIdByName[modelData.brand],
          name: modelData.name,
          year: modelData.year,
        },
      },
      update: { imageUrl: modelData.image, nameAr: modelData.nameAr },
      create: {
        brandId: brandIdByName[modelData.brand],
        name: modelData.name,
        nameAr: modelData.nameAr,
        year: modelData.year,
        type: modelData.type,
        imageUrl: modelData.image,
      },
    });
    const key = `${modelData.brand}-${modelData.name}-${modelData.year}`;
    modelIdByKey[key] = model.id;
  }
  console.log(`✅ Created ${modelsData.length} vehicle models\n`);

  // ============================================
  // 3. Users: Customers, Technicians, Suppliers
  // ============================================
  console.log('👥 Seeding Users (Customers, Technicians, Suppliers)...');
  const customersData = [
    { email: 'ahmed.ali@example.com', phone: '+966501234001', firstName: 'Ahmed', lastName: 'Ali', city: 'Riyadh' },
    { email: 'sara.mohammed@example.com', phone: '+966501234002', firstName: 'Sara', lastName: 'Mohammed', city: 'Jeddah' },
    { email: 'omar.hassan@example.com', phone: '+966501234003', firstName: 'Omar', lastName: 'Hassan', city: 'Riyadh' },
    { email: 'fatima.ahmed@example.com', phone: '+966501234004', firstName: 'Fatima', lastName: 'Ahmed', city: 'Dammam' },
    { email: 'khalid.saud@example.com', phone: '+966501234005', firstName: 'Khalid', lastName: 'Saud', city: 'Riyadh' },
    { email: 'noor.abdullah@example.com', phone: '+966501234006', firstName: 'Noor', lastName: 'Abdullah', city: 'Jeddah' },
  ];

  const techniciansData = [
    { email: 'tech1@akfeek.com', phone: '+966551234001', firstName: 'Mohammed', lastName: 'Al-Rashid', lat: 24.7136, lng: 46.6753, license: 'TECH-001', experience: 5 },
    { email: 'tech2@akfeek.com', phone: '+966551234002', firstName: 'Fahad', lastName: 'Al-Mutairi', lat: 24.7500, lng: 46.7000, license: 'TECH-002', experience: 8 },
    { email: 'tech3@akfeek.com', phone: '+966551234003', firstName: 'Saud', lastName: 'Al-Otaibi', lat: 24.6800, lng: 46.6500, license: 'TECH-003', experience: 3 },
    { email: 'tech4@akfeek.com', phone: '+966551234004', firstName: 'Yousef', lastName: 'Al-Ghamdi', lat: 24.7200, lng: 46.7200, license: 'TECH-004', experience: 10 },
    { email: 'tech5@akfeek.com', phone: '+966551234005', firstName: 'Abdulrahman', lastName: 'Al-Shehri', lat: 24.7000, lng: 46.6400, license: 'TECH-005', experience: 6 },
    { email: 'tech_wash@akfeek.com', phone: '+966551234999', firstName: 'Wash', lastName: 'Master', lat: 24.7100, lng: 46.6800, license: 'WASH-001', experience: 4, specializations: ['CLEANING', 'EMERGENCY'] },
  ];

  const suppliersData = [
    { email: 'supplier1@akfeek.com', phone: '+966561234001', businessName: 'AutoParts Co.', businessNameAr: 'شركة قطع السيارات', city: 'Riyadh' },
    { email: 'supplier2@akfeek.com', phone: '+966561234002', businessName: 'Car Supplies Ltd.', businessNameAr: 'مؤسسة مستلزمات السيارات', city: 'Jeddah' },
  ];

  const allUsers = [];
  const allCustomers = [];
  const allTechnicians = [];
  const allSuppliers = [];

  // Create customers
  for (const custData of customersData) {
    const customer = await prisma.user.upsert({
      where: { email: custData.email },
      update: {},
      create: {
        email: custData.email,
        phone: custData.phone,
        passwordHash: hash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: custData.firstName,
            lastName: custData.lastName,
            avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=200&h=200&fit=crop`,
          },
        },
      },
    });
    allCustomers.push(customer);
    allUsers.push(customer);
  }

  // Create technicians
  for (const techData of techniciansData) {
    const tech = await prisma.user.upsert({
      where: { email: techData.email },
      update: {},
      create: {
        email: techData.email,
        phone: techData.phone,
        passwordHash: hash,
        role: 'TECHNICIAN',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: techData.firstName,
            lastName: techData.lastName,
            licenseNumber: techData.license,
            yearsExperience: techData.experience,
            currentLat: techData.lat,
            currentLng: techData.lng,
            isAvailable: true,
            serviceRadius: 15,
            specializations: techData.specializations || ['MAINTENANCE', 'REPAIR', 'EMERGENCY'],
            avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=200&h=200&fit=crop`,
          },
        },
      },
    });
    allTechnicians.push(tech);
    allUsers.push(tech);
  }

  // Create suppliers
  for (const supData of suppliersData) {
    const supplier = await prisma.user.upsert({
      where: { email: supData.email },
      update: {},
      create: {
        email: supData.email,
        phone: supData.phone,
        passwordHash: hash,
        role: 'SUPPLIER',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: 'Supplier',
            lastName: 'Company',
            businessName: supData.businessName,
            businessNameAr: supData.businessNameAr,
            businessLicense: `BL-${supData.email.split('@')[0].toUpperCase()}`,
            warehouseLocation: supData.city,
          },
        },
      },
    });
    allSuppliers.push(supplier);
    allUsers.push(supplier);
  }

  console.log(`✅ Created ${allCustomers.length} customers, ${allTechnicians.length} technicians, ${allSuppliers.length} suppliers\n`);

  // ============================================
  // 4. Addresses for Customers
  // ============================================
  console.log('📍 Seeding Addresses...');
  const riyadhAddresses = [
    { label: 'Home', labelAr: 'المنزل', street: 'King Fahd Road', streetAr: 'طريق الملك فهد', lat: 24.7136, lng: 46.6753 },
    { label: 'Work', labelAr: 'العمل', street: 'Olaya Street', streetAr: 'شارع العليا', lat: 24.6900, lng: 46.6850 },
  ];
  const jeddahAddresses = [
    { label: 'Home', labelAr: 'المنزل', street: 'Corniche Road', streetAr: 'طريق الكورنيش', lat: 21.4858, lng: 39.1925 },
    { label: 'Work', labelAr: 'العمل', street: 'Tahlia Street', streetAr: 'شارع التحلية', lat: 21.5000, lng: 39.2000 },
  ];

  let addressCount = 0;
  for (let i = 0; i < allCustomers.length; i++) {
    const customer = allCustomers[i];
    const addresses = i < 3 ? riyadhAddresses : jeddahAddresses;
    for (const addrData of addresses) {
      await prisma.address.create({
        data: {
          userId: customer.id,
          label: addrData.label,
          labelAr: addrData.labelAr,
          street: addrData.street,
          streetAr: addrData.streetAr,
          city: i < 3 ? 'Riyadh' : 'Jeddah',
          cityAr: i < 3 ? 'الرياض' : 'جدة',
          country: 'SA',
          latitude: addrData.lat + (Math.random() * 0.01 - 0.005),
          longitude: addrData.lng + (Math.random() * 0.01 - 0.005),
          isDefault: addrData.label === 'Home',
        },
      });
      addressCount++;
    }
  }
  console.log(`✅ Created ${addressCount} addresses\n`);

  // ============================================
  // 5. User Vehicles with Real Data
  // ============================================
  console.log('🚙 Seeding User Vehicles...');
  const plateLetters = ['ABC', 'DEF', 'GHI', 'JKL', 'MNO'];
  const plateDigits = ['1234', '5678', '9012', '3456', '7890'];
  const colors = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue'];
  const fuelTypes = ['Petrol', 'Diesel', 'Hybrid'];
  const engineCapacities = ['2.0L', '2.5L', '3.0L', '3.5L', '4.0L'];

  const allModels = await prisma.vehicleModel.findMany();
  let vehicleCount = 0;

  for (let i = 0; i < allCustomers.length; i++) {
    const customer = allCustomers[i];
    const numVehicles = i < 2 ? 2 : 1; // First 2 customers have 2 vehicles each

    for (let v = 0; v < numVehicles; v++) {
      const model = allModels[(i * 2 + v) % allModels.length];
      const vin = `VIN${String(2000000 + vehicleCount).padStart(7, '0')}`;

      const existing = await prisma.userVehicle.findFirst({
        where: { OR: [{ vin: vin }] },
      });
      if (existing) {
        vehicleCount++;
        continue;
      }

      await prisma.userVehicle.create({
        data: {
          userId: customer.id,
          vehicleModelId: model.id,
          plateDigits: String(1000 + vehicleCount),
          plateLettersEn: plateLetters[i % plateLetters.length],
          plateLettersAr: 'أ ب ج',
          color: colors[(i + v) % colors.length],
          vin: vin,
          currentMileage: 10000 + Math.floor(Math.random() * 50000),
          fuelType: fuelTypes[Math.floor(Math.random() * fuelTypes.length)],
          engineCapacity: engineCapacities[Math.floor(Math.random() * engineCapacities.length)],
          isDefault: v === 0,
        },
      });
      vehicleCount++;
    }
  }
  console.log(`✅ Created ${vehicleCount} user vehicles\n`);

  // ============================================
  // 6. Services with Images
  // ============================================
  console.log('🔧 Seeding Services with images...');
  const servicesData = [
    { name: 'Basic Car Wash', nameAr: 'غسيل سيارة أساسي', desc: 'Exterior wash and interior vacuum', descAr: 'غسيل خارجي وشفط الداخل', type: 'FIXED', category: 'CLEANING', duration: 30, image: IMAGES.carWash },
    { name: 'Premium Car Wash', nameAr: 'غسيل سيارة متميز', desc: 'Full wash, wax, and interior detailing', descAr: 'غسيل كامل، تلميع، وتنظيف داخلي شامل', type: 'FIXED', category: 'CLEANING', duration: 90, image: IMAGES.carWash },
    { name: 'Polishing & Waxing', nameAr: 'تلميع وشمع', desc: 'Professional polishing and wax coating', descAr: 'تلميع احترافي وطبقة شمع', type: 'FIXED', category: 'CLEANING', duration: 120, image: IMAGES.carWash },
    { name: 'Oil Change', nameAr: 'تغيير الزيت', desc: 'Engine oil and filter replacement', descAr: 'تغيير زيت المحرك والفلتر', type: 'CATALOG', category: 'MAINTENANCE', duration: 45, image: IMAGES.oilChange },
    { name: 'Brake Service', nameAr: 'خدمة الفرامل', desc: 'Brake inspection and pad replacement', descAr: 'فحص الفرامل وتغيير الفحمات', type: 'CATALOG', category: 'MAINTENANCE', duration: 90, image: IMAGES.brakeService },
    { name: 'Tire Rotation', nameAr: 'تدوير الإطارات', desc: 'Professional tire rotation and balancing', descAr: 'تدوير وموازنة الإطارات احترافياً', type: 'FIXED', category: 'MAINTENANCE', duration: 60, image: IMAGES.brakeService },
    { name: 'Battery Replacement', nameAr: 'تغيير البطارية', desc: 'Old battery removal and new installation', descAr: 'إزالة البطارية القديمة وتركيب جديدة', type: 'CATALOG', category: 'MAINTENANCE', duration: 30, image: IMAGES.brakeService },
    { name: 'Engine Repair', nameAr: 'إصلاح المحرك', desc: 'Complete engine diagnostic and repair', descAr: 'فحص وإصلاح المحرك الكامل', type: 'CATALOG', category: 'REPAIR', duration: 240, image: IMAGES.engineRepair },
    { name: 'Transmission Repair', nameAr: 'إصلاح ناقل الحركة', desc: 'Transmission diagnostic and repair', descAr: 'فحص وإصلاح ناقل الحركة', type: 'CATALOG', category: 'REPAIR', duration: 300, image: IMAGES.engineRepair },
    { name: 'AC Repair', nameAr: 'إصلاح المكيف', desc: 'Air conditioning system repair and recharge', descAr: 'إصلاح نظام التكييف وإعادة الشحن', type: 'CATALOG', category: 'REPAIR', duration: 120, image: IMAGES.engineRepair },
    { name: 'Roadside Assistance', nameAr: 'مساعدة على الطريق', desc: 'On-location emergency assistance', descAr: 'مساعدة طارئة في الموقع', type: 'EMERGENCY', category: 'EMERGENCY', duration: 60, image: IMAGES.towing },
    { name: 'Towing Service', nameAr: 'خدمة السحب', desc: 'Vehicle towing to workshop', descAr: 'سحب المركبة إلى الورشة', type: 'EMERGENCY', category: 'EMERGENCY', duration: 45, image: IMAGES.towing },
    { name: 'Battery Jump Start', nameAr: 'تشغيل البطارية', desc: 'Emergency battery jump start', descAr: 'تشغيل البطارية الطارئ', type: 'EMERGENCY', category: 'EMERGENCY', duration: 20, image: IMAGES.towing },
    { name: 'Ekfik Full Inspection', nameAr: 'فحص أكفيك الكامل', desc: 'Comprehensive vehicle inspection with valet service', descAr: 'فحص شامل للمركبة مع خدمة الڤاليه', type: 'INSPECTION', category: 'INSPECTION', duration: 180, image: IMAGES.brakeService },
    { name: 'Pre-Purchase Inspection', nameAr: 'فحص قبل الشراء', desc: 'Complete inspection before buying', descAr: 'فحص كامل قبل الشراء', type: 'INSPECTION', category: 'INSPECTION', duration: 120, image: IMAGES.brakeService },
    { name: 'Comprehensive Care Service', nameAr: 'خدمة العناية الشاملة', desc: 'Full care package: inspection, maintenance check, cleaning and fluid top-up', descAr: 'باقة عناية شاملة: فحص، صيانة دورية، تنظيف وتعبئة سوائل', type: 'FIXED', category: 'COMPREHENSIVE_CARE', duration: 150, image: IMAGES.brakeService },
  ];

  const serviceIdByName = {};
  for (const svcData of servicesData) {
    const existing = await prisma.service.findFirst({
      where: { name: svcData.name, category: svcData.category },
    });
    const service = existing
      ? await prisma.service.update({
        where: { id: existing.id },
        data: { imageUrl: svcData.image },
      })
      : await prisma.service.create({
        data: {
          name: svcData.name,
          nameAr: svcData.nameAr,
          description: svcData.desc,
          descriptionAr: svcData.descAr,
          type: svcData.type,
          category: svcData.category,
          estimatedDuration: svcData.duration,
          imageUrl: svcData.image,
          isActive: true,
        },
      });
    serviceIdByName[svcData.name] = service.id;
  }

  // ============================================
  // Mobile Car Service (خدمة الزرَش / الصيانة المتنقلة) – parent + sub-services
  // ============================================
  console.log('🚐 Seeding Mobile Car Service (parent + sub-services)...');
  let mobileCarParent = await prisma.service.findFirst({
    where: { type: 'MOBILE_CAR_SERVICE', parentServiceId: null },
  });
  if (!mobileCarParent) {
    mobileCarParent = await prisma.service.create({
      data: {
        name: 'Mobile Car Service',
        nameAr: 'خدمة الزرَش / الصيانة المتنقلة',
        description: 'Mobile workshop and maintenance at your location.',
        descriptionAr: 'ورشة متنقلة وصيانة في موقعك.',
        type: 'MOBILE_CAR_SERVICE',
        category: 'MAINTENANCE',
        estimatedDuration: null,
        imageUrl: IMAGES.towing,
        isActive: true,
        requiresVehicle: true,
        parentServiceId: null,
      },
    });
  }

  const mobileSubServicesData = [
    { name: 'Oil Change (Mobile)', nameAr: 'تغيير الزيت (متنقل)', category: 'MAINTENANCE', duration: 45 },
    { name: 'Periodic Maintenance (Mobile)', nameAr: 'الصيانة الدورية (متنقلة)', category: 'MAINTENANCE', duration: 90 },
    { name: 'Tire Replacement (Mobile)', nameAr: 'تغيير الإطارات (متنقل)', category: 'MAINTENANCE', duration: 60 },
    { name: 'Battery Replacement (Mobile)', nameAr: 'تغيير البطارية (متنقل)', category: 'MAINTENANCE', duration: 30 },
    { name: 'Electrical Repairs (Mobile)', nameAr: 'إصلاحات كهربائية (متنقلة)', category: 'REPAIR', duration: 120 },
    { name: 'Other Mechanical (Mobile)', nameAr: 'أعمال ميكانيكية أخرى (متنقلة)', category: 'REPAIR', duration: 60 },
  ];

  const mobileSubServiceIdByName = {};
  for (const sub of mobileSubServicesData) {
    const existing = await prisma.service.findFirst({
      where: { name: sub.name, parentServiceId: mobileCarParent.id },
    });
    const service = existing
      ? existing
      : await prisma.service.create({
        data: {
          name: sub.name,
          nameAr: sub.nameAr,
          description: `Mobile ${sub.name} at your location.`,
          descriptionAr: `خدمة ${sub.nameAr} في موقعك.`,
          type: 'MOBILE_CAR_SERVICE',
          category: sub.category,
          estimatedDuration: sub.duration,
          imageUrl: IMAGES.oilChange,
          isActive: true,
          requiresVehicle: true,
          parentServiceId: mobileCarParent.id,
        },
      });
    mobileSubServiceIdByName[sub.name] = service.id;
  }
  console.log(`✅ Created Mobile Car Service (parent + ${mobileSubServicesData.length} sub-services)\n`);

  // Service Pricing
  console.log('💰 Setting up service pricing...');
  const vehicleTypes = ['SEDAN', 'SMALL_SUV', 'SUV', 'TRUCK'];
  const basePrices = { SEDAN: 50, SMALL_SUV: 75, SUV: 100, TRUCK: 150 };
  const allServices = await prisma.service.findMany();
  let pricingCount = 0;

  for (const service of allServices) {
    let multiplier = 1;
    if (service.category === 'REPAIR') multiplier = 3;
    else if (service.category === 'MAINTENANCE') multiplier = 1.5;
    else if (service.category === 'EMERGENCY') multiplier = 2;
    else if (service.category === 'INSPECTION') multiplier = 2.5;
    else if (service.category === 'COMPREHENSIVE_CARE') multiplier = 2.2;

    for (const vehicleType of vehicleTypes) {
      const base = (basePrices[vehicleType] || 75) * multiplier;
      await prisma.servicePricing.upsert({
        where: { serviceId_vehicleType: { serviceId: service.id, vehicleType } },
        update: { basePrice: base, discountedPrice: base * 0.9 },
        create: { serviceId: service.id, vehicleType, basePrice: base, discountedPrice: base * 0.9 },
      });
      pricingCount++;
    }
  }
  console.log(`✅ Created ${pricingCount} pricing entries\n`);

  // ============================================
  // 7. Supplier Parts
  // ============================================
  console.log('🏭 Seeding Supplier Parts...');
  const supplierPartsData = [
    { supplier: 0, sku: 'SP-OIL-001', name: 'Premium Engine Oil 5W-30', nameAr: 'زيت محرك ممتاز 5W-30', category: 'Engine Oil', brand: 'Castrol', price: 75.00, stock: 500, minOrder: 10 },
    { supplier: 0, sku: 'SP-FLT-001', name: 'High-Quality Oil Filter', nameAr: 'فلتر زيت عالي الجودة', category: 'Filter', brand: 'Bosch', price: 20.00, stock: 300, minOrder: 5 },
    { supplier: 1, sku: 'SP-BRK-001', name: 'Ceramic Brake Pads', nameAr: 'فحمات فرامل سيراميك', category: 'Brake', brand: 'Brembo', price: 120.00, stock: 200, minOrder: 2 },
    { supplier: 1, sku: 'SP-BAT-001', name: 'AGM Battery 12V 70Ah', nameAr: 'بطارية AGM 12 فولت 70 أمبير', category: 'Battery', brand: 'Varta', price: 200.00, stock: 150, minOrder: 1 },
  ];

  let supplierPartCount = 0;
  for (const partData of supplierPartsData) {
    await prisma.supplierPart.upsert({
      where: {
        supplierId_sku: {
          supplierId: allSuppliers[partData.supplier].id,
          sku: partData.sku,
        },
      },
      update: {
        stockQuantity: partData.stock,
        unitPrice: partData.price,
      },
      create: {
        supplierId: allSuppliers[partData.supplier].id,
        sku: partData.sku,
        name: partData.name,
        nameAr: partData.nameAr,
        category: partData.category,
        brand: partData.brand,
        unitPrice: partData.price,
        stockQuantity: partData.stock,
        minimumOrder: partData.minOrder,
        isActive: true,
      },
    });
    supplierPartCount++;
  }
  console.log(`✅ Created ${supplierPartCount} supplier parts\n`);

  // ============================================
  // 9. Complete Bookings with Services, Products, Status History
  // ============================================
  console.log('📅 Seeding Complete Bookings...');
  const allVehicles = await prisma.userVehicle.findMany();
  const bookingStatuses = [
    'PENDING', 'CONFIRMED', 'BROADCASTING', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS',
    'PARTS_NEEDED', 'PARTS_ORDERED', 'COMPLETED', 'DELIVERED', 'CANCELLED'
  ];
  const times = ['09:00', '10:30', '14:00', '15:30', '11:00', '16:00'];

  let bookingNum = 1000;
  const createdBookings = [];

  for (let i = 0; i < allCustomers.length; i++) {
    const customer = allCustomers[i];
    const customerVehicles = allVehicles.filter((v) => v.userId === customer.id);
    if (customerVehicles.length === 0) continue;

    // Create 3-4 bookings per customer
    const numBookings = i < 3 ? 4 : 3;
    for (let j = 0; j < numBookings; j++) {
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() - (i * 4 + j));
      const status = bookingStatuses[(i * 4 + j) % bookingStatuses.length];
      const vehicle = customerVehicles[j % customerVehicles.length];
      const technician = status !== 'PENDING' && status !== 'BROADCASTING' ? allTechnicians[(i + j) % allTechnicians.length] : null;

      // Calculate pricing
      const servicePrice = 80 + (i * 10) + (j * 5);
      const productPrice = 0; // Product catalog removed; use bookingAutoParts for parts
      const laborFee = 50 + (i * 5);
      const deliveryFee = j % 3 === 0 ? 25 : 0;
      const partsTotal = productPrice;
      const subtotal = servicePrice + productPrice + laborFee + deliveryFee;
      const tax = subtotal * 0.15;
      const discount = j % 4 === 0 ? subtotal * 0.1 : 0;
      const totalPrice = subtotal + tax - discount;

      const bookingNumber = `BKG-COMP-${String(bookingNum).padStart(5, '0')}`;
      bookingNum++;

      const existingBooking = await prisma.booking.findUnique({ where: { bookingNumber } });
      if (existingBooking) continue;

      const booking = await prisma.booking.create({
        data: {
          bookingNumber,
          customerId: customer.id,
          vehicleId: vehicle.id,
          technicianId: technician?.id || null,
          scheduledDate,
          scheduledTime: times[(i * 4 + j) % times.length],
          status,
          subtotal,
          laborFee,
          deliveryFee,
          partsTotal,
          discount,
          tax,
          totalPrice,
          notes: j % 2 === 0 ? 'Customer requested morning service' : null,
        },
      });
      createdBookings.push(booking);

      // Add services to booking
      const selectedServices = allServices.slice(0, j % 2 === 0 ? 2 : 1);
      for (const service of selectedServices) {
        const unitPrice = 80 + Math.floor(Math.random() * 40);
        await prisma.bookingService.create({
          data: {
            bookingId: booking.id,
            serviceId: service.id,
            quantity: 1,
            unitPrice,
            totalPrice: unitPrice,
          },
        });
      }

      // Add status history
      const statusHistory = [
        { status: 'PENDING', timestamp: new Date(booking.createdAt) },
        { status: status === 'PENDING' ? null : 'CONFIRMED', timestamp: new Date(booking.createdAt.getTime() + 60000) },
      ];
      if (status !== 'PENDING' && status !== 'CONFIRMED') {
        statusHistory.push({ status, timestamp: new Date(booking.createdAt.getTime() + 120000) });
      }

      for (const hist of statusHistory.filter((h) => h.status)) {
        await prisma.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: hist.status === 'CONFIRMED' ? 'PENDING' : 'CONFIRMED',
            toStatus: hist.status,
            changedBy: technician?.id || customer.id,
            reason: `Status changed to ${hist.status}`,
            timestamp: hist.timestamp,
          },
        });
      }
    }
  }
  console.log(`✅ Created ${createdBookings.length} complete bookings with services and status history\n`);

  // ============================================
  // 10. Job Broadcasts with Offers
  // ============================================
  console.log('📡 Seeding Job Broadcasts...');
  // Get bookings that can have broadcasts (or create new ones with BROADCASTING status)
  const allBookings = await prisma.booking.findMany({ take: 10, orderBy: { createdAt: 'desc' } });
  const broadcastBookings = allBookings.filter((b) => ['BROADCASTING', 'OFFERS_RECEIVED', 'TECHNICIAN_ASSIGNED', 'PENDING'].includes(b.status));
  let broadcastCount = 0;

  for (let idx = 0; idx < Math.min(5, broadcastBookings.length); idx++) {
    const booking = broadcastBookings[idx];
    const customer = allCustomers.find((c) => c.id === booking.customerId);
    if (!customer) continue;

    const address = await prisma.address.findFirst({ where: { userId: customer.id, isDefault: true } });

    const existingBroadcast = await prisma.jobBroadcast.findUnique({ where: { bookingId: booking.id } });
    if (existingBroadcast) continue;

    const broadcastUntil = new Date(now);
    broadcastUntil.setHours(broadcastUntil.getHours() + 2);

    const broadcast = await prisma.jobBroadcast.create({
      data: {
        bookingId: booking.id,
        customerId: booking.customerId,
        addressId: address?.id || null,
        latitude: address?.latitude || 24.7136,
        longitude: address?.longitude || 46.6753,
        locationAddress: address ? `${address.street}, ${address.city}` : 'Riyadh, Saudi Arabia',
        radiusKm: 10,
        broadcastUntil,
        description: idx === 2 ? 'Mobile Car Wash Request. Need cleaning.' : 'Vehicle breakdown on highway. Need immediate assistance.',
        urgency: ['LOW', 'MEDIUM', 'HIGH'][idx % 3],
        estimatedBudget: Number(booking.totalPrice) * 1.2,
        status: idx === 0 ? 'TECHNICIAN_SELECTED' : idx === 1 ? 'OFFERS_RECEIVED' : 'BROADCASTING',
      },
    });
    broadcastCount++;

    // Create offers for some broadcasts
    if (broadcast.status === 'OFFERS_RECEIVED' || broadcast.status === 'TECHNICIAN_SELECTED') {
      const numOffers = broadcast.status === 'TECHNICIAN_SELECTED' ? 3 : 2;
      for (let o = 0; o < numOffers; o++) {
        const tech = allTechnicians[o % allTechnicians.length];
        const techProfile = await prisma.profile.findUnique({ where: { userId: tech.id } });
        const bidAmount = Number(booking.totalPrice) * (0.9 + Math.random() * 0.2);
        const distance = 2 + Math.random() * 8;
        const estimatedArrival = Math.floor(5 + distance * 2);

        await prisma.jobOffer.create({
          data: {
            broadcastId: broadcast.id,
            technicianId: tech.id,
            bidAmount,
            estimatedArrival,
            message: o === 0 && broadcast.status === 'TECHNICIAN_SELECTED' ? 'I can arrive in 10 minutes. Experienced technician.' : null,
            technicianLat: techProfile?.currentLat || 24.7136,
            technicianLng: techProfile?.currentLng || 46.6753,
            distanceKm: distance,
            isSelected: o === 0 && broadcast.status === 'TECHNICIAN_SELECTED',
          },
        });
      }
    }
  }
  console.log(`✅ Created ${broadcastCount} job broadcasts with offers\n`);

  // ============================================
  // 11. Inspection Reports with Items
  // ============================================
  console.log('🔍 Seeding Inspection Reports...');
  // Use existing bookings or created ones
  const allBookingsForInspection = await prisma.booking.findMany({ take: 6, orderBy: { createdAt: 'desc' } });
  let inspectionCount = 0;

  for (let idx = 0; idx < Math.min(4, allBookingsForInspection.length); idx++) {
    const booking = allBookingsForInspection[idx];
    const vehicle = allVehicles.find((v) => v.id === booking.vehicleId);
    const technician = allTechnicians[idx % allTechnicians.length];

    // Check if inspection already exists
    const existing = await prisma.inspectionReport.findUnique({ where: { bookingId: booking.id } });
    if (existing) continue;

    const statuses = ['PENDING', 'COMPLETED', 'APPROVED'];
    const status = statuses[idx % statuses.length];
    const customerResponse = status === 'APPROVED' ? 'APPROVED' : status === 'COMPLETED' ? null : null;

    const report = await prisma.inspectionReport.create({
      data: {
        bookingId: booking.id,
        technicianId: technician.id,
        mileage: vehicle?.currentMileage || 25000,
        overallCondition: ['GOOD', 'FAIR', 'POOR'][idx % 3],
        estimatedCost: Number(booking.totalPrice) * 1.1,
        estimatedDuration: 4,
        status,
        customerResponse,
        respondedAt: customerResponse ? new Date() : null,
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop',
          'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop',
        ]),
      },
    });
    inspectionCount++;

    // Add inspection items
    const items = [
      { category: 'Engine', issue: 'Oil leak detected', issueAr: 'تسرب زيت', severity: 'MEDIUM', cost: 150, requiresPart: true, partName: 'Oil Seal', partSku: 'OIL-SEAL-001' },
      { category: 'Brakes', issue: 'Brake pads worn', issueAr: 'فحمات الفرامل مستهلكة', severity: 'HIGH', cost: 200, requiresPart: true, partName: 'Brake Pads', partSku: 'BRK-001' },
      { category: 'Tires', issue: 'Tire tread low', issueAr: 'نحت الإطارات منخفض', severity: 'LOW', cost: 300, requiresPart: true, partName: 'Tire Set', partSku: 'TIR-001' },
    ];

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      await prisma.inspectionItem.create({
        data: {
          reportId: report.id,
          category: item.category,
          issue: item.issue,
          issueAr: item.issueAr,
          severity: item.severity,
          recommendedAction: `Replace ${item.partName}`,
          estimatedCost: item.cost,
          requiresPart: item.requiresPart,
          partName: item.partName,
          partSku: item.partSku,
          priority: idx + 1,
        },
      });
    }
  }
  console.log(`✅ Created ${inspectionCount} inspection reports with items\n`);

  // ============================================
  // 12. Supply Requests
  // ============================================
  console.log('📦 Seeding Supply Requests...');
  const supplyRequestStatuses = ['PENDING', 'ACCEPTED', 'IN_PREPARATION', 'READY_FOR_PICKUP', 'DELIVERED'];
  const allSupplierParts = await prisma.supplierPart.findMany();
  const allBookingsForSupply = await prisma.booking.findMany({ take: 10, orderBy: { createdAt: 'desc' } });
  let supplyRequestCount = 0;

  for (let i = 0; i < Math.min(allTechnicians.length, 5); i++) {
    const tech = allTechnicians[i];
    const supplier = allSuppliers[i % allSuppliers.length];
    const booking = allBookingsForSupply[i % allBookingsForSupply.length];

    if (allSupplierParts.length === 0) continue;

    const requestNumber = `SR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(supplyRequestCount + 1000).padStart(4, '0')}`;
    const status = supplyRequestStatuses[i % supplyRequestStatuses.length];
    const part = allSupplierParts[i % allSupplierParts.length];
    const quantity = 2 + Math.floor(Math.random() * 3);
    const unitPrice = Number(part.unitPrice);
    const totalPrice = unitPrice * quantity;
    const deliveryFee = 15;
    const markup = totalPrice * 0.1;
    const totalCost = totalPrice + deliveryFee + markup;

    const existingSR = await prisma.supplyRequest.findUnique({ where: { requestNumber } });
    if (existingSR) {
      supplyRequestCount++;
      continue;
    }

    const supplyRequest = await prisma.supplyRequest.create({
      data: {
        requestNumber,
        technicianId: tech.id,
        supplierId: supplier.id,
        bookingId: booking.id,
        deliveryAddress: 'Workshop Address, Riyadh',
        deliveryLat: 24.7136,
        deliveryLng: 46.6753,
        subtotal: totalPrice,
        deliveryFee,
        markup,
        totalCost,
        status,
        requestedAt: new Date(now.getTime() - (i * 3600000)),
        acceptedAt: status !== 'PENDING' ? new Date(now.getTime() - (i * 3600000) + 1800000) : null,
        deliveredAt: status === 'DELIVERED' ? new Date(now.getTime() - (i * 3600000) + 7200000) : null,
      },
    });
    supplyRequestCount++;

    // Add supply request items
    await prisma.supplyRequestItem.create({
      data: {
        requestId: supplyRequest.id,
        partId: part.id,
        quantity,
        unitPrice,
        totalPrice,
      },
    });
  }
  console.log(`✅ Created ${supplyRequestCount} supply requests\n`);

  // ============================================
  // 13. Invoices with Line Items
  // ============================================
  console.log('🧾 Seeding Invoices with line items...');
  const allBookingsForInvoice = await prisma.booking.findMany({
    where: { status: { in: ['COMPLETED', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED'] } },
    take: 15,
    orderBy: { createdAt: 'desc' },
  });
  const invoiceStatuses = ['DRAFT', 'PENDING', 'PAID', 'PARTIALLY_PAID'];
  let invoiceNum = 2000;
  let invoiceCount = 0;

  for (let idx = 0; idx < allBookingsForInvoice.length; idx++) {
    const booking = allBookingsForInvoice[idx];

    const existingInv = await prisma.invoice.findUnique({ where: { bookingId: booking.id } });
    if (existingInv) continue;

    let invNumber = `INV-COMP-${String(invoiceNum).padStart(5, '0')}`;
    while (await prisma.invoice.findUnique({ where: { invoiceNumber: invNumber } })) {
      invoiceNum++;
      invNumber = `INV-COMP-${String(invoiceNum).padStart(5, '0')}`;
    }
    invoiceNum++;

    const totalAmount = Number(booking.totalPrice) || 150;
    const status = invoiceStatuses[idx % invoiceStatuses.length];
    const paidAmount = status === 'PAID' ? totalAmount : status === 'PARTIALLY_PAID' ? totalAmount * 0.5 : 0;
    const dueDate = new Date(booking.scheduledDate || now);
    dueDate.setDate(dueDate.getDate() + 14);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invNumber,
        bookingId: booking.id,
        customerId: booking.customerId,
        subtotal: Number(booking.subtotal),
        tax: Number(booking.tax),
        discount: Number(booking.discount),
        totalAmount,
        paidAmount,
        status,
        issuedAt: booking.createdAt || now,
        dueDate,
        paidAt: status === 'PAID' ? new Date() : null,
      },
    });
    invoiceCount++;

    // Add invoice line items
    const bookingServices = await prisma.bookingService.findMany({ where: { bookingId: booking.id } });

    for (const bs of bookingServices) {
      const service = await prisma.service.findUnique({ where: { id: bs.serviceId } });
      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: service.name,
          descriptionAr: service.nameAr,
          itemType: 'SERVICE',
          quantity: bs.quantity,
          unitPrice: bs.unitPrice,
          totalPrice: bs.totalPrice,
        },
      });
    }

    if (Number(booking.laborFee) > 0) {
      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: 'Labor Fee',
          descriptionAr: 'رسوم العمالة',
          itemType: 'LABOR',
          quantity: 1,
          unitPrice: booking.laborFee,
          totalPrice: booking.laborFee,
        },
      });
    }
  }
  console.log(`✅ Created ${invoiceCount} invoices with line items\n`);

  // ============================================
  // 14. Payments
  // ============================================
  console.log('💳 Seeding Payments...');
  const allInvoices = await prisma.invoice.findMany({ where: { status: { in: ['PAID', 'PARTIALLY_PAID'] } } });
  const paymentMethods = ['CASH', 'CARD', 'WALLET', 'MADA'];
  const paymentStatuses = ['PENDING', 'PROCESSING', 'COMPLETED'];
  let paymentNum = 3000;
  let paymentCount = 0;

  for (const invoice of allInvoices) {
    const paymentNumber = `PAY-COMP-${String(paymentNum).padStart(5, '0')}`;
    paymentNum++;

    const existingPayment = await prisma.payment.findUnique({ where: { paymentNumber } });
    if (existingPayment) continue;

    const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const status = invoice.status === 'PAID' ? 'COMPLETED' : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

    await prisma.payment.create({
      data: {
        paymentNumber,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: invoice.paidAmount > 0 ? invoice.paidAmount : invoice.totalAmount,
        method,
        status,
        processedAt: status === 'COMPLETED' ? new Date() : null,
        gatewayReference: status === 'COMPLETED' ? `GATEWAY-${Math.random().toString(36).substring(7)}` : null,
      },
    });
    paymentCount++;
  }
  console.log(`✅ Created ${paymentCount} payments\n`);

  // ============================================
  // 15. Wallets and Transactions
  // ============================================
  console.log('💰 Seeding Wallets and Transactions...');
  let walletCount = 0;
  let transactionCount = 0;

  // Create wallets for technicians and suppliers
  for (const tech of allTechnicians) {
    const balance = 500 + Math.floor(Math.random() * 2000);
    const pendingBalance = Math.floor(Math.random() * 500);

    const wallet = await prisma.wallet.upsert({
      where: { userId: tech.id },
      update: { availableBalance: balance, pendingBalance },
      create: {
        userId: tech.id,
        availableBalance: balance,
        pendingBalance,
        currency: 'SAR',
      },
    });
    walletCount++;

    // Add transactions
    const transactionTypes = ['EARNING', 'WITHDRAWAL', 'COMMISSION'];
    for (let t = 0; t < 3; t++) {
      const type = transactionTypes[t];
      const amount = type === 'EARNING' ? 100 + Math.floor(Math.random() * 300) : type === 'WITHDRAWAL' ? -50 : -10;
      const balanceBefore = balance - (t * 100);
      const balanceAfter = balanceBefore + amount;

      const txnNum = transactionCount + 4000;
      const txnNumber = `TXN-COMP-${String(txnNum).padStart(6, '0')}`;

      const existingTxn = await prisma.transaction.findUnique({ where: { transactionNumber: txnNumber } });
      if (existingTxn) {
        transactionCount++;
        continue;
      }

      await prisma.transaction.create({
        data: {
          transactionNumber: txnNumber,
          walletId: wallet.id,
          userId: tech.id,
          type,
          amount,
          balanceBefore,
          balanceAfter,
          description: `${type} transaction for technician`,
          status: 'COMPLETED',
        },
      });
      transactionCount++;
    }
  }
  console.log(`✅ Created ${walletCount} wallets and ${transactionCount} transactions\n`);

  // ============================================
  // 16. Ratings
  // ============================================
  console.log('⭐ Seeding Ratings...');
  const completedBookings = await prisma.booking.findMany({
    where: { status: { in: ['COMPLETED', 'DELIVERED'] } },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });
  let ratingCount = 0;

  for (const booking of completedBookings.slice(0, 8)) {
    const technician = allTechnicians.find((t) => t.id === booking.technicianId);
    if (!technician) continue;

    await prisma.rating.upsert({
      where: { bookingId: booking.id },
      update: {},
      create: {
        bookingId: booking.id,
        raterId: booking.customerId,
        rateeId: technician.id,
        score: 3 + Math.floor(Math.random() * 3), // 3-5 stars
        review: ['Great service!', 'Very professional', 'Excellent work', 'Highly recommended', 'Fast and efficient'][Math.floor(Math.random() * 5)],
        punctuality: 4 + Math.floor(Math.random() * 2),
        professionalism: 4 + Math.floor(Math.random() * 2),
        quality: 4 + Math.floor(Math.random() * 2),
        communication: 4 + Math.floor(Math.random() * 2),
      },
    });
    ratingCount++;
  }
  console.log(`✅ Created ${ratingCount} ratings\n`);

  // ============================================
  // 17. Notifications
  // ============================================
  console.log('🔔 Seeding Notifications...');
  const notificationTypes = [
    'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED',
    'BROADCAST_NEW', 'OFFER_RECEIVED', 'OFFER_ACCEPTED',
    'INSPECTION_SUBMITTED', 'QUOTE_APPROVED', 'QUOTE_REJECTED',
    'PAYMENT_RECEIVED', 'STATUS_UPDATE', 'SYSTEM',
  ];
  let notificationCount = 0;

  for (let i = 0; i < allCustomers.length; i++) {
    const customer = allCustomers[i];
    const numNotifications = 3 + Math.floor(Math.random() * 5);

    for (let n = 0; n < numNotifications; n++) {
      const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const booking = createdBookings[i % createdBookings.length];

      await prisma.notification.create({
        data: {
          userId: customer.id,
          type,
          title: `Notification ${n + 1}`,
          titleAr: `إشعار ${n + 1}`,
          message: `This is a ${type} notification for your booking.`,
          messageAr: `هذا إشعار ${type} لحجزك.`,
          bookingId: booking?.id || null,
          isRead: n < 2, // First 2 are read
          readAt: n < 2 ? new Date(now.getTime() - (n * 60000)) : null,
        },
      });
      notificationCount++;
    }
  }
  console.log(`✅ Created ${notificationCount} notifications\n`);

  // ============================================
  // 18. Auto Parts Vendor Marketplace
  // ============================================
  console.log('🏪 Seeding Auto Parts Vendor Marketplace...');

  // 18.1 Create Vendors (فيندور المنتجات + فيندور العناية الشاملة + آخرون)
  const vendorsData = [
    {
      email: 'vendor-products@akfeek.com',
      phone: '+966571234000',
      businessName: 'Akfeek Parts Hub',
      businessNameAr: 'فيندور المنتجات - مركز قطع غيار أكفيك',
      city: 'Riyadh',
      desc: 'Vendor dedicated to adding and managing auto parts products on the marketplace',
      descAr: 'فيندور متخصص في إضافة وإدارة منتجات قطع الغيار في المتجر',
      vendorType: 'AUTO_PARTS'
    },
    {
      email: 'vendor-care@akfeek.com',
      phone: '+966571234099',
      businessName: 'Comprehensive Care Partner',
      businessNameAr: 'فيندور العناية الشاملة',
      city: 'Riyadh',
      desc: 'Vendor offering the Comprehensive Care Service (خدمة العناية الشاملة)',
      descAr: 'فيندور يقدم خدمة العناية الشاملة: فحص، صيانة، تنظيف وتعبئة سوائل',
      vendorType: 'COMPREHENSIVE_CARE'
    },
    {
      email: 'vendor-workshop@akfeek.com',
      phone: '+966571234098',
      businessName: 'Certified Workshop KSA',
      businessNameAr: 'الورشة المعتمدة',
      city: 'Riyadh',
      desc: 'Certified workshop vendor (الورش المعتمدة)',
      descAr: 'فيندور الورش المعتمدة',
      vendorType: 'CERTIFIED_WORKSHOP'
    },
    {
      email: 'vendor-carwash@akfeek.com',
      phone: '+966571234097',
      businessName: 'Akfeek Car Wash',
      businessNameAr: 'خدمة الغسيل',
      city: 'Riyadh',
      desc: 'Car wash service vendor (خدمة الغسيل)',
      descAr: 'فيندور خدمة غسيل السيارات',
      vendorType: 'CAR_WASH'
    },
    {
      email: 'vendor1@akfeek.com',
      phone: '+966571234001',
      businessName: 'Speedy Parts KSA',
      businessNameAr: 'قطع غيار السريعة',
      city: 'Riyadh',
      desc: 'Top quality parts for all Japanese cars',
      descAr: 'قطع غيار عالية الجودة للسيارات اليابانية'
    },
    {
      email: 'vendor2@akfeek.com',
      phone: '+966571234002',
      businessName: 'Luxury Auto Spares',
      businessNameAr: 'قطع غيار السيارات الفاخرة',
      city: 'Jeddah',
      desc: 'Specialized in German luxury vehicles',
      descAr: 'متخصصون في السيارات الألمانية الفاخرة'
    },
    {
      email: 'vendor3@akfeek.com',
      phone: '+966571234003',
      businessName: 'Desert Offroad',
      businessNameAr: 'صحراء للأوف رود',
      city: 'Dammam',
      desc: 'Performance parts for 4x4 and SUVs',
      descAr: 'قطع غيار الأداء لسيارات الدفع الرباعي'
    }
  ];

  const allVendors = [];
  for (const vData of vendorsData) {
    const user = await prisma.user.upsert({
      where: { email: vData.email },
      update: { role: 'VENDOR' }, // Ensure role is updated if exists
      create: {
        email: vData.email,
        phone: vData.phone,
        passwordHash: hash,
        role: 'VENDOR',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: 'Vendor',
            lastName: 'Manager',
            avatar: IMAGES.accessory,
          }
        }
      }
    });

    const vendorTypeEnum = vData.vendorType === 'CERTIFIED_WORKSHOP' ? VendorType.CERTIFIED_WORKSHOP
      : vData.vendorType === 'CAR_WASH' ? VendorType.CAR_WASH
      : vData.vendorType === 'COMPREHENSIVE_CARE' ? VendorType.COMPREHENSIVE_CARE
      : VendorType.AUTO_PARTS;
    const vendorProfile = await prisma.vendorProfile.upsert({
      where: { userId: user.id },
      update: { ...(vData.vendorType && { vendorType: vendorTypeEnum }) },
      create: {
        userId: user.id,
        vendorType: vendorTypeEnum,
        businessName: vData.businessName,
        businessNameAr: vData.businessNameAr,
        description: vData.desc,
        descriptionAr: vData.descAr,
        contactEmail: vData.email,
        contactPhone: vData.phone,
        address: 'Industrial Area',
        city: vData.city,
        country: 'SA',
        taxNumber: `TAX-${Math.floor(Math.random() * 10000000)}`,
        commercialLicense: `LIC-${Math.floor(Math.random() * 10000000)}`,
        status: 'ACTIVE',
        logo: `https://ui-avatars.com/api/?name=${vData.businessName.replace(' ', '+')}&background=random`,
      }
    });
    allVendors.push(vendorProfile);
  }
  console.log(`✅ Created ${allVendors.length} vendors`);
  console.log('   📦 فيندور المنتجات: vendor-products@akfeek.com / Admin123!');
  console.log('   🛡️ فيندور العناية الشاملة: vendor-care@akfeek.com / Admin123!');
  console.log('   🔧 فيندور الورش المعتمدة: vendor-workshop@akfeek.com / Admin123!');
  console.log('   🚿 فيندور خدمة الغسيل: vendor-carwash@akfeek.com / Admin123!');

  // Link Comprehensive Care Service to فيندور العناية الشاملة (vendor-care)
  const comprehensiveCareServiceId = serviceIdByName['Comprehensive Care Service'];
  if (comprehensiveCareServiceId && allVendors[1]) {
    await prisma.service.update({
      where: { id: comprehensiveCareServiceId },
      data: { vendorId: allVendors[1].id },
    });
    console.log('✅ Linked Comprehensive Care Service to vendor (فيندور العناية الشاملة)');
  }

  // 18.2 Create Auto Part Categories (Hierarchy)
  const categoriesData = [
    {
      name: 'Engine', nameAr: 'المحرك', icon: 'https://cdn-icons-png.flaticon.com/512/3209/3209955.png',
      children: [
        { name: 'Filters', nameAr: 'الفلاتر', icon: 'https://cdn-icons-png.flaticon.com/512/2402/2402283.png' },
        { name: 'Ignition', nameAr: 'الإشعال', icon: 'https://cdn-icons-png.flaticon.com/512/5666/5666750.png' },
        { name: 'Belts & Chains', nameAr: 'الأحزمة والسلاسل', icon: 'https://cdn-icons-png.flaticon.com/512/4332/4332829.png' }
      ]
    },
    {
      name: 'Brakes', nameAr: 'الفرامل', icon: 'https://cdn-icons-png.flaticon.com/512/2061/2061972.png',
      children: [
        { name: 'Brake Pads', nameAr: 'فحمات الفرامل', icon: 'https://cdn-icons-png.flaticon.com/512/3209/3209867.png' },
        { name: 'Brake Discs', nameAr: 'أقراص الفرامل', icon: 'https://cdn-icons-png.flaticon.com/512/3209/3209867.png' }
      ]
    },
    {
      name: 'Suspension', nameAr: 'نظام التعليق', icon: 'https://cdn-icons-png.flaticon.com/512/3210/3210087.png',
      children: [
        { name: 'Shock Absorbers', nameAr: 'ممتص الصدمات', icon: 'https://cdn-icons-png.flaticon.com/512/3210/3210087.png' },
        { name: 'Control Arms', nameAr: 'أذرع التحكم', icon: 'https://cdn-icons-png.flaticon.com/512/3210/3210087.png' }
      ]
    }
  ];

  const categoryMap = {}; // name -> id

  for (const cat of categoriesData) {
    const parent = await prisma.autoPartCategory.upsert({
      where: { name: cat.name },
      update: { rootType: AutoPartRootType.CAR },
      create: {
        name: cat.name,
        nameAr: cat.nameAr,
        imageUrl: cat.icon,
        rootType: AutoPartRootType.CAR,
      }
    });
    categoryMap[cat.name] = parent.id;

    if (cat.children) {
      for (const child of cat.children) {
        const sub = await prisma.autoPartCategory.upsert({
          where: { name: child.name },
          update: {},
          create: {
            name: child.name,
            nameAr: child.nameAr,
            parentId: parent.id,
            imageUrl: child.icon,
          }
        });
        categoryMap[child.name] = sub.id;
      }
    }
  }
  console.log(`✅ Created Auto Part Categories hierarchy`);

  // 18.3 Create Auto Parts
  const autoPartsSeed = [
    {
      name: 'High Performance Air Filter',
      nameAr: 'فلتر هواء عالي الأداء',
      sku: 'AF-HP-001',
      brand: 'K&N',
      price: 250,
      stock: 50,
      category: 'Filters',
      vendorIdx: 0, // فيندور المنتجات (vendor-products)
      images: [IMAGES.filter],
      compatibleBrands: ['Toyota', 'Nissan'],
      mobileSubServiceNames: ['Oil Change (Mobile)', 'Periodic Maintenance (Mobile)']
    },
    {
      name: 'Ceramic Brake Pad Set - Front',
      nameAr: 'طقم فحمات سيراميك - أمامي',
      sku: 'BP-CR-100',
      brand: 'Akebono',
      price: 450,
      stock: 30,
      category: 'Brake Pads',
      vendorIdx: 0,
      images: [IMAGES.brakePad],
      compatibleBrands: ['Toyota', 'Honda'],
      mobileSubServiceNames: ['Periodic Maintenance (Mobile)', 'Other Mechanical (Mobile)']
    },
    {
      name: 'OEM Oil Filter',
      nameAr: 'فلتر زيت أصلي',
      sku: 'OF-OEM-99',
      brand: 'Toyota Genuine Parts',
      price: 45,
      stock: 500,
      category: 'Filters',
      vendorIdx: null, // Platform owned
      images: [IMAGES.oil],
      compatibleBrands: ['Toyota'],
      mobileSubServiceNames: ['Oil Change (Mobile)']
    },
    {
      name: 'Sport Suspension Kit',
      nameAr: 'طقم تعليق رياضي',
      sku: 'SUS-SP-55',
      brand: 'Bilstein',
      price: 3500,
      stock: 5,
      category: 'Shock Absorbers',
      vendorIdx: 3, // Luxury Auto (vendor2)
      images: [IMAGES.accessory],
      compatibleBrands: ['BMW', 'Mercedes-Benz'],
      mobileSubServiceNames: ['Other Mechanical (Mobile)']
    },
    {
      name: 'Offroad Lift Kit 2.5"',
      nameAr: 'طقم رفع 2.5 بوصة للطرق الوعرة',
      sku: 'OFF-LFT-25',
      brand: 'Old Man Emu',
      price: 5500,
      stock: 10,
      category: 'Suspension',
      vendorIdx: 4, // Desert Offroad (vendor3)
      images: [IMAGES.truck],
      compatibleBrands: ['Toyota', 'Nissan'], // Land cruiser, Patrol
      mobileSubServiceNames: ['Other Mechanical (Mobile)']
    }
  ];

  let partCount = 0;
  for (const part of autoPartsSeed) {
    const catId = categoryMap[part.category] || categoryMap['Engine']; // fallback
    const vendorId = part.vendorIdx !== null ? allVendors[part.vendorIdx].id : null;
    const isApproved = vendorId === null || part.vendorIdx === 0; // Platform and 1st vendor approved

    const createdPart = await prisma.autoPart.upsert({
      where: { sku: part.sku },
      update: {},
      create: {
        name: part.name,
        nameAr: part.nameAr,
        sku: part.sku,
        brand: part.brand,
        price: part.price,
        stockQuantity: part.stock,
        categoryId: catId,
        vendorId: vendorId,
        createdByUserId: vendorId ? allVendors[part.vendorIdx].userId : admin.id,
        description: `High quality ${part.name} for your vehicle.`,
        descriptionAr: `${part.nameAr} عالي الجودة لسيارتك.`,
        isApproved: isApproved,
        isActive: true,
        images: {
          create: part.images.map((url, i) => ({
            url,
            isPrimary: i === 0,
            sortOrder: i
          }))
        }
      }
    });
    partCount++;

    // Add Vehicle Compatibility (simple logic: all models of that brand)
    for (const brandName of part.compatibleBrands) {
      const brandModels = await prisma.vehicleModel.findMany({
        where: { brand: { name: brandName } },
        take: 3 // limit to 3 models per brand to avoid bloat
      });

      for (const model of brandModels) {
        await prisma.autoPartCompatibility.upsert({
          where: {
            partId_vehicleModelId: {
              partId: createdPart.id,
              vehicleModelId: model.id
            }
          },
          update: {},
          create: {
            partId: createdPart.id,
            vehicleModelId: model.id
          }
        });
      }
    }

    // Link part to Mobile Car sub-services (AutoPartService)
    for (const subServiceName of part.mobileSubServiceNames || []) {
      const serviceId = mobileSubServiceIdByName[subServiceName];
      if (serviceId) {
        await prisma.autoPartService.upsert({
          where: {
            autoPartId_serviceId: { autoPartId: createdPart.id, serviceId }
          },
          update: {},
          create: {
            autoPartId: createdPart.id,
            serviceId,
            isRecommended: true,
            sortOrder: 0
          }
        });
      }
    }

    // AutoPartVendor: which vendor supplies this part (for mobile booking parts)
    const vendorIdForPart = part.vendorIdx !== null ? allVendors[part.vendorIdx].id : allVendors[0].id;
    await prisma.autoPartVendor.upsert({
      where: {
        autoPartId_vendorId: { autoPartId: createdPart.id, vendorId: vendorIdForPart }
      },
      update: { unitPrice: part.price, stockQuantity: part.stock, isAvailable: true },
      create: {
        autoPartId: createdPart.id,
        vendorId: vendorIdForPart,
        unitPrice: part.price,
        stockQuantity: part.stock,
        isAvailable: true
      }
    });
  }
  console.log(`✅ Created ${partCount} auto parts with images, compatibility, AutoPartService, and AutoPartVendor`);


  // ============================================
  // 19. Marketplace Orders
  // ============================================
  console.log('🛍️ Seeding Marketplace Orders...');

  const allAutoParts = await prisma.autoPart.findMany({ include: { vendor: true } });
  const orderStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  let orderCount = 0;

  for (let i = 0; i < Math.min(10, allCustomers.length); i++) {
    const customer = allCustomers[i];
    // Each customer places 1-2 orders
    const numOrders = 1 + Math.floor(Math.random() * 2);

    for (let j = 0; j < numOrders; j++) {
      const selectedParts = [];
      const numItems = 1 + Math.floor(Math.random() * 3); // 1-3 items per order

      for (let k = 0; k < numItems; k++) {
        selectedParts.push(allAutoParts[Math.floor(Math.random() * allAutoParts.length)]);
      }

      // Calculate totals — أسعار المنتجات شاملة الضريبة، الإجمالي = المجموع الفرعي + الشحن فقط
      let subtotal = 0;
      selectedParts.forEach(p => subtotal += Number(p.price));

      const shippingCost = 35;
      const tax = 0;
      const totalAmount = subtotal + shippingCost;

      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30));

      await prisma.marketplaceOrder.create({
        data: {
          orderNumber: `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
          customerId: customer.id,
          subtotal,
          shippingCost,
          tax,
          totalAmount,
          status,
          paymentStatus: status === 'PENDING' ? 'PENDING' : 'PAID',
          paymentMethod: ['CARD', 'CASH', 'WALLET'][Math.floor(Math.random() * 3)],
          createdAt: orderDate,
          recipientName: `${customer.profile?.firstName || 'Customer'} ${customer.profile?.lastName || ''}`.trim(),
          recipientPhone: customer.phone,
          shippingAddress: `Building ${Math.floor(Math.random() * 100)}, Street ${Math.floor(Math.random() * 10)}`,
          shippingCity: customer.profile?.addresses?.[0]?.city || 'Riyadh',
          shippingCountry: 'SA',
          items: {
            create: selectedParts.map(part => ({
              autoPartId: part.id,
              vendorId: part.vendorId, // Can be null if platform owned
              quantity: 1,
              unitPrice: part.price,
              totalPrice: part.price,
              status: status // Items inherit order status initially
            }))
          }
        }
      });
      orderCount++;
    }
  }
  console.log(`✅ Created ${orderCount} marketplace orders`);

  // ============================================
  // 20. Mobile Car Service Bookings (طلبات خدمة الورش المتنقلة)
  // ============================================
  console.log('🚐 Seeding Mobile Car Service Bookings...');

  const mobileSubServiceIds = Object.values(mobileSubServiceIdByName);
  const mobileBookingStatuses = [
    'PENDING',
    'CONFIRMED',
    'TECHNICIAN_ASSIGNED',
    'TECHNICIAN_EN_ROUTE',
    'ARRIVED',
    'IN_SERVICE',
    'IN_PROGRESS',
    'COMPLETED'
  ];
  const mobileTimes = ['09:00', '10:00', '11:30', '14:00', '15:30', '16:00'];
  let mobileBookingNum = 1;
  let mobileBookingCount = 0;

  for (let i = 0; i < Math.min(8, allCustomers.length); i++) {
    const customer = allCustomers[i];
    const customerVehicles = await prisma.userVehicle.findMany({
      where: { userId: customer.id },
      include: { vehicleModel: true }
    });
    const address = await prisma.address.findFirst({
      where: { userId: customer.id },
      orderBy: { isDefault: 'desc' }
    });
    if (customerVehicles.length === 0 || !address) continue;

    const vehicle = customerVehicles[0];
    const status = mobileBookingStatuses[i % mobileBookingStatuses.length];
    const technician = status !== 'PENDING' ? allTechnicians[i % allTechnicians.length] : null;

    const bookingNumber = `BKG-MOB-${String(mobileBookingNum).padStart(5, '0')}`;
    mobileBookingNum++;
    const existingMobileBooking = await prisma.booking.findUnique({ where: { bookingNumber } });
    if (existingMobileBooking) continue;

    const scheduledDate = new Date(now);
    scheduledDate.setDate(scheduledDate.getDate() + (i % 5));
    const subServiceId1 = mobileSubServiceIds[i % mobileSubServiceIds.length];
    const subServiceId2 = mobileSubServiceIds[(i + 2) % mobileSubServiceIds.length];
    const selectedSubServiceIds = i % 2 === 0 ? [subServiceId1] : [subServiceId1, subServiceId2];

    const servicePrice1 = 80 + (i * 15);
    const servicePrice2 = 60 + (i * 10);
    let servicesSubtotal = selectedSubServiceIds.length === 1 ? servicePrice1 : servicePrice1 + servicePrice2;
    const laborFee = 50;
    const deliveryFee = 25;
    let partsTotal = 0;

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId: customer.id,
        vehicleId: vehicle.id,
        technicianId: technician?.id || null,
        addressId: address.id,
        scheduledDate,
        scheduledTime: mobileTimes[i % mobileTimes.length],
        pickupLat: address.latitude,
        pickupLng: address.longitude,
        pickupAddress: `${address.street}, ${address.city}`,
        status,
        subtotal: servicesSubtotal,
        laborFee,
        deliveryFee,
        partsTotal: 0,
        discount: 0,
        tax: 0,
        totalPrice: servicesSubtotal + laborFee + deliveryFee,
        notes: i % 2 === 0 ? 'طلب خدمة ورشة متنقلة - تغيير زيت' : 'صيانة دورية في الموقع'
      }
    });

    for (const svcId of selectedSubServiceIds) {
      const unitPrice = svcId === subServiceId1 ? servicePrice1 : servicePrice2;
      await prisma.bookingService.create({
        data: {
          bookingId: booking.id,
          serviceId: svcId,
          quantity: 1,
          unitPrice,
          totalPrice: unitPrice
        }
      });
    }

    const compatibleParts = await prisma.autoPart.findMany({
      where: {
        isActive: true,
        autoPartServices: { some: { serviceId: { in: selectedSubServiceIds } } },
        compatibility: { some: { vehicleModelId: vehicle.vehicleModelId } }
      },
      include: {
        autoPartVendors: { take: 1 }
      },
      take: 2
    });

    for (const part of compatibleParts) {
      const qty = 1;
      const unitPrice = Number(part.price);
      const totalPrice = unitPrice * qty;
      partsTotal += totalPrice;
      const vendorId = part.autoPartVendors?.[0]?.vendorId || part.vendorId || null;
      await prisma.bookingAutoPart.create({
        data: {
          bookingId: booking.id,
          autoPartId: part.id,
          vendorId,
          quantity: qty,
          unitPrice,
          totalPrice
        }
      });
    }

    if (partsTotal > 0) {
      const newSubtotal = Number(booking.subtotal) + partsTotal;
      const newTotal = newSubtotal + Number(booking.laborFee) + Number(booking.deliveryFee);
      const tax = newTotal * 0.15;
      await prisma.booking.update({
        where: { id: booking.id },
        data: { partsTotal, subtotal: newSubtotal, tax, totalPrice: newTotal + tax }
      });
    }

    const statusHistoryEntries = [
      { from: null, to: 'PENDING', ts: 0 },
      { from: 'PENDING', to: status === 'PENDING' ? null : 'CONFIRMED', ts: 1 },
      { from: 'CONFIRMED', to: status === 'CONFIRMED' ? null : status, ts: 2 }
    ].filter((e) => e.to);
    for (const h of statusHistoryEntries) {
      await prisma.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: h.from,
          toStatus: h.to,
          changedBy: technician?.id || customer.id,
          reason: `Status: ${h.to}`,
          timestamp: new Date(booking.createdAt.getTime() + h.ts * 60000)
        }
      });
    }
    mobileBookingCount++;
  }
  console.log(`✅ Created ${mobileBookingCount} Mobile Car Service bookings (with pickup location, sub-services, and compatible parts)\n`);

  // ============================================
  // 23. Certified Workshops
  // ============================================
  console.log('🏢 Seeding Certified Workshops...');
  const workshopsData = [
    {
      name: 'Al-Salam Auto Center',
      nameAr: 'مركز السلام للسيارات',
      description: 'Professional auto repair and maintenance center with certified technicians.',
      descriptionAr: 'مركز صيانة وإصلاح سيارات احترافي مع فنيين معتمدين.',
      address: 'King Fahd Road, Al-Olaya District',
      addressAr: 'طريق الملك فهد، حي العليا',
      city: 'Riyadh',
      cityAr: 'الرياض',
      latitude: 24.7136,
      longitude: 46.6753,
      phone: '+966112345001',
      email: 'info@alsalam-auto.sa',
      workingHours: {
        sunday: { open: '08:00', close: '18:00' },
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '15:00' }
      },
      services: JSON.stringify(['Engine Repair', 'Brake Service', 'Oil Change', 'Transmission Repair', 'AC Repair']),
      isActive: true,
      isVerified: true,
      verifiedAt: new Date(),
      averageRating: 4.7,
      totalReviews: 128,
      totalBookings: 450
    },
    {
      name: 'Elite Motors Workshop',
      nameAr: 'ورشة إيليت موتورز',
      description: 'Specialized in luxury vehicles maintenance and repair.',
      descriptionAr: 'متخصصون في صيانة وإصلاح المركبات الفاخرة.',
      address: 'Tahlia Street',
      addressAr: 'شارع التحلية',
      city: 'Jeddah',
      cityAr: 'جدة',
      latitude: 21.5433,
      longitude: 39.1728,
      phone: '+966122345002',
      email: 'contact@elitemotors.sa',
      workingHours: {
        sunday: { open: '09:00', close: '19:00' },
        monday: { open: '09:00', close: '19:00' },
        tuesday: { open: '09:00', close: '19:00' },
        wednesday: { open: '09:00', close: '19:00' },
        thursday: { open: '09:00', close: '19:00' },
        saturday: { open: '10:00', close: '16:00' }
      },
      services: JSON.stringify(['Engine Repair', 'Brake Service', 'Oil Change', 'AC Repair', 'Tire Service']),
      isActive: true,
      isVerified: true,
      verifiedAt: new Date(),
      averageRating: 4.9,
      totalReviews: 210,
      totalBookings: 680
    },
    {
      name: 'Quick Fix Auto Service',
      nameAr: 'كويك فكس لخدمات السيارات',
      description: 'Fast and reliable auto service for all car brands.',
      descriptionAr: 'خدمة سيارات سريعة وموثوقة لجميع العلامات التجارية.',
      address: 'King Abdul Aziz Road',
      addressAr: 'طريق الملك عبدالعزيز',
      city: 'Dammam',
      cityAr: 'الدمام',
      latitude: 26.4207,
      longitude: 50.0888,
      phone: '+966133345003',
      email: 'service@quickfix.sa',
      workingHours: {
        sunday: { open: '07:00', close: '17:00' },
        monday: { open: '07:00', close: '17:00' },
        tuesday: { open: '07:00', close: '17:00' },
        wednesday: { open: '07:00', close: '17:00' },
        thursday: { open: '07:00', close: '17:00' },
        saturday: { open: '08:00', close: '14:00' }
      },
      services: JSON.stringify(['Oil Change', 'Brake Service', 'Tire Rotation', 'Battery Replacement', 'AC Service']),
      isActive: true,
      isVerified: true,
      verifiedAt: new Date(),
      averageRating: 4.5,
      totalReviews: 95,
      totalBookings: 320
    },
    {
      name: 'Pro Auto Care',
      nameAr: 'برو أوتو كير',
      description: 'Comprehensive auto care services with modern equipment.',
      descriptionAr: 'خدمات رعاية سيارات شاملة بمعدات حديثة.',
      address: 'Prince Sultan Road',
      addressAr: 'طريق الأمير سلطان',
      city: 'Riyadh',
      cityAr: 'الرياض',
      latitude: 24.6900,
      longitude: 46.6850,
      phone: '+966112345004',
      email: 'info@proautocare.sa',
      workingHours: {
        sunday: { open: '08:30', close: '18:30' },
        monday: { open: '08:30', close: '18:30' },
        tuesday: { open: '08:30', close: '18:30' },
        wednesday: { open: '08:30', close: '18:30' },
        thursday: { open: '08:30', close: '18:30' },
        saturday: { open: '09:00', close: '15:00' }
      },
      services: JSON.stringify(['Engine Diagnostic', 'Transmission Service', 'Brake System', 'Electrical Repair', 'Body Work']),
      isActive: true,
      isVerified: false, // Pending verification
      averageRating: 4.3,
      totalReviews: 67,
      totalBookings: 180
    }
  ];

  let workshopCount = 0;
  for (const workshopData of workshopsData) {
    const existing = await prisma.certifiedWorkshop.findFirst({
      where: { phone: workshopData.phone }
    });
    if (existing) {
      await prisma.certifiedWorkshop.update({
        where: { id: existing.id },
        data: workshopData
      });
    } else {
      await prisma.certifiedWorkshop.create({
        data: workshopData
      });
    }
    workshopCount++;
  }
  console.log(`✅ Created ${workshopCount} certified workshops\n`);

  // ============================================
  console.log('✅ Comprehensive database seeding completed successfully! 🎉\n');

  const summary = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'TECHNICIAN' } }),
    prisma.user.count({ where: { role: 'SUPPLIER' } }),
    prisma.userVehicle.count(),
    prisma.address.count(),
    prisma.vehicleBrand.count(),
    prisma.vehicleModel.count(),
    prisma.service.count(),
    prisma.booking.count(),
    prisma.bookingService.count(),
    prisma.bookingStatusHistory.count(),
    prisma.jobBroadcast.count(),
    prisma.jobOffer.count(),
    prisma.inspectionReport.count(),
    prisma.inspectionItem.count(),
    prisma.supplyRequest.count(),
    prisma.supplierPart.count(),
    prisma.invoice.count(),
    prisma.invoiceLineItem.count(),
    prisma.payment.count(),
    prisma.wallet.count(),
    prisma.transaction.count(),
    prisma.rating.count(),
    prisma.notification.count(),
    prisma.vendorProfile.count(),
    prisma.autoPartCategory.count(),
    prisma.autoPart.count(),
    prisma.marketplaceOrder.count(),
  ]);

  console.log('📊 Final Summary:');
  console.log(`   - Total Users: ${summary[0]}`);
  console.log(`   - Customers: ${summary[1]}`);
  console.log(`   - Technicians: ${summary[2]}`);
  console.log(`   - Suppliers: ${summary[3]}`);
  console.log(`   - User Vehicles: ${summary[4]}`);
  console.log(`   - Addresses: ${summary[5]}`);
  console.log(`   - Vehicle Brands: ${summary[6]}`);
  console.log(`   - Vehicle Models: ${summary[7]}`);
  console.log(`   - Services: ${summary[8]}`);
  console.log(`   - Bookings: ${summary[9]}`);
  console.log(`   - Booking Services: ${summary[10]}`);
  console.log(`   - Booking Status History: ${summary[11]}`);
  console.log(`   - Job Broadcasts: ${summary[12]}`);
  console.log(`   - Job Offers: ${summary[13]}`);
  console.log(`   - Inspection Reports: ${summary[14]}`);
  console.log(`   - Inspection Items: ${summary[15]}`);
  console.log(`   - Supply Requests: ${summary[16]}`);
  console.log(`   - Supplier Parts: ${summary[17]}`);
  console.log(`   - Invoices: ${summary[18]}`);
  console.log(`   - Invoice Line Items: ${summary[19]}`);
  console.log(`   - Payments: ${summary[20]}`);
  console.log(`   - Wallets: ${summary[21]}`);
  console.log(`   - Transactions: ${summary[22]}`);
  console.log(`   - Ratings: ${summary[23]}`);
  console.log(`   - Notifications: ${summary[24]}`);
  console.log(`   - Vendors: ${summary[25]}`);
  console.log(`   - Auto Part Categories: ${summary[26]}`);
  console.log(`   - Auto Parts: ${summary[27]}`);
  console.log(`   - Marketplace Orders: ${summary[28]}`);
  console.log('\n🎉 All tables seeded with realistic data and real images!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
