/**
 * ربط كل فيندور بالكيان الخاص به فقط:
 * - فيندور الورش المعتمدة (CERTIFIED_WORKSHOP) → ورشة معتمدة + 5 خدمات
 * - فيندور الوينش (TOWING_SERVICE) → ونش
 * - فيندور الورش المتنقلة (MOBILE_WORKSHOP) → ورشة متنقلة + 5 خدمات
 * - باقي الأنواع (قطع غيار، غسيل، عناية شاملة) لا ورشة/ونش/ورشة متنقلة
 *
 * التشغيل: node prisma/seed-18-vendors-correct-attachments.js
 * أو: npm run prisma:seed:18attachments
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ——— ورشة معتمدة: 5 خدمات ———
const CERTIFIED_SERVICES = [
  { serviceType: 'GENERAL',     name: 'General Maintenance',     nameAr: 'صيانة عامة',        description: 'فحص وصيانة عامة للمركبة',           priceBase: 150, estimatedDuration: 60 },
  { serviceType: 'DIAGNOSIS',   name: 'Diagnosis',                nameAr: 'فحص وتشخيص',        description: 'فحص كمبيوتر وتشخيص الأعطال',       priceBase: 120, estimatedDuration: 45 },
  { serviceType: 'AC',          name: 'AC Service',               nameAr: 'صيانة التكييف',      description: 'تعبئة فريون وفحص التكييف',           priceBase: 180, estimatedDuration: 40 },
  { serviceType: 'BRAKE',       name: 'Brake Service',            nameAr: 'فحص وإصلاح الفرامل', description: 'فحص نظام الفرامل واستبدال البطانة', priceBase: 200, estimatedDuration: 90 },
  { serviceType: 'OIL_CHANGE',  name: 'Engine Oil Change',         nameAr: 'تغيير زيت المحرك',   description: 'تغيير زيت وفلتر المحرك',            priceBase: 130, estimatedDuration: 35 },
];
const CERTIFIED_SERVICES_JSON = JSON.stringify(['GENERAL', 'DIAGNOSIS', 'AC', 'BRAKE', 'OIL_CHANGE']);

// ——— ورشة متنقلة: 5 خدمات ———
const MOBILE_SERVICES = [
  { serviceType: 'OIL_CHANGE',  name: 'Engine Oil Change',     nameAr: 'تغيير زيت المحرك',     description: 'تغيير زيت المحرك والفلتر',           price: 120, estimatedDuration: 30 },
  { serviceType: 'TIRE',        name: 'Tire Check & Replace',   nameAr: 'فحص واستبدال الإطارات', description: 'فحص ضغط الهواء واستبدال إطار عند الحاجة', price: 80,  estimatedDuration: 25 },
  { serviceType: 'BATTERY',     name: 'Battery Check',          nameAr: 'فحص واستبدال البطارية', description: 'فحص شحن البطارية واستبدالها إن لزم',     price: 150, estimatedDuration: 20 },
  { serviceType: 'BRAKE',       name: 'Brake Check',            nameAr: 'فحص الفرامل',          description: 'فحص نظام الفرامل وبطانة الفرامل',        price: 100, estimatedDuration: 35 },
  { serviceType: 'GENERAL',     name: 'General Maintenance',    nameAr: 'صيانة عامة وفحص',      description: 'فحص عام للمركبة وتشخيص الأعطال',       price: 90,  estimatedDuration: 45 },
];

async function fixWrongWorkshops() {
  const workshops = await prisma.certifiedWorkshop.findMany({
    where: { vendorId: { not: null } },
    include: { vendor: { select: { vendorType: true } } },
  });
  const wrong = workshops.filter((w) => w.vendor && w.vendor.vendorType !== 'CERTIFIED_WORKSHOP');
  for (const w of wrong) {
    await prisma.certifiedWorkshopService.deleteMany({ where: { workshopId: w.id } });
    await prisma.certifiedWorkshop.delete({ where: { id: w.id } });
  }
  return wrong.length;
}

async function createCertifiedWorkshops() {
  const vendors = await prisma.vendorProfile.findMany({
    where: { vendorType: 'CERTIFIED_WORKSHOP', workshop: null },
    orderBy: { createdAt: 'asc' },
  });
  let count = 0;
  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i];
    const city = v.city || 'Riyadh';
    const workshop = await prisma.certifiedWorkshop.create({
      data: {
        name: (v.businessName || v.businessNameAr || `Workshop ${i + 1}`).slice(0, 120),
        nameAr: (v.businessNameAr || v.businessName || `ورشة ${i + 1}`).slice(0, 120),
        description: `ورشة معتمدة تابعة لـ ${v.businessName || v.businessNameAr || 'الفيندور'}`,
        descriptionAr: `ورشة معتمدة تابعة لـ ${v.businessNameAr || v.businessName || 'الفيندور'}`,
        address: `${city}, شارع الملك فهد`,
        addressAr: `${city}، شارع الملك فهد`,
        city,
        cityAr: city,
        latitude: 24.7136 + (i % 10) * 0.008,
        longitude: 46.6753 + (i % 10) * 0.008,
        phone: v.contactPhone || `+9665000${String(10000 + i).slice(-5)}`,
        email: v.contactEmail || null,
        services: CERTIFIED_SERVICES_JSON,
        isActive: true,
        isVerified: v.status === 'ACTIVE',
        verifiedAt: v.status === 'ACTIVE' ? new Date() : null,
        vendorId: v.id,
      },
    });
    for (let s = 0; s < CERTIFIED_SERVICES.length; s++) {
      const svc = CERTIFIED_SERVICES[s];
      await prisma.certifiedWorkshopService.create({
        data: {
          workshopId: workshop.id,
          serviceType: svc.serviceType,
          name: svc.name,
          nameAr: svc.nameAr,
          description: svc.description,
          price: svc.priceBase + (i * 10 + s * 5) % 50,
          currency: 'SAR',
          estimatedDuration: svc.estimatedDuration,
          isActive: true,
        },
      });
    }
    count++;
    console.log(`   ✅ ورشة معتمدة: ${v.businessNameAr || v.businessName} (5 خدمات)`);
  }
  return count;
}

async function createWinches() {
  const vendors = await prisma.vendorProfile.findMany({
    where: { vendorType: 'TOWING_SERVICE', winch: null },
    orderBy: { createdAt: 'asc' },
  });
  const usedPlates = new Set((await prisma.winch.findMany({ select: { plateNumber: true } })).map((w) => w.plateNumber));
  let count = 0;
  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i];
    let plate = `WN-${v.id.slice(0, 8).toUpperCase()}`;
    let s = 0;
    while (usedPlates.has(plate)) { s++; plate = `WN-${v.id.slice(0, 6).toUpperCase()}-${s}`; }
    usedPlates.add(plate);
    await prisma.winch.create({
      data: {
        name: (v.businessNameAr || v.businessName || `ونش ${i + 1}`).slice(0, 80),
        nameAr: (v.businessNameAr || v.businessName || `ونش ${i + 1}`).slice(0, 80),
        plateNumber: plate,
        vehicleModel: 'Tow Truck',
        year: new Date().getFullYear(),
        capacity: 3,
        city: v.city || 'Riyadh',
        basePrice: 150 + i * 20,
        pricePerKm: 2.5,
        minPrice: 100,
        currency: 'SAR',
        isAvailable: true,
        isActive: true,
        isVerified: v.status === 'ACTIVE',
        verifiedAt: v.status === 'ACTIVE' ? new Date() : null,
        vendorId: v.id,
      },
    });
    count++;
    console.log(`   ✅ ونش: ${v.businessNameAr || v.businessName} — لوحة ${plate}`);
  }
  return count;
}

async function createMobileWorkshops() {
  const vendors = await prisma.vendorProfile.findMany({
    where: { vendorType: 'MOBILE_WORKSHOP', mobileWorkshop: null },
    orderBy: { createdAt: 'asc' },
  });
  const usedPlates = new Set(
    (await prisma.mobileWorkshop.findMany({ where: { plateNumber: { not: null } }, select: { plateNumber: true } }))
      .map((w) => w.plateNumber).filter(Boolean)
  );
  let count = 0;
  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i];
    let plate = `MW-${v.id.slice(0, 8).toUpperCase()}`;
    let s = 0;
    while (usedPlates.has(plate)) { s++; plate = `MW-${v.id.slice(0, 6).toUpperCase()}-${s}`; }
    usedPlates.add(plate);
    const workshop = await prisma.mobileWorkshop.create({
      data: {
        name: (v.businessNameAr || v.businessName || `ورشة متنقلة ${i + 1}`).slice(0, 120),
        nameAr: (v.businessNameAr || v.businessName || `ورشة متنقلة ${i + 1}`).slice(0, 120),
        description: `ورشة متنقلة تابعة لـ ${v.businessName || v.businessNameAr || 'الفيندور'}`,
        vehicleType: 'Van',
        vehicleModel: 'Mobile Workshop Van',
        year: new Date().getFullYear(),
        plateNumber: plate,
        city: v.city || 'Riyadh',
        serviceRadius: 50,
        basePrice: 120,
        pricePerKm: 2,
        minPrice: 80,
        currency: 'SAR',
        isAvailable: true,
        isActive: true,
        isVerified: v.status === 'ACTIVE',
        verifiedAt: v.status === 'ACTIVE' ? new Date() : null,
        vendorId: v.id,
      },
    });
    for (const svc of MOBILE_SERVICES) {
      await prisma.mobileWorkshopService.create({
        data: {
          mobileWorkshopId: workshop.id,
          serviceType: svc.serviceType,
          name: svc.name,
          nameAr: svc.nameAr,
          description: svc.description,
          price: svc.price,
          currency: 'SAR',
          estimatedDuration: svc.estimatedDuration,
          isActive: true,
        },
      });
    }
    count++;
    console.log(`   ✅ ورشة متنقلة: ${v.businessNameAr || v.businessName} (5 خدمات) — لوحة ${plate}`);
  }
  return count;
}

async function main() {
  console.log('🔧 ربط كل فيندور بالكيان الخاص به فقط...\n');

  console.log('1️⃣ إزالة الورش المعتمدة المرتبطة بفيندورات غير "الورش المعتمدة"...');
  const removed = await fixWrongWorkshops();
  console.log(`   🗑️ تم حذف ${removed} ورشة خاطئة.\n`);

  console.log('2️⃣ فيندور الورش المعتمدة → ورشة معتمدة + 5 خدمات');
  const cw = await createCertifiedWorkshops();
  console.log(`   تم: ${cw} ورشة معتمدة.\n`);

  console.log('3️⃣ فيندور الوينش → ونش');
  const winches = await createWinches();
  console.log(`   تم: ${winches} ونش.\n`);

  console.log('4️⃣ فيندور الورش المتنقلة → ورشة متنقلة + 5 خدمات');
  const mw = await createMobileWorkshops();
  console.log(`   تم: ${mw} ورشة متنقلة.\n`);

  console.log('✅ انتهى. كل فيندور مرتبط بحاجته فقط (ورشة معتمدة / ونش / ورشة متنقلة).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
