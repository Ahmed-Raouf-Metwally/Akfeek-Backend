const { PrismaClient, OrderStatus, Prisma } = require('@prisma/client');
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

  // 2. Create vehicle brands with logos
  const brands = [
    { name: 'Toyota',       nameAr: 'تويوتا',        logo: 'https://logo.clearbit.com/toyota.com' },
    { name: 'Honda',        nameAr: 'هوندا',          logo: 'https://logo.clearbit.com/honda.com' },
    { name: 'BMW',          nameAr: 'بي ام دبليو',   logo: 'https://logo.clearbit.com/bmw.com' },
    { name: 'Mercedes-Benz',nameAr: 'مرسيدس',        logo: 'https://logo.clearbit.com/mercedes-benz.com' },
    { name: 'Ford',         nameAr: 'فورد',           logo: 'https://logo.clearbit.com/ford.com' },
    { name: 'Hyundai',      nameAr: 'هيونداي',        logo: 'https://logo.clearbit.com/hyundai.com' },
    { name: 'Kia',          nameAr: 'كيا',            logo: 'https://logo.clearbit.com/kia.com' },
    { name: 'Nissan',       nameAr: 'نيسان',          logo: 'https://logo.clearbit.com/nissan.com' },
    { name: 'Chevrolet',    nameAr: 'شيفروليه',       logo: 'https://logo.clearbit.com/chevrolet.com' },
    { name: 'Lexus',        nameAr: 'لكزس',           logo: 'https://logo.clearbit.com/lexus.com' },
  ];

  const createdBrands = [];
  for (const brand of brands) {
    const created = await prisma.vehicleBrand.upsert({
      where: { name: brand.name },
      update: { logo: brand.logo, nameAr: brand.nameAr },
      create: brand,
    });
    createdBrands.push(created);
  }
  console.log('✅ Created vehicle brands');

  // 3. Create vehicle models for each brand with images
  // brandIdx: 0=Toyota 1=Honda 2=BMW 3=Mercedes 4=Ford 5=Hyundai 6=Kia 7=Nissan 8=Chevrolet 9=Lexus
  const modelsData = [
    // Toyota
    { brandIdx: 0, name: 'Camry',       nameAr: 'كامري',       year: 2024, type: 'SEDAN',  imageUrl: 'https://picsum.photos/seed/toyota-camry/800/500' },
    { brandIdx: 0, name: 'Corolla',     nameAr: 'كورولا',      year: 2024, type: 'SEDAN',  imageUrl: 'https://picsum.photos/seed/toyota-corolla/800/500' },
    { brandIdx: 0, name: 'Land Cruiser',nameAr: 'لاند كروزر',  year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/toyota-landcruiser/800/500' },
    { brandIdx: 0, name: 'Prado',       nameAr: 'برادو',       year: 2023, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/toyota-prado/800/500' },
    { brandIdx: 0, name: 'Hilux',       nameAr: 'هايلكس',      year: 2024, type: 'TRUCK',  imageUrl: 'https://picsum.photos/seed/toyota-hilux/800/500' },
    // Honda
    { brandIdx: 1, name: 'Civic',       nameAr: 'سيفيك',       year: 2024, type: 'SEDAN',  imageUrl: 'https://picsum.photos/seed/honda-civic/800/500' },
    { brandIdx: 1, name: 'Accord',      nameAr: 'أكورد',       year: 2024, type: 'SEDAN',  imageUrl: 'https://picsum.photos/seed/honda-accord/800/500' },
    { brandIdx: 1, name: 'CR-V',        nameAr: 'سي ار في',    year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/honda-crv/800/500' },
    // BMW
    { brandIdx: 2, name: 'X5',          nameAr: 'إكس 5',       year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/bmw-x5/800/500' },
    { brandIdx: 2, name: '3 Series',    nameAr: 'الفئة الثالثة',year: 2024, type: 'SEDAN', imageUrl: 'https://picsum.photos/seed/bmw-3series/800/500' },
    { brandIdx: 2, name: '7 Series',    nameAr: 'الفئة السابعة',year: 2024, type: 'SEDAN', imageUrl: 'https://picsum.photos/seed/bmw-7series/800/500' },
    // Mercedes-Benz
    { brandIdx: 3, name: 'C-Class',     nameAr: 'سي كلاس',     year: 2024, type: 'SEDAN',  imageUrl: 'https://picsum.photos/seed/merc-cclass/800/500' },
    { brandIdx: 3, name: 'E-Class',     nameAr: 'إي كلاس',     year: 2024, type: 'SEDAN',  imageUrl: 'https://picsum.photos/seed/merc-eclass/800/500' },
    { brandIdx: 3, name: 'G-Class',     nameAr: 'جي كلاس',     year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/merc-gclass/800/500' },
    { brandIdx: 3, name: 'GLE',         nameAr: 'جي إل إي',    year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/merc-gle/800/500' },
    // Ford
    { brandIdx: 4, name: 'F-150',       nameAr: 'إف 150',      year: 2024, type: 'TRUCK',  imageUrl: 'https://picsum.photos/seed/ford-f150/800/500' },
    { brandIdx: 4, name: 'Explorer',    nameAr: 'إكسبلورر',    year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/ford-explorer/800/500' },
    // Hyundai
    { brandIdx: 5, name: 'Sonata',      nameAr: 'سوناتا',      year: 2024, type: 'SEDAN',  imageUrl: 'https://picsum.photos/seed/hyundai-sonata/800/500' },
    { brandIdx: 5, name: 'Tucson',      nameAr: 'توسان',       year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/hyundai-tucson/800/500' },
    { brandIdx: 5, name: 'Santa Fe',    nameAr: 'سانتا في',    year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/hyundai-santafe/800/500' },
    { brandIdx: 5, name: 'Elantra',     nameAr: 'إلنترا',      year: 2024, type: 'SEDAN',  imageUrl: 'https://picsum.photos/seed/hyundai-elantra/800/500' },
    // Kia
    { brandIdx: 6, name: 'Sportage',    nameAr: 'سبورتاج',     year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/kia-sportage/800/500' },
    { brandIdx: 6, name: 'Sorento',     nameAr: 'سورينتو',     year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/kia-sorento/800/500' },
    { brandIdx: 6, name: 'Cerato',      nameAr: 'سيراتو',      year: 2024, type: 'SEDAN',  imageUrl: 'https://picsum.photos/seed/kia-cerato/800/500' },
    // Nissan
    { brandIdx: 7, name: 'Patrol',      nameAr: 'باترول',      year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/nissan-patrol/800/500' },
    { brandIdx: 7, name: 'Altima',      nameAr: 'ألتيما',      year: 2024, type: 'SEDAN',  imageUrl: 'https://picsum.photos/seed/nissan-altima/800/500' },
    { brandIdx: 7, name: 'Xterra',      nameAr: 'إكستيرا',     year: 2023, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/nissan-xterra/800/500' },
    // Chevrolet
    { brandIdx: 8, name: 'Tahoe',       nameAr: 'تاهو',        year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/chevy-tahoe/800/500' },
    { brandIdx: 8, name: 'Suburban',    nameAr: 'سوبربان',     year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/chevy-suburban/800/500' },
    { brandIdx: 8, name: 'Camaro',      nameAr: 'كامارو',      year: 2024, type: 'COUPE',  imageUrl: 'https://picsum.photos/seed/chevy-camaro/800/500' },
    // Lexus
    { brandIdx: 9, name: 'LX 600',      nameAr: 'إل إكس 600',  year: 2024, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/lexus-lx600/800/500' },
    { brandIdx: 9, name: 'ES 350',      nameAr: 'إي إس 350',   year: 2024, type: 'SEDAN',  imageUrl: 'https://picsum.photos/seed/lexus-es350/800/500' },
    { brandIdx: 9, name: 'GX 460',      nameAr: 'جي إكس 460',  year: 2023, type: 'SUV',    imageUrl: 'https://picsum.photos/seed/lexus-gx460/800/500' },
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
      update: { imageUrl: m.imageUrl, nameAr: m.nameAr },
      create: {
        brandId:  createdBrands[m.brandIdx].id,
        name:     m.name,
        nameAr:   m.nameAr,
        year:     m.year,
        type:     m.type,
        imageUrl: m.imageUrl,
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

  // 5. Create Vendor Profiles (10 vendors with different types, incl. 5 certified workshops)
  const vendorUsers = [];
  const vendorTypes = [
    { type: 'AUTO_PARTS',         name: 'محلات قطع غيار الرياض',    email: 'vendor1@akfeek.com' },
    { type: 'TOWING_SERVICE',     name: 'ونش الرياض السريع',         email: 'vendor2@akfeek.com' },
    { type: 'CAR_WASH',           name: 'غسيل السيارات الذهبي',      email: 'vendor3@akfeek.com' },
    { type: 'COMPREHENSIVE_CARE', name: 'العناية الشاملة للسيارات',  email: 'vendor4@akfeek.com' },
    { type: 'CERTIFIED_WORKSHOP', name: 'ورشة الفارس المعتمدة',      email: 'vendor5@akfeek.com' },
    { type: 'CERTIFIED_WORKSHOP', name: 'مركز النخبة للسيارات',      email: 'vendor7@akfeek.com' },
    { type: 'CERTIFIED_WORKSHOP', name: 'ورشة الأمانة المعتمدة',     email: 'vendor8@akfeek.com' },
    { type: 'CERTIFIED_WORKSHOP', name: 'مركز الخليج للصيانة',       email: 'vendor9@akfeek.com' },
    { type: 'CERTIFIED_WORKSHOP', name: 'ورشة الريادة التقنية',      email: 'vendor10@akfeek.com' },
    { type: 'AUTO_PARTS',         name: 'قطع غيار دراجات نارية',    email: 'vendor6@akfeek.com' },
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
        phone: await resolveSeedPhone(v.email, '+9665000000' + String(i + 1).padStart(2, '0')),
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
        contactPhone: '+9665000000' + String(i + 1).padStart(2, '0'),
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

  // 6. AutoPart categories (CAR + MOTORCYCLE) — full fields, no optional text/image nulls
  
  // ── 6b. Create 5 Certified Workshops (one per workshop vendor) ─────────────
  const workshopData = [
    {
      vendorIdx: 4,
      name: 'ورشة الفارس المعتمدة',        nameAr: 'ورشة الفارس المعتمدة',
      description: 'ورشة صيانة معتمدة متخصصة في صيانة السيارات الأوروبية والآسيوية',
      descriptionAr: 'ورشة صيانة معتمدة متخصصة في صيانة السيارات الأوروبية والآسيوية',
      address: 'الرياض - حي النرجس',  addressAr: 'الرياض - حي النرجس',
      city: 'الرياض', cityAr: 'الرياض',
      lat: 24.7136, lng: 46.6753,
      phone: '+966500000005', email: 'vendor5@akfeek.com',
      rating: 4.8, reviews: 34,
      logo: 'https://picsum.photos/seed/ws-faris/200/200',
      images: [
        'https://picsum.photos/seed/ws-faris-1/800/500',
        'https://picsum.photos/seed/ws-faris-2/800/500',
        'https://picsum.photos/seed/ws-faris-3/800/500',
      ],
      services: [
        { serviceType: 'DIAGNOSIS',  name: 'فحص شامل للسيارة',    nameAr: 'فحص شامل للسيارة',    price: 120, duration: 60 },
        { serviceType: 'OIL_CHANGE', name: 'تغيير زيت المحرك',     nameAr: 'تغيير زيت المحرك',     price: 100, duration: 30 },
        { serviceType: 'BRAKE',      name: 'فحص وصيانة الفرامل',  nameAr: 'فحص وصيانة الفرامل',  price: 200, duration: 60 },
        { serviceType: 'TIRE',       name: 'تدوير وموازنة الإطارات', nameAr: 'تدوير وموازنة الإطارات', price: 80, duration: 30 },
        { serviceType: 'ENGINE_REPAIR', name: 'صيانة المحرك',      nameAr: 'صيانة المحرك',          price: 500, duration: 120 },
      ],
    },
    {
      vendorIdx: 5,
      name: 'مركز النخبة للسيارات',         nameAr: 'مركز النخبة للسيارات',
      description: 'مركز متخصص في صيانة السيارات الفارهة والرياضية',
      descriptionAr: 'مركز متخصص في صيانة السيارات الفارهة والرياضية',
      address: 'جدة - حي الروضة',          addressAr: 'جدة - حي الروضة',
      city: 'Jeddah', cityAr: 'جدة',
      lat: 21.4858, lng: 39.1925,
      phone: '+966500000007', email: 'vendor7@akfeek.com',
      rating: 4.9, reviews: 52,
      logo: 'https://picsum.photos/seed/ws-nokhba/200/200',
      images: [
        'https://picsum.photos/seed/ws-nokhba-1/800/500',
        'https://picsum.photos/seed/ws-nokhba-2/800/500',
      ],
      services: [
        { serviceType: 'DIAGNOSIS',    name: 'فحص شامل للسيارة',        nameAr: 'فحص شامل للسيارة',        price: 150, duration: 60 },
        { serviceType: 'AC',           name: 'صيانة التكييف',            nameAr: 'صيانة التكييف',            price: 350, duration: 90 },
        { serviceType: 'ELECTRICAL',   name: 'إصلاح الكهرباء',           nameAr: 'إصلاح الكهرباء',           price: 250, duration: 60 },
        { serviceType: 'TRANSMISSION', name: 'صيانة ناقل الحركة',        nameAr: 'صيانة ناقل الحركة',        price: 800, duration: 180 },
        { serviceType: 'DETAILING',    name: 'تلميع وحماية الطلاء',      nameAr: 'تلميع وحماية الطلاء',      price: 400, duration: 120 },
      ],
    },
    {
      vendorIdx: 6,
      name: 'ورشة الأمانة المعتمدة',        nameAr: 'ورشة الأمانة المعتمدة',
      description: 'ورشة أمانة لخدمات الصيانة الشاملة والإصلاحات السريعة',
      descriptionAr: 'ورشة أمانة لخدمات الصيانة الشاملة والإصلاحات السريعة',
      address: 'الدمام - حي الشاطئ',       addressAr: 'الدمام - حي الشاطئ',
      city: 'Dammam', cityAr: 'الدمام',
      lat: 26.4207, lng: 50.0888,
      phone: '+966500000008', email: 'vendor8@akfeek.com',
      rating: 4.6, reviews: 28,
      logo: 'https://picsum.photos/seed/ws-amana/200/200',
      images: [
        'https://picsum.photos/seed/ws-amana-1/800/500',
        'https://picsum.photos/seed/ws-amana-2/800/500',
        'https://picsum.photos/seed/ws-amana-3/800/500',
      ],
      services: [
        { serviceType: 'DIAGNOSIS',   name: 'فحص شامل للسيارة',    nameAr: 'فحص شامل للسيارة',    price: 100, duration: 45 },
        { serviceType: 'OIL_CHANGE',  name: 'تغيير زيت المحرك',    nameAr: 'تغيير زيت المحرك',    price: 90,  duration: 30 },
        { serviceType: 'SUSPENSION',  name: 'صيانة نظام التعليق',  nameAr: 'صيانة نظام التعليق',  price: 300, duration: 90 },
        { serviceType: 'BATTERY',     name: 'فحص وتغيير البطارية', nameAr: 'فحص وتغيير البطارية', price: 60,  duration: 20 },
        { serviceType: 'GLASS',       name: 'استبدال الزجاج',       nameAr: 'استبدال الزجاج',       price: 250, duration: 60 },
      ],
    },
    {
      vendorIdx: 7,
      name: 'مركز الخليج للصيانة',          nameAr: 'مركز الخليج للصيانة',
      description: 'مركز الخليج للصيانة الشاملة وخدمات السيارات',
      descriptionAr: 'مركز الخليج للصيانة الشاملة وخدمات السيارات',
      address: 'مكة المكرمة - حي العزيزية', addressAr: 'مكة المكرمة - حي العزيزية',
      city: 'Mecca', cityAr: 'مكة المكرمة',
      lat: 21.3891, lng: 39.8579,
      phone: '+966500000009', email: 'vendor9@akfeek.com',
      rating: 4.7, reviews: 41,
      logo: 'https://picsum.photos/seed/ws-gulf/200/200',
      images: [
        'https://picsum.photos/seed/ws-gulf-1/800/500',
        'https://picsum.photos/seed/ws-gulf-2/800/500',
      ],
      services: [
        { serviceType: 'DIAGNOSIS',    name: 'فحص شامل للسيارة',      nameAr: 'فحص شامل للسيارة',      price: 130, duration: 60 },
        { serviceType: 'ENGINE_REPAIR',name: 'إصلاح وصيانة المحرك',    nameAr: 'إصلاح وصيانة المحرك',    price: 600, duration: 180 },
        { serviceType: 'PAINTING',     name: 'دهان وتشطيب الهيكل',     nameAr: 'دهان وتشطيب الهيكل',     price: 1200, duration: 480 },
        { serviceType: 'BODY_REPAIR',  name: 'إصلاح هيكل السيارة',     nameAr: 'إصلاح هيكل السيارة',     price: 800, duration: 240 },
        { serviceType: 'GENERAL',      name: 'صيانة دورية شاملة',      nameAr: 'صيانة دورية شاملة',      price: 200, duration: 90 },
      ],
    },
    {
      vendorIdx: 8,
      name: 'ورشة الريادة التقنية',          nameAr: 'ورشة الريادة التقنية',
      description: 'ورشة متطورة تعتمد أحدث التقنيات في تشخيص وإصلاح السيارات',
      descriptionAr: 'ورشة متطورة تعتمد أحدث التقنيات في تشخيص وإصلاح السيارات',
      address: 'المدينة المنورة - طريق الملك عبدالعزيز', addressAr: 'المدينة المنورة - طريق الملك عبدالعزيز',
      city: 'Medina', cityAr: 'المدينة المنورة',
      lat: 24.5247, lng: 39.5692,
      phone: '+966500000010', email: 'vendor10@akfeek.com',
      rating: 4.5, reviews: 19,
      logo: 'https://picsum.photos/seed/ws-riada/200/200',
      images: [
        'https://picsum.photos/seed/ws-riada-1/800/500',
        'https://picsum.photos/seed/ws-riada-2/800/500',
        'https://picsum.photos/seed/ws-riada-3/800/500',
      ],
      services: [
        { serviceType: 'DIAGNOSIS',  name: 'فحص شامل للسيارة',         nameAr: 'فحص شامل للسيارة',         price: 140, duration: 60 },
        { serviceType: 'ELECTRICAL', name: 'تشخيص وإصلاح الكهرباء',     nameAr: 'تشخيص وإصلاح الكهرباء',     price: 300, duration: 90 },
        { serviceType: 'OIL_CHANGE', name: 'تغيير زيت المحرك',          nameAr: 'تغيير زيت المحرك',          price: 95,  duration: 30 },
        { serviceType: 'TIRE',       name: 'خدمة الإطارات الشاملة',     nameAr: 'خدمة الإطارات الشاملة',     price: 100, duration: 40 },
        { serviceType: 'AC',         name: 'فحص وشحن التكييف',          nameAr: 'فحص وشحن التكييف',          price: 200, duration: 60 },
      ],
    },
  ];

  const workshopDefaultHours = JSON.stringify({
    sunday:    { open: '08:00', close: '18:00' },
    monday:    { open: '08:00', close: '18:00' },
    tuesday:   { open: '08:00', close: '18:00' },
    wednesday: { open: '08:00', close: '18:00' },
    thursday:  { open: '08:00', close: '18:00' },
    friday:    { closed: true },
    saturday:  { open: '09:00', close: '17:00' },
  });

  const createdWorkshops = [];
  for (const wd of workshopData) {
    const vp = vendorProfiles[wd.vendorIdx];
    const serviceNames = wd.services.map((s) => s.name);
    const ws = await prisma.certifiedWorkshop.upsert({
      where: { vendorId: vp.id },
      update: {
        logo: wd.logo,
        images: wd.images,
      },
      create: {
        name:          wd.name,
        nameAr:        wd.nameAr,
        description:   wd.description,
        descriptionAr: wd.descriptionAr,
        address:       wd.address,
        addressAr:     wd.addressAr,
        city:          wd.city,
        cityAr:        wd.cityAr,
        latitude:      wd.lat,
        longitude:     wd.lng,
        phone:         wd.phone,
        email:         wd.email,
        services:      JSON.stringify(serviceNames),
        workingHours:  workshopDefaultHours,
        averageRating: wd.rating,
        totalReviews:  wd.reviews,
        isActive:      true,
        isVerified:    true,
        vendorId:      vp.id,
        logo:          wd.logo,
        images:        wd.images,
      },
    });
    createdWorkshops.push(ws);

    // Seed CertifiedWorkshopService records (upsert via name+workshopId)
    for (const svc of wd.services) {
      const existing = await prisma.certifiedWorkshopService.findFirst({
        where: { workshopId: ws.id, name: svc.name },
      });
      if (!existing) {
        await prisma.certifiedWorkshopService.create({
          data: {
            workshopId:        ws.id,
            serviceType:       svc.serviceType,
            name:              svc.name,
            nameAr:            svc.nameAr,
            description:       `${svc.nameAr} - خدمة معتمدة`,
            price:             svc.price,
            currency:          'SAR',
            estimatedDuration: svc.duration,
            isActive:          true,
          },
        });
      }
    }
    console.log(`✅ Created certified workshop: ${wd.name} (${wd.services.length} services)`);
  }
  console.log(`✅ Created ${createdWorkshops.length} certified workshops with images and services`);

  const categories = [
    {
      name: 'Engine Parts',
      nameAr: 'قطع المحرك',
      rootType: 'CAR',
      description: 'Oil and air filters, spark plugs, belts, and other engine service parts for passenger vehicles.',
      descriptionAr: 'فلاتر زيت وهواء، شمعات إشعال، سير، ومستهلكات صيانة المحرك للسيارات.',
      icon: 'cog',
      imageUrl: 'https://picsum.photos/seed/akfeek-autopart-cat-engine-parts/960/640',
      sortOrder: 10,
    },
    {
      name: 'Brakes',
      nameAr: 'الفرامل',
      rootType: 'CAR',
      description: 'Brake pads, rotors, calipers, and hydraulic components for safe stopping performance.',
      descriptionAr: 'فحمات وأقراص وكليبرات ومكونات هيدروليك الفرامل لأداء توقف آمن.',
      icon: 'disc',
      imageUrl: 'https://picsum.photos/seed/akfeek-autopart-cat-brakes/960/640',
      sortOrder: 20,
    },
    {
      name: 'Suspension',
      nameAr: 'التعليق',
      rootType: 'CAR',
      description: 'Shocks, struts, mounts, and suspension hardware for ride comfort and handling.',
      descriptionAr: 'مخمدات، دعامات، رولات، وقطع تعليق لراحة القيادة والثبات.',
      icon: 'activity',
      imageUrl: 'https://picsum.photos/seed/akfeek-autopart-cat-suspension/960/640',
      sortOrder: 30,
    },
    {
      name: 'Motorcycle Engine',
      nameAr: 'محرك الدراجة',
      rootType: 'MOTORCYCLE',
      description: 'Filters, plugs, gaskets, and engine consumables for motorcycles and scooters.',
      descriptionAr: 'فلاتر، شمعات، جوانات، ومستهلكات محرك الدراجات والسكوتر.',
      icon: 'zap',
      imageUrl: 'https://picsum.photos/seed/akfeek-autopart-cat-moto-engine/960/640',
      sortOrder: 40,
    },
    {
      name: 'Motorcycle Brakes',
      nameAr: 'فرامل الدراجة',
      rootType: 'MOTORCYCLE',
      description: 'Pads, discs, and brake fluid components designed for two-wheel vehicles.',
      descriptionAr: 'فحمات وأقراص وسائل فرامل مخصصة للدراجات النارية.',
      icon: 'circle-dot',
      imageUrl: 'https://picsum.photos/seed/akfeek-autopart-cat-moto-brakes/960/640',
      sortOrder: 50,
    },
    {
      name: 'Motorcycle Wheels',
      nameAr: 'عجلات الدراجة',
      rootType: 'MOTORCYCLE',
      description: 'Tires, tubes, rims, and wheel bearings for motorcycles.',
      descriptionAr: 'إطارات، تيوب، جنوط، ومحامل عجلات للدراجات النارية.',
      icon: 'gauge',
      imageUrl: 'https://picsum.photos/seed/akfeek-autopart-cat-moto-wheels/960/640',
      sortOrder: 60,
    },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const created = await prisma.autoPartCategory.upsert({
      where: { name: cat.name },
      update: {
        nameAr: cat.nameAr,
        description: cat.description,
        descriptionAr: cat.descriptionAr,
        icon: cat.icon,
        imageUrl: cat.imageUrl,
        rootType: cat.rootType,
        isActive: true,
        sortOrder: cat.sortOrder,
      },
      create: {
        ...cat,
        isActive: true,
      },
    });
    createdCategories.push(created);
  }
  console.log('✅ Seeded auto part categories (full metadata)');

  const dimsCompact = { lengthCm: 22, widthCm: 14, heightCm: 7, unit: 'cm' };
  const dimsLong = { lengthCm: 45, widthCm: 18, heightCm: 12, unit: 'cm' };

  // 7. Auto parts — stable SKU, bilingual copy, pricing, OEM, media (CAR vendor + MOTORCYCLE vendor)
  const carPartsSeed = [
    {
      sku: 'SEED-AP-CAR-001',
      categoryIdx: 0,
      name: 'Oil Filter',
      nameAr: 'فلتر زيت',
      description: 'Spin-on oil filter for listed fitment; meets OEM flow and filtration specs.',
      descriptionAr: 'فلتر زيت دوار للموديلات المذكورة؛ يطابق مواصفات التدفق والترشيح الأصلية.',
      price: 49.99,
      compareAtPrice: 64.99,
      cost: 28.5,
      brand: 'Toyota',
      brandIdx: 0,
      modelIdx: 0,
      year: 2023,
      partNumber: '90915-YZZD3',
      oemNumber: '90915-YZZD3',
      stockQuantity: 120,
      lowStockThreshold: 15,
      weight: 0.42,
      dimensions: dimsCompact,
      specifications: { filtrationMicron: 25, thread: '3/4-16', warrantyMonths: 12, countryOfOrigin: 'JP' },
      badges: ['OEM', 'Warranty', 'Fast moving'],
      isFeatured: true,
      primaryImageUrl: 'https://picsum.photos/seed/akfeek-seed-ap-car-001-primary/1200/800',
      extraImageUrls: [
        'https://picsum.photos/seed/akfeek-seed-ap-car-001-gallery-1/1200/800',
        'https://picsum.photos/seed/akfeek-seed-ap-car-001-gallery-2/1200/800',
      ],
    },
    {
      sku: 'SEED-AP-CAR-002',
      categoryIdx: 0,
      name: 'Air Filter',
      nameAr: 'فلتر هواء',
      description: 'Panel air filter for efficient airflow and engine protection in dusty climates.',
      descriptionAr: 'فلتر هواء لوحي لتدفق جيد وحماية المحرك في الأجواء الغبارية.',
      price: 34.5,
      compareAtPrice: 44.0,
      cost: 19.0,
      brand: 'Toyota',
      brandIdx: 0,
      modelIdx: 1,
      year: 2022,
      partNumber: '17801-0L040',
      oemNumber: '17801-0L040',
      stockQuantity: 85,
      lowStockThreshold: 12,
      weight: 0.28,
      dimensions: { lengthCm: 32, widthCm: 24, heightCm: 4, unit: 'cm' },
      specifications: { mediaType: 'Pleated synthetic', serviceKm: 15000, warrantyMonths: 12, countryOfOrigin: 'TH' },
      badges: ['OEM', 'Best seller'],
      isFeatured: true,
      primaryImageUrl: 'https://picsum.photos/seed/akfeek-seed-ap-car-002-primary/1200/800',
      extraImageUrls: [
        'https://picsum.photos/seed/akfeek-seed-ap-car-002-gallery-1/1200/800',
        'https://picsum.photos/seed/akfeek-seed-ap-car-002-gallery-2/1200/800',
      ],
    },
    {
      sku: 'SEED-AP-CAR-003',
      categoryIdx: 0,
      name: 'Spark Plugs (set of 4)',
      nameAr: 'شمعات إشعال (طقم 4)',
      description: 'Iridium long-life spark plugs, set of four, pre-gapped for listed engines.',
      descriptionAr: 'شمعات إيريديوم عمر طويل، طقم 4، مهيأة الفجوة للمحركات المذكورة.',
      price: 79.99,
      compareAtPrice: 99.99,
      cost: 48.0,
      brand: 'NGK',
      brandIdx: 0,
      modelIdx: 0,
      year: 2023,
      partNumber: 'LKAR7BI-8',
      oemNumber: '90919-01253',
      stockQuantity: 60,
      lowStockThreshold: 10,
      weight: 0.18,
      dimensions: { lengthCm: 12, widthCm: 8, heightCm: 3, unit: 'cm' },
      specifications: { electrode: 'Iridium', gapMm: 1.1, qtyInBox: 4, warrantyMonths: 24, countryOfOrigin: 'JP' },
      badges: ['Iridium', 'Warranty'],
      isFeatured: false,
      primaryImageUrl: 'https://picsum.photos/seed/akfeek-seed-ap-car-003-primary/1200/800',
      extraImageUrls: [
        'https://picsum.photos/seed/akfeek-seed-ap-car-003-gallery-1/1200/800',
        'https://picsum.photos/seed/akfeek-seed-ap-car-003-gallery-2/1200/800',
      ],
    },
    {
      sku: 'SEED-AP-CAR-004',
      categoryIdx: 1,
      name: 'Brake Pads (front)',
      nameAr: 'فحمات فرامل أمامية',
      description: 'Low-noise ceramic front brake pads with shims and hardware where applicable.',
      descriptionAr: 'فحمات أمامية سيراميك منخفضة الضوضاء مع حشوات وقطع تركيب عند الحاجة.',
      price: 149.0,
      compareAtPrice: 189.0,
      cost: 82.0,
      brand: 'Bosch',
      brandIdx: 0,
      modelIdx: 0,
      year: 2023,
      partNumber: 'BP-0986AB1234',
      oemNumber: '04465-06180',
      stockQuantity: 40,
      lowStockThreshold: 8,
      weight: 1.85,
      dimensions: dimsLong,
      specifications: { frictionMaterial: 'Ceramic', axle: 'Front', warrantyMonths: 12, countryOfOrigin: 'DE' },
      badges: ['Low dust', 'Warranty'],
      isFeatured: true,
      primaryImageUrl: 'https://picsum.photos/seed/akfeek-seed-ap-car-004-primary/1200/800',
      extraImageUrls: [
        'https://picsum.photos/seed/akfeek-seed-ap-car-004-gallery-1/1200/800',
        'https://picsum.photos/seed/akfeek-seed-ap-car-004-gallery-2/1200/800',
      ],
    },
    {
      sku: 'SEED-AP-CAR-005',
      categoryIdx: 1,
      name: 'Brake Discs (front pair)',
      nameAr: 'أقراص فرامل أمامية (زوج)',
      description: 'Ventilated front brake rotors, pair, balanced and corrosion-treated.',
      descriptionAr: 'أقراص أمامية مهواة، زوج، متوازنة ومقاومة للتآكل.',
      price: 249.0,
      compareAtPrice: 319.0,
      cost: 140.0,
      brand: 'Bosch',
      brandIdx: 0,
      modelIdx: 1,
      year: 2022,
      partNumber: 'BD-1234',
      oemNumber: '43512-02450',
      stockQuantity: 22,
      lowStockThreshold: 6,
      weight: 8.4,
      dimensions: { lengthCm: 35, widthCm: 35, heightCm: 14, unit: 'cm' },
      specifications: { ventilated: true, diameterMm: 302, thicknessMm: 24, warrantyMonths: 12, countryOfOrigin: 'DE' },
      badges: ['OEM spec', 'Pair'],
      isFeatured: false,
      primaryImageUrl: 'https://picsum.photos/seed/akfeek-seed-ap-car-005-primary/1200/800',
      extraImageUrls: [
        'https://picsum.photos/seed/akfeek-seed-ap-car-005-gallery-1/1200/800',
        'https://picsum.photos/seed/akfeek-seed-ap-car-005-gallery-2/1200/800',
      ],
    },
    {
      sku: 'SEED-AP-CAR-006',
      categoryIdx: 2,
      name: 'Shock Absorber (rear)',
      nameAr: 'مخمد صدمات خلفي',
      description: 'Gas-charged rear shock absorber for stable damping and ride comfort.',
      descriptionAr: 'مخمد خلفي معبأ غازياً لتخميد ثابت وراحة في القيادة.',
      price: 299.0,
      compareAtPrice: 359.0,
      cost: 175.0,
      brand: 'Monroe',
      brandIdx: 3,
      modelIdx: 7,
      year: 2023,
      partNumber: '349035',
      oemNumber: '48530-09N00',
      stockQuantity: 18,
      lowStockThreshold: 5,
      weight: 3.2,
      dimensions: dimsLong,
      specifications: { position: 'Rear', gasCharged: true, warrantyMonths: 24, countryOfOrigin: 'US' },
      badges: ['Warranty', 'Heavy duty'],
      isFeatured: true,
      primaryImageUrl: 'https://picsum.photos/seed/akfeek-seed-ap-car-006-primary/1200/800',
      extraImageUrls: [
        'https://picsum.photos/seed/akfeek-seed-ap-car-006-gallery-1/1200/800',
        'https://picsum.photos/seed/akfeek-seed-ap-car-006-gallery-2/1200/800',
      ],
    },
    {
      sku: 'SEED-AP-CAR-007',
      categoryIdx: 2,
      name: 'Strut Mount (front)',
      nameAr: 'رولة دعامة أمامية',
      description: 'Rubber-isolated front strut mount with bearing for noise-free steering return.',
      descriptionAr: 'رولة دعامة أمامية معزولة مطاطياً مع رمان لعودة عجلة بلا ضجيج.',
      price: 119.0,
      compareAtPrice: 145.0,
      cost: 62.0,
      brand: 'Monroe',
      brandIdx: 3,
      modelIdx: 7,
      year: 2023,
      partNumber: 'MK-902712',
      oemNumber: '48609-06220',
      stockQuantity: 30,
      lowStockThreshold: 8,
      weight: 0.95,
      dimensions: dimsCompact,
      specifications: { position: 'Front', includesBearing: true, warrantyMonths: 12, countryOfOrigin: 'US' },
      badges: ['OEM quality'],
      isFeatured: false,
      primaryImageUrl: 'https://picsum.photos/seed/akfeek-seed-ap-car-007-primary/1200/800',
      extraImageUrls: [
        'https://picsum.photos/seed/akfeek-seed-ap-car-007-gallery-1/1200/800',
        'https://picsum.photos/seed/akfeek-seed-ap-car-007-gallery-2/1200/800',
      ],
    },
  ];

  const motoPartsSeed = [
    {
      sku: 'SEED-AP-MOTO-001',
      categoryIdx: 3,
      name: 'Motorcycle Oil Filter',
      nameAr: 'فلتر زيت دراجة',
      description: 'High-flow motorcycle oil filter compatible with common single-cylinder engines.',
      descriptionAr: 'فلتر زيت دراجة بتدفق عالي متوافق مع محركات أحادية الأسطوانة الشائعة.',
      price: 29.0,
      compareAtPrice: 39.0,
      cost: 14.0,
      brand: 'Honda',
      brandIdx: 1,
      modelIdx: 3,
      year: 2022,
      partNumber: 'HF204',
      oemNumber: '15410-MFJ-D02',
      stockQuantity: 200,
      lowStockThreshold: 20,
      weight: 0.22,
      dimensions: dimsCompact,
      specifications: { thread: 'M20x1.5', warrantyMonths: 12, countryOfOrigin: 'JP' },
      badges: ['OEM', 'Fast moving'],
      isFeatured: true,
      primaryImageUrl: 'https://picsum.photos/seed/akfeek-seed-ap-moto-001-primary/1200/800',
      extraImageUrls: [
        'https://picsum.photos/seed/akfeek-seed-ap-moto-001-gallery-1/1200/800',
        'https://picsum.photos/seed/akfeek-seed-ap-moto-001-gallery-2/1200/800',
      ],
    },
    {
      sku: 'SEED-AP-MOTO-002',
      categoryIdx: 4,
      name: 'Motorcycle Brake Pads (front)',
      nameAr: 'فحمات فرامل دراجة أمامية',
      description: 'Sintered front pads for strong bite in street and light sport riding.',
      descriptionAr: 'فحمات أمامية معدنية للدراجات لقوة كبح عالية في الشارع والاستخدام الخفيف.',
      price: 89.0,
      compareAtPrice: 109.0,
      cost: 48.0,
      brand: 'Honda',
      brandIdx: 1,
      modelIdx: 4,
      year: 2023,
      partNumber: '07BB19SA',
      oemNumber: '06455-MGS-D11',
      stockQuantity: 75,
      lowStockThreshold: 10,
      weight: 0.35,
      dimensions: { lengthCm: 15, widthCm: 10, heightCm: 4, unit: 'cm' },
      specifications: { friction: 'Sintered', axle: 'Front', warrantyMonths: 12, countryOfOrigin: 'IT' },
      badges: ['Sintered', 'Warranty'],
      isFeatured: true,
      primaryImageUrl: 'https://picsum.photos/seed/akfeek-seed-ap-moto-002-primary/1200/800',
      extraImageUrls: [
        'https://picsum.photos/seed/akfeek-seed-ap-moto-002-gallery-1/1200/800',
        'https://picsum.photos/seed/akfeek-seed-ap-moto-002-gallery-2/1200/800',
      ],
    },
    {
      sku: 'SEED-AP-MOTO-003',
      categoryIdx: 5,
      name: 'Motorcycle Tire 120/70-17',
      nameAr: 'إطار دراجة 120/70-17',
      description: 'Radial street tire 120/70ZR17, M+S rated for wet grip.',
      descriptionAr: 'إطار شارع شعاعي 120/70ZR17، مقاومة جيدة على المبلل.',
      price: 399.0,
      compareAtPrice: 459.0,
      cost: 260.0,
      brand: 'Dunlop',
      brandIdx: 1,
      modelIdx: 4,
      year: 2023,
      partNumber: 'GPR-300-1207017',
      oemNumber: '4081-1207017',
      stockQuantity: 35,
      lowStockThreshold: 6,
      weight: 5.8,
      dimensions: { lengthCm: 62, widthCm: 62, heightCm: 20, unit: 'cm' },
      specifications: { size: '120/70ZR17', loadSpeedIndex: '58W', warrantyMonths: 12, countryOfOrigin: 'JP' },
      badges: ['Radial', 'Wet grip'],
      isFeatured: false,
      primaryImageUrl: 'https://picsum.photos/seed/akfeek-seed-ap-moto-003-primary/1200/800',
      extraImageUrls: [
        'https://picsum.photos/seed/akfeek-seed-ap-moto-003-gallery-1/1200/800',
        'https://picsum.photos/seed/akfeek-seed-ap-moto-003-gallery-2/1200/800',
      ],
    },
  ];

  async function upsertAutoPartWithImage(part, vendorProfileId, createdByUserId) {
    const approvedAt = new Date();
    const row = await prisma.autoPart.upsert({
      where: { sku: part.sku },
      update: {
        name: part.name,
        nameAr: part.nameAr,
        description: part.description,
        descriptionAr: part.descriptionAr,
        vendorId: vendorProfileId,
        createdByUserId,
        categoryId: createdCategories[part.categoryIdx].id,
        brand: part.brand,
        brandId: createdBrands[part.brandIdx].id,
        vehicleModelId: createdModels[part.modelIdx].id,
        year: part.year,
        partNumber: part.partNumber,
        oemNumber: part.oemNumber,
        price: part.price,
        compareAtPrice: part.compareAtPrice,
        cost: part.cost,
        stockQuantity: part.stockQuantity,
        lowStockThreshold: part.lowStockThreshold,
        weight: part.weight,
        dimensions: part.dimensions,
        specifications: part.specifications,
        badges: part.badges,
        isFeatured: part.isFeatured,
        isApproved: true,
        approvedAt,
        isActive: true,
      },
      create: {
        sku: part.sku,
        name: part.name,
        nameAr: part.nameAr,
        description: part.description,
        descriptionAr: part.descriptionAr,
        vendorId: vendorProfileId,
        createdByUserId,
        categoryId: createdCategories[part.categoryIdx].id,
        brand: part.brand,
        brandId: createdBrands[part.brandIdx].id,
        vehicleModelId: createdModels[part.modelIdx].id,
        year: part.year,
        partNumber: part.partNumber,
        oemNumber: part.oemNumber,
        price: part.price,
        compareAtPrice: part.compareAtPrice,
        cost: part.cost,
        stockQuantity: part.stockQuantity,
        lowStockThreshold: part.lowStockThreshold,
        weight: part.weight,
        dimensions: part.dimensions,
        specifications: part.specifications,
        badges: part.badges,
        isFeatured: part.isFeatured,
        isApproved: true,
        approvedAt,
        isActive: true,
      },
    });

    const primaryUrl = part.primaryImageUrl;
    const extras = Array.isArray(part.extraImageUrls) ? part.extraImageUrls : [];
    await prisma.autoPartImage.deleteMany({ where: { partId: row.id } });
    await prisma.autoPartImage.create({
      data: {
        partId: row.id,
        url: primaryUrl,
        altText: `${part.name} — ${part.nameAr}`,
        sortOrder: 0,
        isPrimary: true,
      },
    });
    for (let i = 0; i < extras.length; i += 1) {
      await prisma.autoPartImage.create({
        data: {
          partId: row.id,
          url: extras[i],
          altText: `${part.name} — ${part.nameAr} (${i + 2})`,
          sortOrder: i + 1,
          isPrimary: false,
        },
      });
    }
    return row;
  }

  for (const part of carPartsSeed) {
    await upsertAutoPartWithImage(part, vendorProfiles[0].id, vendorUsers[0].id);
  }
  for (const part of motoPartsSeed) {
    await upsertAutoPartWithImage(part, vendorProfiles[5].id, vendorUsers[5].id);
  }
  console.log('✅ Seeded auto parts (CAR + MOTORCYCLE) with images, OEM data, and pricing');

  // Backfill badges for any legacy rows missing JSON badge array
  await prisma.autoPart.updateMany({
    where: { badges: { equals: Prisma.DbNull } },
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

  // 10. CertifiedWorkshopService records are created inline in the workshopData loop above.

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

  // 13b. Demo PERCENT_SUBSCRIPTION offer (5 prepaid Standard washes, 10% vs list — QA / mobile «عروض»)
  const standardWashSvc = await prisma.service.findFirst({ where: { name: 'Standard Wash' } });
  if (standardWashSvc) {
    const subOffer = await prisma.package.create({
      data: {
        name: '5 washes — 10% bundle (demo)',
        nameAr: 'عرض 5 غسلات — خصم 10%',
        description: 'Prepaid bundle: 5 Standard washes. listPriceTotal 250 SAR, upfront price 225 SAR.',
        descriptionAr: 'باقة مقدّمة: 5 غسلات عادية. سعر مرجعي 250 ر.س، الدفع المقدّم 225 ر.س.',
        price: 225,
        usageCount: 5,
        validityDays: 90,
        isActive: true,
        sortOrder: 10,
        dealType: 'PERCENT_SUBSCRIPTION',
        discountPercent: 10,
        listPriceTotal: 250,
      },
    });
    await prisma.packageService.create({
      data: { packageId: subOffer.id, serviceId: standardWashSvc.id },
    });
    console.log('✅ Created demo PERCENT_SUBSCRIPTION package');
  }

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

  // 16.1 Create Static Mobile Workshop Catalog Items (matches mobile UI exactly)
  const mobileWorkshopCatalog = [
    { key: 'BATTERY', nameAr: 'بطارية', priceMin: 100, priceMax: 150, sortOrder: 1 },
    { key: 'TIRE_SERVICE', nameAr: 'إطار / بنشر', priceMin: 100, priceMax: 150, sortOrder: 2 },
    { key: 'ENGINE_OIL', nameAr: 'زيت المحرك', priceMin: 100, priceMax: 150, sortOrder: 3 },
    { key: 'ELECTRICAL', nameAr: 'كهرباء', priceMin: 100, priceMax: 150, sortOrder: 4 },
    { key: 'ENGINE_PROBLEMS', nameAr: 'مشاكل المحرك', priceMin: 100, priceMax: 150, sortOrder: 5 },
    { key: 'MAINTENANCE', nameAr: 'صيانة', priceMin: 100, priceMax: 150, sortOrder: 6 },
    { key: 'OTHER_ISSUE', nameAr: 'مشكلة أخرى', pricingNoteAr: 'حسب الفحص', priceMin: null, priceMax: null, sortOrder: 7 },
  ];

  const createdCatalogItems = {};
  for (const item of mobileWorkshopCatalog) {
    const upserted = await prisma.mobileWorkshopCatalogItem.upsert({
      where: { key: item.key },
      update: {
        nameAr: item.nameAr,
        pricingNoteAr: item.pricingNoteAr || null,
        priceMin: item.priceMin,
        priceMax: item.priceMax,
        currency: 'SAR',
        sortOrder: item.sortOrder,
        isActive: true,
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
      },
    });
    createdCatalogItems[item.key] = upserted;
  }
  console.log('✅ Created mobile workshop static catalog items');

  // 16.2 Create Hierarchical Mobile Workshop Catalog (Catalogs -> Categories -> Services)
  // 3 catalogs, each with multiple categories, each category with multiple services.
  const fullCatalogTree = [
    {
      name: 'Mobile Workshop', nameAr: 'الورشة المتنقلة',
      imageUrl: 'https://picsum.photos/seed/cat-mobile-workshop/600/300',
      sortOrder: 1,
      categories: [
        {
          name: 'Battery', nameAr: 'بطارية',
          imageUrl: 'https://picsum.photos/seed/cat-battery/400/300',
          sortOrder: 1,
          services: [
            { name: 'Battery check',        nameAr: 'فحص البطارية',         priceMin: 50,  priceMax: 80,  sortOrder: 1 },
            { name: 'Battery replacement',  nameAr: 'استبدال البطارية',      priceMin: 180, priceMax: 350, sortOrder: 2 },
            { name: 'Jump start',           nameAr: 'تشغيل البطارية فورياً', priceMin: 80,  priceMax: 120, sortOrder: 3 },
          ],
        },
        {
          name: 'Tires', nameAr: 'إطارات وبنشر',
          imageUrl: 'https://picsum.photos/seed/cat-tires/400/300',
          sortOrder: 2,
          services: [
            { name: 'Puncture repair',   nameAr: 'إصلاح بنشر',           priceMin: 60,  priceMax: 100, sortOrder: 1 },
            { name: 'Tire replacement',  nameAr: 'استبدال إطار',          priceMin: 150, priceMax: 400, sortOrder: 2 },
            { name: 'Tire pressure',     nameAr: 'ضخ وضبط ضغط الإطارات', priceMin: 20,  priceMax: 40,  sortOrder: 3 },
          ],
        },
        {
          name: 'Engine Oil', nameAr: 'زيت المحرك',
          imageUrl: 'https://picsum.photos/seed/cat-oil/400/300',
          sortOrder: 3,
          services: [
            { name: 'Oil change',         nameAr: 'تغيير زيت المحرك',    priceMin: 100, priceMax: 200, sortOrder: 1 },
            { name: 'Oil top-up',         nameAr: 'إضافة زيت المحرك',    priceMin: 40,  priceMax: 80,  sortOrder: 2 },
            { name: 'Oil filter replace', nameAr: 'تغيير فلتر الزيت',    priceMin: 50,  priceMax: 100, sortOrder: 3 },
          ],
        },
        {
          name: 'Electrical', nameAr: 'كهرباء',
          imageUrl: 'https://picsum.photos/seed/cat-electrical/400/300',
          sortOrder: 4,
          services: [
            { name: 'Electrical diagnosis', nameAr: 'تشخيص كهربائي',       priceMin: 80,  priceMax: 150, sortOrder: 1 },
            { name: 'Fuse replacement',     nameAr: 'استبدال فيوز',         priceMin: 30,  priceMax: 60,  sortOrder: 2 },
            { name: 'Lighting repair',      nameAr: 'إصلاح أضواء السيارة', priceMin: 60,  priceMax: 120, sortOrder: 3 },
          ],
        },
        {
          name: 'Engine Problems', nameAr: 'مشاكل المحرك',
          imageUrl: 'https://picsum.photos/seed/cat-engine/400/300',
          sortOrder: 5,
          services: [
            { name: 'Engine check',        nameAr: 'فحص المحرك',             priceMin: 100, priceMax: 200, sortOrder: 1 },
            { name: 'Coolant top-up',      nameAr: 'إضافة سائل التبريد',     priceMin: 40,  priceMax: 80,  sortOrder: 2 },
            { name: 'Spark plug replace',  nameAr: 'استبدال شمعات الإشعال',  priceMin: 150, priceMax: 300, sortOrder: 3 },
          ],
        },
        {
          name: 'Maintenance', nameAr: 'صيانة',
          imageUrl: 'https://picsum.photos/seed/cat-maintenance/400/300',
          sortOrder: 6,
          services: [
            { name: 'Air filter replace',  nameAr: 'تغيير فلتر الهواء',        priceMin: 60,  priceMax: 120, sortOrder: 1 },
            { name: 'Brake fluid check',   nameAr: 'فحص سائل الفرامل',         priceMin: 40,  priceMax: 70,  sortOrder: 2 },
            { name: 'General inspection',  nameAr: 'فحص عام للسيارة',          priceMin: 80,  priceMax: 150, sortOrder: 3 },
          ],
        },
        {
          name: 'Other Issue', nameAr: 'مشكلة أخرى',
          imageUrl: null,
          sortOrder: 7,
          services: [
            { name: 'On-site diagnosis', nameAr: 'تشخيص في الموقع', priceMin: null, priceMax: null, pricingNoteAr: 'حسب الفحص', sortOrder: 1 },
          ],
        },
      ],
    },
    {
      name: 'Emergency Services', nameAr: 'خدمات الطوارئ',
      imageUrl: 'https://picsum.photos/seed/cat-emergency/600/300',
      sortOrder: 2,
      categories: [
        {
          name: 'Road Breakdown', nameAr: 'تعطل على الطريق',
          imageUrl: 'https://picsum.photos/seed/cat-breakdown/400/300',
          sortOrder: 1,
          services: [
            { name: 'Emergency fuel delivery', nameAr: 'توصيل وقود طارئ',    priceMin: 100, priceMax: 200, sortOrder: 1 },
            { name: 'Emergency jump start',    nameAr: 'تشغيل طارئ للبطارية', priceMin: 80,  priceMax: 150, sortOrder: 2 },
            { name: 'Emergency tow assist',    nameAr: 'مساعدة وسحب طارئ',   priceMin: 150, priceMax: 300, sortOrder: 3 },
          ],
        },
        {
          name: 'Lock & Key', nameAr: 'أقفال ومفاتيح',
          imageUrl: 'https://picsum.photos/seed/cat-lockout/400/300',
          sortOrder: 2,
          services: [
            { name: 'Car lockout opening', nameAr: 'فتح باب السيارة',    priceMin: 100, priceMax: 180, sortOrder: 1 },
            { name: 'Spare key cut',       nameAr: 'تشفير مفتاح احتياطي', priceMin: 200, priceMax: 500, sortOrder: 2 },
          ],
        },
        {
          name: 'Overheating', nameAr: 'ارتفاع الحرارة',
          imageUrl: 'https://picsum.photos/seed/cat-overheat/400/300',
          sortOrder: 3,
          services: [
            { name: 'Coolant refill',       nameAr: 'تعبئة سائل التبريد',     priceMin: 60,  priceMax: 120, sortOrder: 1 },
            { name: 'Radiator quick check', nameAr: 'فحص سريع للرديتر',       priceMin: 80,  priceMax: 150, sortOrder: 2 },
            { name: 'Fan belt inspection',  nameAr: 'فحص وتغيير سير المراوح', priceMin: 100, priceMax: 200, sortOrder: 3 },
          ],
        },
      ],
    },
    {
      name: 'Periodic Maintenance', nameAr: 'صيانة دورية',
      imageUrl: 'https://picsum.photos/seed/cat-periodic/600/300',
      sortOrder: 3,
      categories: [
        {
          name: 'Engine Service', nameAr: 'خدمة المحرك',
          imageUrl: 'https://picsum.photos/seed/cat-engine-svc/400/300',
          sortOrder: 1,
          services: [
            { name: 'Full engine service',   nameAr: 'خدمة محرك شاملة',       priceMin: 300, priceMax: 600, sortOrder: 1 },
            { name: 'Engine flush',          nameAr: 'غسيل المحرك داخلياً',    priceMin: 150, priceMax: 280, sortOrder: 2 },
            { name: 'Timing belt check',     nameAr: 'فحص سير التوقيت',        priceMin: 100, priceMax: 200, sortOrder: 3 },
          ],
        },
        {
          name: 'Brakes & Safety', nameAr: 'فرامل وسلامة',
          imageUrl: 'https://picsum.photos/seed/cat-brakes/400/300',
          sortOrder: 2,
          services: [
            { name: 'Brake pad replace',    nameAr: 'تغيير فحمات الفرامل',   priceMin: 200, priceMax: 500, sortOrder: 1 },
            { name: 'Brake disc check',     nameAr: 'فحص أقراص الفرامل',     priceMin: 80,  priceMax: 150, sortOrder: 2 },
            { name: 'Handbrake adjustment', nameAr: 'ضبط الفرامل اليدوية',   priceMin: 60,  priceMax: 100, sortOrder: 3 },
          ],
        },
        {
          name: 'AC & Cooling', nameAr: 'تكييف وتبريد',
          imageUrl: 'https://picsum.photos/seed/cat-ac/400/300',
          sortOrder: 3,
          services: [
            { name: 'AC gas recharge',    nameAr: 'شحن غاز التكييف',        priceMin: 150, priceMax: 300, sortOrder: 1 },
            { name: 'AC filter clean',    nameAr: 'تنظيف فلتر التكييف',     priceMin: 60,  priceMax: 100, sortOrder: 2 },
            { name: 'Radiator flush',     nameAr: 'تنظيف وشطف الرديتر',     priceMin: 120, priceMax: 220, sortOrder: 3 },
          ],
        },
        {
          name: 'Suspension & Steering', nameAr: 'تعليق وتوجيه',
          imageUrl: 'https://picsum.photos/seed/cat-suspension/400/300',
          sortOrder: 4,
          services: [
            { name: 'Wheel alignment',    nameAr: 'ضبط زوايا الإطارات',    priceMin: 80,  priceMax: 150, sortOrder: 1 },
            { name: 'Shock absorber check', nameAr: 'فحص ممتصات الصدمات', priceMin: 80,  priceMax: 160, sortOrder: 2 },
            { name: 'Steering fluid top', nameAr: 'إضافة زيت الدركسيون',  priceMin: 40,  priceMax: 80,  sortOrder: 3 },
          ],
        },
      ],
    },
  ];

  for (const catalogDef of fullCatalogTree) {
    const existingCatalog = await prisma.mobileWorkshopCatalog.findFirst({
      where: { name: catalogDef.name },
    });
    const catalog = existingCatalog
      ? await prisma.mobileWorkshopCatalog.update({
          where: { id: existingCatalog.id },
          data: { nameAr: catalogDef.nameAr, imageUrl: catalogDef.imageUrl, sortOrder: catalogDef.sortOrder, isActive: true },
        })
      : await prisma.mobileWorkshopCatalog.create({
          data: { name: catalogDef.name, nameAr: catalogDef.nameAr, imageUrl: catalogDef.imageUrl, sortOrder: catalogDef.sortOrder, isActive: true },
        });

    for (const catDef of catalogDef.categories) {
      const existingCat = await prisma.mobileWorkshopCategory.findFirst({
        where: { catalogId: catalog.id, name: catDef.name },
      });
      const category = existingCat
        ? await prisma.mobileWorkshopCategory.update({
            where: { id: existingCat.id },
            data: { nameAr: catDef.nameAr, imageUrl: catDef.imageUrl, sortOrder: catDef.sortOrder, isActive: true },
          })
        : await prisma.mobileWorkshopCategory.create({
            data: { catalogId: catalog.id, name: catDef.name, nameAr: catDef.nameAr, imageUrl: catDef.imageUrl, sortOrder: catDef.sortOrder, isActive: true },
          });

      for (const svcDef of catDef.services) {
        const existingSvc = await prisma.mobileWorkshopCatalogService.findFirst({
          where: { categoryId: category.id, name: svcDef.name },
        });
        const svcData = {
          nameAr: svcDef.nameAr,
          imageUrl: null,
          priceMin: svcDef.priceMin ?? null,
          priceMax: svcDef.priceMax ?? null,
          currency: 'SAR',
          pricingNoteAr: svcDef.pricingNoteAr || null,
          sortOrder: svcDef.sortOrder,
          isActive: true,
        };
        if (existingSvc) {
          await prisma.mobileWorkshopCatalogService.update({ where: { id: existingSvc.id }, data: svcData });
        } else {
          await prisma.mobileWorkshopCatalogService.create({ data: { categoryId: category.id, name: svcDef.name, ...svcData } });
        }
      }
    }
  }

  console.log('✅ Created mobile workshop hierarchical catalog (catalogs/categories/services)');

  // 17. Create Mobile Workshop Vendors and current workshop locations
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
      typeIdx: 0,
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
      typeIdx: 0,
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
      typeIdx: 0,
      latitude: 24.6037,
      longitude: 46.7219,
    },
  ];

  const createdMobileWorkshops = [];
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

    const workshop = await prisma.mobileWorkshop.upsert({
      where: { vendorId: mobileWorkshopProfile.id },
      update: {
        name: vendorSeed.workshopName,
        nameAr: vendorSeed.workshopNameAr,
        workshopTypeId: createdWorkshopTypes[vendorSeed.typeIdx].id,
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
        workshopTypeId: createdWorkshopTypes[vendorSeed.typeIdx].id,
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

    createdMobileWorkshops.push(workshop);
  }
  console.log('✅ Created mobile workshop vendors and current locations');

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

  // 21. System settings (Towing pricing & timing defaults for admin dashboard)
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
  console.log('✅ Seeded towing system settings for admin dashboard');

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
