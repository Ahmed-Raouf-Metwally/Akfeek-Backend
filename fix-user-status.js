const prisma = require('./src/utils/database/prisma');

async function fixUserStatus() {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: 'ahmed@example.com' },
      select: {
        id: true,
        email: true,
        status: true,
        role: true
      }
    });

    if (!user) {
      console.log('❌ User not found with email: ahmed@example.com');
      return;
    }

    console.log('User found:', JSON.stringify(user, null, 2));

    if (user.status !== 'ACTIVE') {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE' }
      });
      console.log('✅ User status updated to ACTIVE');
    } else {
      console.log('✅ User is already ACTIVE');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixUserStatus();
