const axios = require('axios');
const prisma = require('../src/utils/database/prisma');
const bcrypt = require('bcrypt');

const API_URL = 'http://localhost:5000/api';

async function runFlow() {
    try {
        console.log('🚀 Starting Car Wash Flow Test (with DB Setup)...\n');
        // console.log('Prisma Keys:', Object.keys(prisma)); // Debug keys
        // Prisma keys are often hidden, let's try specific checks
        console.log('Has User:', !!prisma.user);
        console.log('Has Vehicle:', !!prisma.vehicle);
        console.log('Has VehicleBrand:', !!prisma.vehicleBrand);

        // 0. Setup Test Data in DB
        console.log('0️⃣ Keying up Test Data...');
        const email = `test.customer.${Date.now()}@akfeek.com`;
        const password = 'Password123!';
        const hash = await bcrypt.hash(password, 10);

        // Check prisma access
        if (!prisma.user) {
            console.error('CRITICAL: prisma.user is undefined. Keys:', Object.keys(prisma));
            // Fallback attempt if something is wrong with instance
            // return;
        }

        const customer = await prisma.user.create({
            data: {
                email,
                passwordHash: hash,
                role: 'CUSTOMER',
                status: 'ACTIVE',
                emailVerified: true,
                phone: `+9665${Math.floor(Math.random() * 100000000)}`,
                profile: {
                    create: {
                        firstName: 'Test',
                        lastName: 'Customer',
                    }
                }
            }
        });

        const brand = await prisma.vehicleBrand.findFirst();
        // Fallback if no brands seeded
        let modelId;
        if (!brand) {
            console.log('⚠️ No brands found, creating dummy brand/model...');
            const newBrand = await prisma.vehicleBrand.create({ data: { name: 'TestBrand', nameAr: 'تست' } });
            const newModel = await prisma.vehicleModel.create({ data: { name: 'TestModel', nameAr: 'موديل', brandId: newBrand.id, year: 2023 } });
            modelId = newModel.id;
        } else {
            const model = await prisma.vehicleModel.findFirst({ where: { brandId: brand.id } });
            modelId = model.id;
        }


        const vehicle = await prisma.userVehicle.create({
            data: {
                userId: customer.id,
                vehicleModelId: modelId,
                plateNumber: `ABC-${Math.floor(Math.random() * 1000)}`,
                plateLettersEn: 'ABC',
                plateDigits: '1234',
                color: 'White'
            }
        });

        console.log(`✅ Created Customer: ${email}`);
        console.log(`✅ Created Vehicle: ${vehicle.id}`);

        // 1. Login as Customer
        console.log('\n1️⃣ Logging in as Customer...');
        const customerAuth = await axios.post(`${API_URL}/auth/login`, {
            identifier: email,
            password: password
        });
        const customerToken = customerAuth.data.data.token;
        console.log('✅ Customer Logged In.');

        // 2. Request Car Wash
        console.log('\n2️⃣ Creating Car Wash Request...');
        const requestRes = await axios.post(`${API_URL}/bookings/carwash/request`, {
            vehicleId: vehicle.id,
            location: {
                latitude: 24.7136,
                longitude: 46.6753,
                address: "Test Location, Riyadh"
            },
            serviceType: "FULL",
            estimatedBudget: 150,
            notes: "Test automated flow"
        }, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        const broadcastId = requestRes.data.data.broadcastId;
        console.log(`✅ Request Broadcasted! ID: ${broadcastId}`);

        // 3. Login as Technician
        console.log('\n3️⃣ Logging in as Technician...');
        const techAuth = await axios.post(`${API_URL}/auth/login`, {
            identifier: 'wash_tech@akfeek.com',
            password: 'Tech123!'
        });
        const techToken = techAuth.data.data.token;
        console.log('✅ Technician Logged In.');

        // 4. Submit Offer
        console.log('\n4️⃣ Submitting Offer...');
        const offerRes = await axios.post(`${API_URL}/technician/carwash/${broadcastId}/offers`, {
            bidAmount: 140,
            estimatedArrival: 30,
            message: "I can be there in 30 mins"
        }, {
            headers: { Authorization: `Bearer ${techToken}` }
        });

        const offerId = offerRes.data.data.id || offerRes.data.data.offer?.id;

        console.log(`✅ Offer Submitted! ID: ${offerId}`);

        console.log('\n👇 RESULTS (Copy these): 👇');
        console.log(JSON.stringify({
            broadcastId: broadcastId,
            offerId: offerId
        }, null, 2));

        console.log(`\n🔑 Customer Token: (Hidden to prevent log truncation. Login as ${email} / ${password} if needed)`);
        console.log('👉 To Accept: POST /api/bookings/carwash/' + broadcastId + '/offers/' + offerId + '/accept');

    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
        if (error.stack) console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

runFlow();
