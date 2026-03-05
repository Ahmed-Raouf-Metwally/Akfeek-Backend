/**
 * إضافة 18 فيندور: 3 من كل نوع، ونسبة عمولة مختلفة لكل فيندور
 * الأنواع: الورش المعتمدة، ورش الغسيل، العناية الشاملة، الوينشات، الورش المتنقلة، قطع الغيار
 * التشغيل: node prisma/seed-18-vendors.js
 * أو: npm run prisma:seed:18vendors
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const PASSWORD = 'Vendor123!';

// 3 فيندور لكل نوع، كل واحد بنسبة عمولة مختلفة (مثلاً 6%, 9%, 12%)
const VENDOR_GROUPS = [
  {
    vendorType: 'CERTIFIED_WORKSHOP',
    nameEn: 'Certified Workshop',
    nameAr: 'الورش المعتمدة',
    count: 3,
    businessPrefixEn: 'Workshop',
    businessPrefixAr: 'ورشة',
    commissionPercents: [5.5, 8.0, 11.0],
  },
  {
    vendorType: 'CAR_WASH',
    nameEn: 'Car Wash',
    nameAr: 'ورش الغسيل',
    count: 3,
    businessPrefixEn: 'Car Wash',
    businessPrefixAr: 'غسيل سيارات',
    commissionPercents: [6.0, 9.5, 12.5],
  },
  {
    vendorType: 'COMPREHENSIVE_CARE',
    nameEn: 'Comprehensive Care',
    nameAr: 'العناية الشاملة',
    count: 3,
    businessPrefixEn: 'Care Center',
    businessPrefixAr: 'مركز عناية',
    commissionPercents: [5.0, 8.5, 10.0],
  },
  {
    vendorType: 'TOWING_SERVICE',
    nameEn: 'Winch / Towing',
    nameAr: 'الوينشات',
    count: 3,
    businessPrefixEn: 'Winch',
    businessPrefixAr: 'ونش',
    commissionPercents: [7.0, 10.0, 13.0],
  },
  {
    vendorType: 'MOBILE_WORKSHOP',
    nameEn: 'Mobile Workshop',
    nameAr: 'الورش المتنقلة',
    count: 3,
    businessPrefixEn: 'Mobile Workshop',
    businessPrefixAr: 'ورشة متنقلة',
    commissionPercents: [6.5, 9.0, 11.5],
  },
  {
    vendorType: 'AUTO_PARTS',
    nameEn: 'Auto Parts',
    nameAr: 'قطع الغيار',
    count: 3,
    businessPrefixEn: 'Parts Store',
    businessPrefixAr: 'متجر قطع',
    commissionPercents: [7.5, 10.5, 14.0],
  },
];

async function main() {
  console.log('🌱 إضافة 18 فيندور (6 أنواع × 3)، نسبة عمولة مختلفة لكل فيندور...\n');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  let created = 0;
  let updated = 0;
  let globalIndex = 0;

  for (let g = 0; g < VENDOR_GROUPS.length; g++) {
    const group = VENDOR_GROUPS[g];
    console.log(`📌 ${group.nameAr} (${group.vendorType}):`);
    for (let i = 1; i <= group.count; i++) {
      globalIndex++;
      const commissionPercent = group.commissionPercents[i - 1];
      const suffix = `${group.vendorType.toLowerCase().replace(/_/g, '-')}-${i}`;
      const email = `vendor-${suffix}@akfeek.com`;
      const phone = `+966${500000000 + globalIndex}`;
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
          commissionPercent,
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
          commissionPercent,
        },
      });

      if (!existedBefore) created++;
      else updated++;

      console.log(`   ${i}. ${email} → ${businessNameAr} (عمولة ${commissionPercent}%)`);
    }
    console.log('');
  }

  console.log('✅ انتهى: ' + created + ' مستخدم/فيندور جديد، ' + updated + ' محدّث.');
  console.log('   كلمة المرور لجميع الحسابات: ' + PASSWORD);
  console.log('   البريد: vendor-<نوع>-<رقم>@akfeek.com');
  console.log('   كل فيندور له نسبة عمولة مختلفة (من 5% إلى 14%).\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
