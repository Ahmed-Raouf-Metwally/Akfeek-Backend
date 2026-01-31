const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const orders = await prisma.marketplaceOrder.count();
    const ratings = await prisma.rating.count();
    const vendors = await prisma.vendorProfile.count();
    
    console.log(`Orders: ${orders}`);
    console.log(`Ratings: ${ratings}`);
    console.log(`Vendors: ${vendors}`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
