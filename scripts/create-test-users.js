const {
    PrismaClient
} = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createTestData() {
    console.log('Creating test data...\n');

    const hash = await bcrypt.hash('Test123!', 10);

    // Create customer
    const customer = await prisma.user.upsert({
        where: {
            email: 'customer.test@akfeek.com'
        },
        update: {},
        create: {
            email: 'customer.test@akfeek.com',
            phone: '+966501111111',
            passwordHash: hash,
            role: 'CUSTOMER',
            status: 'ACTIVE'
        }
    });

    // Create vehicle for customer
    const vehicle = await prisma.userVehicle.upsert({
        where: {
            userId_plateNumber: {
                userId: customer.id,
                plateNumber: 'ABC-1234'
            }
        },
        update: {},
        create: {
            userId: customer.id,
            vehicleType: 'SEDAN',
            make: 'Toyota',
            model: 'Camry',
            year: 2020,
            color: 'White',
            plateNumber: 'ABC-1234',
            isDefault: true
        }
    });

    console.log('✅ Test Customer:');
    console.log('   Email: customer.test@akfeek.com');
    console.log('   Password: Test123!');
    console.log('   Vehicle ID:', vehicle.id);
    console.log('   Vehicle:', `${vehicle.make} ${vehicle.model} ${vehicle.year} (${vehicle.plateNumber})\n`);

    console.log('🚀 Ready to test towing service!');
    console.log('1. Login with customer credentials');
    console.log('2. Use vehicle ID above in towing request\n');

    await prisma.$disconnect();
}

createTestData().catch(console.error);