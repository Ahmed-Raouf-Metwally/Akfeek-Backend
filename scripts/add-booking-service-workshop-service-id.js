/**
 * يضيف عمود workshopServiceId لجدول BookingService إن لم يكن موجوداً.
 * شغّل مرة واحدة: node scripts/add-booking-service-workshop-service-id.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding BookingService.workshopServiceId column if missing...');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE BookingService
      ADD COLUMN workshopServiceId CHAR(36) NULL
    `);
    console.log('✅ Column BookingService.workshopServiceId added.');
  } catch (e) {
    if (e.message && e.message.includes('Duplicate column name')) {
      console.log('✅ Column BookingService.workshopServiceId already exists. Nothing to do.');
      return;
    }
    throw e;
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE BookingService
      ADD CONSTRAINT BookingService_workshopServiceId_fkey
      FOREIGN KEY (workshopServiceId) REFERENCES CertifiedWorkshopService(id) ON DELETE SET NULL ON UPDATE CASCADE
    `);
    console.log('✅ Foreign key BookingService.workshopServiceId -> CertifiedWorkshopService.id added.');
  } catch (e) {
    if (e.message && (e.message.includes('Duplicate foreign key') || e.message.includes('already exists'))) {
      console.log('✅ Foreign key already exists. Nothing to do.');
    } else {
      throw e;
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
