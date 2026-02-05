const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedWorkshops() {
    console.log('🏢 Seeding Certified Workshops...\n');

    const workshopsData = [
        {
            name: 'Al-Salam Auto Center',
            nameAr: 'مركز السلام للسيارات',
            description: 'Professional auto repair and maintenance center with certified technicians.',
            descriptionAr: 'مركز صيانة وإصلاح سيارات احترافي مع فنيين معتمدين.',
            address: 'King Fahd Road, Al-Olaya District',
            addressAr: 'طريق الملك فهد، حي العليا',
            city: 'Riyadh',
            cityAr: 'الرياض',
            latitude: 24.7136,
            longitude: 46.6753,
            phone: '+966112345001',
            email: 'info@alsalam-auto.sa',
            workingHours: {
                sunday: { open: '08:00', close: '18:00' },
                monday: { open: '08:00', close: '18:00' },
                tuesday: { open: '08:00', close: '18:00' },
                wednesday: { open: '08:00', close: '18:00' },
                thursday: { open: '08:00', close: '18:00' },
                saturday: { open: '09:00', close: '15:00' }
            },
            services: JSON.stringify(['Engine Repair', 'Brake Service', 'Oil Change', 'Transmission Repair', 'AC Repair']),
            isActive: true,
            isVerified: true,
            verifiedAt: new Date(),
            averageRating: 4.7,
            totalReviews: 128,
            totalBookings: 450
        },
        {
            name: 'Elite Motors Workshop',
            nameAr: 'ورشة إيليت موتورز',
            description: 'Specialized in luxury vehicles maintenance and repair.',
            descriptionAr: 'متخصصون في صيانة وإصلاح المركبات الفاخرة.',
            address: 'Tahlia Street',
            addressAr: 'شارع التحلية',
            city: 'Jeddah',
            cityAr: 'جدة',
            latitude: 21.5433,
            longitude: 39.1728,
            phone: '+966122345002',
            email: 'contact@elitemotors.sa',
            workingHours: {
                sunday: { open: '09:00', close: '19:00' },
                monday: { open: '09:00', close: '19:00' },
                tuesday: { open: '09:00', close: '19:00' },
                wednesday: { open: '09:00', close: '19:00' },
                thursday: { open: '09:00', close: '19:00' },
                saturday: { open: '10:00', close: '16:00' }
            },
            services: JSON.stringify(['Engine Repair', 'Brake Service', 'Oil Change', 'AC Repair', 'Tire Service']),
            isActive: true,
            isVerified: true,
            verifiedAt: new Date(),
            averageRating: 4.9,
            totalReviews: 210,
            totalBookings: 680
        },
        {
            name: 'Quick Fix Auto Service',
            nameAr: 'كويك فكس لخدمات السيارات',
            description: 'Fast and reliable auto service for all car brands.',
            descriptionAr: 'خدمة سيارات سريعة وموثوقة لجميع العلامات التجارية.',
            address: 'King Abdul Aziz Road',
            addressAr: 'طريق الملك عبدالعزيز',
            city: 'Dammam',
            cityAr: 'الدمام',
            latitude: 26.4207,
            longitude: 50.0888,
            phone: '+966133345003',
            email: 'service@quickfix.sa',
            workingHours: {
                sunday: { open: '07:00', close: '17:00' },
                monday: { open: '07:00', close: '17:00' },
                tuesday: { open: '07:00', close: '17:00' },
                wednesday: { open: '07:00', close: '17:00' },
                thursday: { open: '07:00', close: '17:00' },
                saturday: { open: '08:00', close: '14:00' }
            },
            services: JSON.stringify(['Oil Change', 'Brake Service', 'Tire Rotation', 'Battery Replacement', 'AC Service']),
            isActive: true,
            isVerified: true,
            verifiedAt: new Date(),
            averageRating: 4.5,
            totalReviews: 95,
            totalBookings: 320
        },
        {
            name: 'Pro Auto Care',
            nameAr: 'برو أوتو كير',
            description: 'Comprehensive auto care services with modern equipment.',
            descriptionAr: 'خدمات رعاية سيارات شاملة بمعدات حديثة.',
            address: 'Prince Sultan Road',
            addressAr: 'طريق الأمير سلطان',
            city: 'Riyadh',
            cityAr: 'الرياض',
            latitude: 24.6900,
            longitude: 46.6850,
            phone: '+966112345004',
            email: 'info@proautocare.sa',
            workingHours: {
                sunday: { open: '08:30', close: '18:30' },
                monday: { open: '08:30', close: '18:30' },
                tuesday: { open: '08:30', close: '18:30' },
                wednesday: { open: '08:30', close: '18:30' },
                thursday: { open: '08:30', close: '18:30' },
                saturday: { open: '09:00', close: '15:00' }
            },
            services: JSON.stringify(['Engine Diagnostic', 'Transmission Service', 'Brake System', 'Electrical Repair', 'Body Work']),
            isActive: true,
            isVerified: false, // Pending verification
            averageRating: 4.3,
            totalReviews: 67,
            totalBookings: 180
        }
    ];

    let workshopCount = 0;
    let skippedCount = 0;

    for (const workshopData of workshopsData) {
        try {
            // Check if workshop already exists by phone
            const existing = await prisma.certifiedWorkshop.findFirst({
                where: { phone: workshopData.phone }
            });

            if (existing) {
                console.log(`⏭️  Skipped (already exists): ${workshopData.name}`);
                skippedCount++;
            } else {
                await prisma.certifiedWorkshop.create({
                    data: workshopData
                });
                workshopCount++;
                console.log(`✅ Created: ${workshopData.name}`);
            }
        } catch (error) {
            console.error(`❌ Error with ${workshopData.name}:`, error.message);
        }
    }

    console.log(`\n✅ Successfully seeded ${workshopCount} new workshops`);
    if (skippedCount > 0) {
        console.log(`⏭️  Skipped ${skippedCount} existing workshops`);
    }

    // Display summary
    const workshops = await prisma.certifiedWorkshop.findMany();
    console.log('\n📊 Workshop Summary:');
    console.log(`   Total: ${workshops.length}`);
    console.log(`   Verified: ${workshops.filter(w => w.isVerified).length}`);
    console.log(`   Active: ${workshops.filter(w => w.isActive).length}`);
    console.log(`   Cities: ${[...new Set(workshops.map(w => w.city))].join(', ')}`);
}

seedWorkshops()
    .catch((e) => {
        console.error('\n❌ Error seeding workshops:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
