/**
 * إضافة 24 فيندور: 4 من كل نوع
 * الأنواع: الورش المعتمدة، ورش الغسيل، العناية الشاملة، الوينشات، الورش المتنقلة، قطع الغيار
 * التشغيل: node prisma/seed-24-vendors.js
 * أو: npm run prisma:seed:24vendors
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const PASSWORD = 'Vendor123!';

const VENDOR_GROUPS = [
  {
    vendorType: 'CERTIFIED_WORKSHOP',
    nameEn: 'Certified Workshop',
    nameAr: 'الورش المعتمدة',
    count: 4,
    businessPrefixEn: 'Workshop',
    businessPrefixAr: 'ورشة',
  },
  {
    vendorType: 'CAR_WASH',
    nameEn: 'Car Wash',
    nameAr: 'ورش الغسيل',
    count: 4,
    businessPrefixEn: 'Car Wash',
    businessPrefixAr: 'غسيل سيارات',
  },
  {
    vendorType: 'COMPREHENSIVE_CARE',
    nameEn: 'Comprehensive Care',
    nameAr: 'العناية الشاملة',
    count: 4,
    businessPrefixEn: 'Care Center',
    businessPrefixAr: 'مركز عناية',
  },
  {
    vendorType: 'TOWING_SERVICE',
    nameEn: 'Winch / Towing',
    nameAr: 'الوينشات',
    count: 4,
    businessPrefixEn: 'Winch',
    businessPrefixAr: 'ونش',
  },
  {
    vendorType: 'MOBILE_WORKSHOP',
    nameEn: 'Mobile Workshop',
    nameAr: 'الورش المتنقلة',
    count: 4,
    businessPrefixEn: 'Mobile Workshop',
    businessPrefixAr: 'ورشة متنقلة',
  },
  {
    vendorType: 'AUTO_PARTS',
    nameEn: 'Auto Parts',
    nameAr: 'قطع الغيار',
    count: 4,
    businessPrefixEn: 'Parts Store',
    businessPrefixAr: 'متجر قطع',
  },
];

async function main() {
  console.log('🌱 إضافة 24 فيندور (6 أنواع × 4)...\n');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  let created = 0;
  let updated = 0;
  let globalIndex = 0;

  for (let g = 0; g < VENDOR_GROUPS.length; g++) {
    const group = VENDOR_GROUPS[g];
    console.log(`📌 ${group.nameAr} (${group.vendorType}):`);
    for (let i = 1; i <= group.count; i++) {
      globalIndex++;
      const suffix = `${group.vendorType.toLowerCase().replace(/_/g, '-')}-${i}`;
      const email = `vendor-${suffix}@akfeek.com`;
      const phone = `+966${550000000 + globalIndex}`;
      const businessName = `${group.businessPrefixEn} ${i}`;
      const businessNameAr = `${group.businessPrefixAr} ${i}`;

      const existedBefore = await prisma.user.findUnique({ where: { email } });
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          role: 'VENDOR',
          status: 'ACTIVE',
          passwordHash,
          profile: {
            update: {
              firstName: group.businessPrefixEn,
              lastName: `${i}`,
            },
          },
        },
        create: {
          email,
          phone,
          passwordHash,
          role: 'VENDOR',
          status: 'ACTIVE',
          emailVerified: true,
          phoneVerified: true,
          profile: {
            create: {
              firstName: group.businessPrefixEn,
              lastName: `${i}`,
            },
          },
        },
      });

      const vendor = await prisma.vendorProfile.upsert({
        where: { userId: user.id },
        update: {
          vendorType: group.vendorType,
          businessName,
          businessNameAr,
          contactPhone: phone,
          contactEmail: email,
          status: 'ACTIVE',
        },
        create: {
          userId: user.id,
          vendorType: group.vendorType,
          businessName,
          businessNameAr,
          description: `${group.nameEn} vendor #${i} - Akfeek platform`,
          descriptionAr: `فيندور ${group.nameAr} رقم ${i} - منصة أكفيك`,
          contactPhone: phone,
          contactEmail: email,
          address: 'Riyadh',
          city: 'Riyadh',
          country: 'SA',
          status: 'ACTIVE',
          commercialLicense: `LIC-${suffix}`,
          taxNumber: `TAX-${suffix}`,
        },
      });

      if (!existedBefore) created++;
      else updated++;

      console.log(`   ${i}. ${email} → ${businessNameAr} (${vendor.id.slice(0, 8)})`);
    }
    console.log('');
  }

  console.log('✅ انتهى: ' + created + ' مستخدم/فيندور جديد، ' + updated + ' محدّث.');
  console.log('   كلمة المرور لجميع الحسابات: ' + PASSWORD);
  console.log('   البريد: vendor-<نوع>-<رقم>@akfeek.com (مثال: vendor-certified-workshop-1@akfeek.com)\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
