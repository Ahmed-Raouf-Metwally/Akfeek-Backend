/**
 * إنشاء/تحديث حساب فيندور العناية الشاملة (My Services & Appointments) في قاعدة البيانات.
 * يضمن أن vendor-care@akfeek.com يشوف فقط: My Services، Appointments (وليس قطع الغيار).
 * Run: node prisma/seed-comprehensive-care-vendor.js
 * أو: npm run prisma:seed:care
 * ثم أعد تسجيل الدخول أو حدّث الصفحة.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const EMAIL = 'vendor-care@akfeek.com';
const PASSWORD = 'Admin123!';
const PHONE = '+966571234099';

async function main() {
  console.log('🛡️ Creating Comprehensive Care vendor account (My Services & Appointments)...\n');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { role: 'VENDOR', passwordHash, status: 'ACTIVE' },
    create: {
      email: EMAIL,
      phone: PHONE,
      passwordHash,
      role: 'VENDOR',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      profile: {
        create: {
          firstName: 'Care',
          lastName: 'Vendor',
        },
      },
    },
  });

  const vendorProfile = await prisma.vendorProfile.upsert({
    where: { userId: user.id },
    update: { vendorType: 'COMPREHENSIVE_CARE', status: 'ACTIVE' },
    create: {
      userId: user.id,
      vendorType: 'COMPREHENSIVE_CARE',
      businessName: 'Comprehensive Care Partner',
      businessNameAr: 'فيندور العناية الشاملة',
      description: 'Vendor offering the Comprehensive Care Service (خدمة العناية الشاملة)',
      descriptionAr: 'فيندور يقدم خدمة العناية الشاملة: فحص، صيانة، تنظيف وتعبئة سوائل',
      contactEmail: EMAIL,
      contactPhone: PHONE,
      address: 'Riyadh',
      city: 'Riyadh',
      country: 'SA',
      taxNumber: `TAX-${Date.now().toString().slice(-8)}`,
      commercialLicense: `LIC-${Date.now().toString().slice(-8)}`,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Account created/updated:\n');
  console.log('   Email:    ', EMAIL);
  console.log('   Password: ', PASSWORD);
  console.log('   Vendor ID:', vendorProfile.id);
  console.log('   Type:     COMPREHENSIVE_CARE (My Services & Appointments)\n');
  console.log('   Login at dashboard then use: Vendor → العناية الشاملة → My Services / Appointments\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
