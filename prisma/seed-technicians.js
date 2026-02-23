const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

/**
 * إنشاء فنيين للاختبار وطلبات الدعم الفني.
 * يمكن تشغيله منفرداً: npm run prisma:seed:technicians
 * كلمة المرور لجميع الفنيين: Admin123!
 */
const TECHNICIANS = [
  { email: 'tech1@akfeek.com', phone: '+966551234001', firstName: 'Mohammed', lastName: 'Al-Rashid', license: 'TECH-001', experience: 5 },
  { email: 'tech2@akfeek.com', phone: '+966551234002', firstName: 'Fahad', lastName: 'Al-Mutairi', license: 'TECH-002', experience: 8 },
  { email: 'tech3@akfeek.com', phone: '+966551234003', firstName: 'Saud', lastName: 'Al-Otaibi', license: 'TECH-003', experience: 3 },
  { email: 'tech4@akfeek.com', phone: '+966551234004', firstName: 'Yousef', lastName: 'Al-Ghamdi', license: 'TECH-004', experience: 10 },
  { email: 'tech5@akfeek.com', phone: '+966551234005', firstName: 'Abdulrahman', lastName: 'Al-Shehri', license: 'TECH-005', experience: 6 },
  { email: 'wash_tech@akfeek.com', phone: '+966559998877', firstName: 'CarWash', lastName: 'Specialist', license: 'WASH-001', experience: 4 },
];

const PASSWORD = 'Admin123!';

async function main() {
  console.log('🔧 Creating Technicians (الفنيين)...\n');

  const hash = await bcrypt.hash(PASSWORD, 10);

  for (const t of TECHNICIANS) {
    await prisma.user.upsert({
      where: { email: t.email },
      update: {
        role: 'TECHNICIAN',
        status: 'ACTIVE',
      },
      create: {
        email: t.email,
        phone: t.phone,
        passwordHash: hash,
        role: 'TECHNICIAN',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            firstName: t.firstName,
            lastName: t.lastName,
            licenseNumber: t.license,
            yearsExperience: t.experience,
            isAvailable: true,
            serviceRadius: 15,
          },
        },
      },
    });
    console.log(`  ✅ ${t.firstName} ${t.lastName} – ${t.email}`);
  }

  console.log(`\n✅ Done. ${TECHNICIANS.length} technician(s). Password for all: ${PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
