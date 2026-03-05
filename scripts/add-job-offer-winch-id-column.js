/**
 * يضيف عمود winchId لجدول JobOffer إن لم يكن موجوداً (مطلوب لفلو الوينش).
 * شغّل مرة واحدة: node scripts/add-job-offer-winch-id-column.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding JobOffer.winchId column if missing...');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE JobOffer
      ADD COLUMN winchId CHAR(36) NULL
    `);
    console.log('✅ Column JobOffer.winchId added.');
  } catch (e) {
    if (e.message && e.message.includes('Duplicate column name')) {
      console.log('✅ Column JobOffer.winchId already exists. Nothing to do.');
      return;
    }
    throw e;
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE JobOffer
      ADD CONSTRAINT JobOffer_winchId_fkey
      FOREIGN KEY (winchId) REFERENCES Winch(id) ON DELETE SET NULL ON UPDATE CASCADE
    `);
    console.log('✅ Foreign key JobOffer.winchId -> Winch.id added.');
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
