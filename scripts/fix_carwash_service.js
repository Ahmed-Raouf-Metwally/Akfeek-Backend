const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Checking/Creating "Mobile Car Wash" service...');

    const service = await prisma.service.upsert({
        where: {
            // We can't upsert by name only if it's not unique, but let's try findFirst logic
            // We will use findFirst then update or create
            id: 'clm_mobile_car_wash_emergency_001' // deterministic dummy ID for script
        },
        update: {}, // No update if exists based on ID
        create: {
            name: 'Mobile Car Wash',
            nameAr: 'غسيل سيارات متنقل',
            description: 'On-demand car wash service at your location',
            descriptionAr: 'خدمة غسيل سيارات فورية في موقعك',
            type: 'EMERGENCY', // Important: This matches the query in carwash.service.js
            category: 'CLEANING',
            estimatedDuration: 45,
            isActive: true,
            imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
        }
    });

    // Since ID upsert might not work if ID auto-generated is not matching, let's do findFirst
    const existing = await prisma.service.findFirst({
        where: { name: 'Mobile Car Wash', type: 'EMERGENCY' }
    });

    if (!existing) {
        await prisma.service.create({
            data: {
                name: 'Mobile Car Wash',
                nameAr: 'غسيل سيارات متنقل',
                description: 'On-demand car wash service at your location',
                descriptionAr: 'خدمة غسيل سيارات فورية في موقعك',
                type: 'EMERGENCY',
                category: 'CLEANING',
                estimatedDuration: 45,
                isActive: true,
                imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
            }
        });
        console.log('✅ Created "Mobile Car Wash" service.');
    } else {
        console.log('✅ "Mobile Car Wash" service already exists.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
