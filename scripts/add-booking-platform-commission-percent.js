/**
 * يضيف عمود platformCommissionPercent لجدول Booking إن لم يكن موجوداً.
 * نسبة عمولة المنصة المسجلة وقت الحجز — تغيير النسبة لاحقاً يؤثر على الحجوزات القادمة فقط.
 * شغّل مرة واحدة: node scripts/add-booking-platform-commission-percent.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding Booking.platformCommissionPercent column if missing...');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE Booking
      ADD COLUMN platformCommissionPercent DOUBLE NULL
    `);
    console.log('✅ Column Booking.platformCommissionPercent added.');
  } catch (e) {
    if (e.message && e.message.includes('Duplicate column name')) {
      console.log('✅ Column Booking.platformCommissionPercent already exists. Nothing to do.');
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
