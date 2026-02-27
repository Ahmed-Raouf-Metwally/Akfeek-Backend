const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const count = await prisma.feedback.count();
    console.log('FEEDBACK_COUNT:' + count);
    const items = await prisma.feedback.findMany({ take: 5 });
    console.log('ITEMS:' + JSON.stringify(items, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
