/**
 * يضيف عمود status لجدول JobOffer إن لم يكن موجوداً (مطلوب لفلو الوينش).
 * شغّل مرة واحدة: node scripts/add-job-offer-status-column.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking JobOffer table for status column...');
  try {
    // MySQL: add column (ignore error if it already exists)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE JobOffer
      ADD COLUMN status ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING'
    `);
    console.log('✅ Column JobOffer.status added successfully.');
  } catch (e) {
    if (e.message && e.message.includes('Duplicate column name')) {
      console.log('✅ Column JobOffer.status already exists. Nothing to do.');
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
