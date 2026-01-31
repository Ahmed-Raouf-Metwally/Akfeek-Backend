const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('🚿 Creating dedicated Car Wash Technician...');

    const hash = await bcrypt.hash('Tech123!', 10);
    const email = 'wash_tech@akfeek.com';

    const tech = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            phone: '+966559998877',
            passwordHash: hash,
            role: 'TECHNICIAN',
            status: 'ACTIVE',
            emailVerified: true,
            phoneVerified: true,
            profile: {
                create: {
                    firstName: 'CarWash',
                    lastName: 'Specialist',
                    licenseNumber: 'WASH-001',
                    yearsExperience: 3,
                    currentLat: 24.7136, // Riyadh
                    currentLng: 46.6753,
                    isAvailable: true,
                    serviceRadius: 20,
                    specializations: ['CLEANING', 'MOBILE_WASH'], // Specific Role
                    avatar: 'https://images.unsplash.com/photo-1605218427339-93e1554526b1?w=200&h=200&fit=crop'
                }
            }
        }
    });

    console.log(`✅ Created/Verified Car Wash Technician: ${email}`);

    // Verify specialization
    const profile = await prisma.profile.findUnique({ where: { userId: tech.id } });
    console.log('Specializations:', profile.specializations);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
