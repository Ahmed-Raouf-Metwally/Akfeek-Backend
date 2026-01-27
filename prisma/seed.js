const {
    PrismaClient
} = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...\n');

    // ============================================
    // 0. Admin user & roles (إدارة الصلاحيات)
    // ============================================
    console.log('👤 Seeding Admin user...');
    const adminPassword = 'Admin123!';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
        where: {
            email: 'admin@akfeek.com'
        },
        update: {},
        create: {
            email: 'admin@akfeek.com',
            passwordHash: adminHash,
            role: 'ADMIN',
            status: 'ACTIVE',
            profile: {
                create: {
                    firstName: 'Admin',
                    lastName: 'User'
                }
            }
        }
    });
    console.log('✅ Admin user: admin@akfeek.com / Admin123!\n');

    // ============================================
    // 1. Vehicle Brands & Models (كتالوج المركبات)
    // ============================================
    console.log('📦 Seeding Vehicle Brands & Models...');

    // Map legacy size to Prisma VehicleType enum
    const sizeToVehicleType = {
        SMALL: 'SEDAN',
        MEDIUM: 'CROSSOVER',
        LARGE: 'SUV',
        EXTRA_LARGE: 'TRUCK'
    };

    const vehicleData = [{
            make: 'Toyota',
            model: 'Camry',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Toyota',
            model: 'Camry',
            year: 2022,
            size: 'MEDIUM'
        },
        {
            make: 'Toyota',
            model: 'Corolla',
            year: 2023,
            size: 'SMALL'
        },
        {
            make: 'Toyota',
            model: 'Corolla',
            year: 2022,
            size: 'SMALL'
        },
        {
            make: 'Toyota',
            model: 'Land Cruiser',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'Toyota',
            model: 'Hilux',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'Toyota',
            model: 'RAV4',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Honda',
            model: 'Accord',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Honda',
            model: 'Civic',
            year: 2023,
            size: 'SMALL'
        },
        {
            make: 'Honda',
            model: 'CR-V',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Honda',
            model: 'Pilot',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'BMW',
            model: 'X5',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'BMW',
            model: 'X3',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'BMW',
            model: '3 Series',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'BMW',
            model: '5 Series',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'BMW',
            model: '7 Series',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'Mercedes-Benz',
            model: 'C-Class',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Mercedes-Benz',
            model: 'E-Class',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Mercedes-Benz',
            model: 'S-Class',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'Mercedes-Benz',
            model: 'GLE',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'Mercedes-Benz',
            model: 'GLC',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Nissan',
            model: 'Altima',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Nissan',
            model: 'Maxima',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Nissan',
            model: 'Patrol',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'Nissan',
            model: 'X-Trail',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Hyundai',
            model: 'Elantra',
            year: 2023,
            size: 'SMALL'
        },
        {
            make: 'Hyundai',
            model: 'Sonata',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Hyundai',
            model: 'Tucson',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Hyundai',
            model: 'Santa Fe',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'Kia',
            model: 'Optima',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Kia',
            model: 'Sportage',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Kia',
            model: 'Sorento',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'Ford',
            model: 'Explorer',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'Ford',
            model: 'Expedition',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'Ford',
            model: 'Edge',
            year: 2023,
            size: 'MEDIUM'
        },
        {
            make: 'Chevrolet',
            model: 'Tahoe',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'Chevrolet',
            model: 'Suburban',
            year: 2023,
            size: 'EXTRA_LARGE'
        },
        {
            make: 'Chevrolet',
            model: 'Traverse',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'GMC',
            model: 'Yukon',
            year: 2023,
            size: 'LARGE'
        },
        {
            make: 'GMC',
            model: 'Acadia',
            year: 2023,
            size: 'MEDIUM'
        },
    ];

    const brandNames = [...new Set(vehicleData.map((v) => v.make))];
    const brandIdByName = {};

    for (const name of brandNames) {
        const brand = await prisma.vehicleBrand.upsert({
            where: {
                name
            },
            update: {},
            create: {
                name
            }
        });
        brandIdByName[name] = brand.id;
    }

    for (const v of vehicleData) {
        await prisma.vehicleModel.upsert({
            where: {
                brandId_name_year: {
                    brandId: brandIdByName[v.make],
                    name: v.model,
                    year: v.year
                }
            },
            update: {},
            create: {
                brandId: brandIdByName[v.make],
                name: v.model,
                year: v.year,
                type: sizeToVehicleType[v.size] || 'SEDAN'
            }
        });
    }

    console.log(`✅ Created ${brandNames.length} brands, ${vehicleData.length} vehicle models\n`);

    // ============================================
    // 2. Services (الخدمات)
    // ============================================
    console.log('🔧 Seeding Services...');

    const services = [
        // CLEANING Services
        {
            name: 'Basic Car Wash',
            nameAr: 'غسيل سيارة أساسي',
            description: 'Exterior wash and interior vacuum',
            descriptionAr: 'غسيل خارجي وشفط الداخل',
            type: 'FIXED',
            category: 'CLEANING',
            estimatedDuration: 30
        },
        {
            name: 'Premium Car Wash',
            nameAr: 'غسيل سيارة متميز',
            description: 'Full wash, wax, and interior detailing',
            descriptionAr: 'غسيل كامل، تلميع، وتنظيف داخلي شامل',
            type: 'FIXED',
            category: 'CLEANING',
            estimatedDuration: 90
        },
        {
            name: 'Polishing & Waxing',
            nameAr: 'تلميع وشمع',
            description: 'Professional polishing and wax coating',
            descriptionAr: 'تلميع احترافي وطبقة شمع',
            type: 'FIXED',
            category: 'CLEANING',
            estimatedDuration: 120
        },

        // MAINTENANCE Services
        {
            name: 'Oil Change',
            nameAr: 'تغيير الزيت',
            description: 'Engine oil and filter replacement',
            descriptionAr: 'تغيير زيت المحرك والفلتر',
            type: 'CATALOG',
            category: 'MAINTENANCE',
            estimatedDuration: 45
        },
        {
            name: 'Brake Service',
            nameAr: 'خدمة الفرامل',
            description: 'Brake inspection and pad replacement',
            descriptionAr: 'فحص الفرامل وتغيير الفحمات',
            type: 'CATALOG',
            category: 'MAINTENANCE',
            estimatedDuration: 90
        },
        {
            name: 'Tire Rotation',
            nameAr: 'تدوير الإطارات',
            description: 'Professional tire rotation and balancing',
            descriptionAr: 'تدوير وموازنة الإطارات احترافياً',
            type: 'FIXED',
            category: 'MAINTENANCE',
            estimatedDuration: 60
        },
        {
            name: 'Battery Replacement',
            nameAr: 'تغيير البطارية',
            description: 'Old battery removal and new installation',
            descriptionAr: 'إزالة البطارية القديمة وتركيب جديدة',
            type: 'CATALOG',
            category: 'MAINTENANCE',
            estimatedDuration: 30
        },

        // REPAIR Services
        {
            name: 'Engine Repair',
            nameAr: 'إصلاح المحرك',
            description: 'Complete engine diagnostic and repair',
            descriptionAr: 'فحص وإصلاح المحرك الكامل',
            type: 'CATALOG',
            category: 'REPAIR',
            estimatedDuration: 240
        },
        {
            name: 'Transmission Repair',
            nameAr: 'إصلاح ناقل الحركة',
            description: 'Transmission diagnostic and repair',
            descriptionAr: 'فحص وإصلاح ناقل الحركة',
            type: 'CATALOG',
            category: 'REPAIR',
            estimatedDuration: 300
        },
        {
            name: 'AC Repair',
            nameAr: 'إصلاح المكيف',
            description: 'Air conditioning system repair and recharge',
            descriptionAr: 'إصلاح نظام التكييف وإعادة الشحن',
            type: 'CATALOG',
            category: 'REPAIR',
            estimatedDuration: 120
        },

        // EMERGENCY Services
        {
            name: 'Roadside Assistance',
            nameAr: 'مساعدة على الطريق',
            description: 'On-location emergency assistance',
            descriptionAr: 'مساعدة طارئة في الموقع',
            type: 'EMERGENCY',
            category: 'EMERGENCY',
            estimatedDuration: 60
        },
        {
            name: 'Towing Service',
            nameAr: 'خدمة السحب',
            description: 'Vehicle towing to workshop',
            descriptionAr: 'سحب المركبة إلى الورشة',
            type: 'EMERGENCY',
            category: 'EMERGENCY',
            estimatedDuration: 45
        },
        {
            name: 'Battery Jump Start',
            nameAr: 'تشغيل البطارية',
            description: 'Emergency battery jump start',
            descriptionAr: 'تشغيل البطارية الطارئ',
            type: 'EMERGENCY',
            category: 'EMERGENCY',
            estimatedDuration: 20
        },

        // INSPECTION Services
        {
            name: 'Ekfik Full Inspection',
            nameAr: 'فحص أكفيك الكامل',
            description: 'Comprehensive vehicle inspection with valet service',
            descriptionAr: 'فحص شامل للمركبة مع خدمة الڤاليه',
            type: 'INSPECTION',
            category: 'INSPECTION',
            estimatedDuration: 180
        },
        {
            name: 'Pre-Purchase Inspection',
            nameAr: 'فحص قبل الشراء',
            description: 'Complete inspection before buying',
            descriptionAr: 'فحص كامل قبل الشراء',
            type: 'INSPECTION',
            category: 'INSPECTION',
            estimatedDuration: 120
        }
    ];

    let servicesCreated = 0;
    for (const service of services) {
        const existing = await prisma.service.findFirst({
            where: {
                name: service.name,
                category: service.category
            }
        });
        if (!existing) {
            await prisma.service.create({
                data: service
            });
            servicesCreated++;
        }
    }
    console.log(`✅ Services: ${servicesCreated} new, ${services.length} total in seed\n`);

    // ============================================
    // 3. Service Pricing (الأسعار) — by VehicleType
    // ============================================
    console.log('💰 Setting up service pricing...');

    const vehicleTypes = ['SEDAN', 'SMALL_SUV', 'SUV', 'TRUCK'];
    const basePricesByType = {
        SEDAN: 50,
        SMALL_SUV: 75,
        SUV: 100,
        TRUCK: 150
    };

    const createdServices = await prisma.service.findMany();
    let pricingCount = 0;

    for (const service of createdServices) {
        let multiplier = 1;
        if (service.category === 'REPAIR') multiplier = 3;
        else if (service.category === 'MAINTENANCE') multiplier = 1.5;
        else if (service.category === 'EMERGENCY') multiplier = 2;
        else if (service.category === 'INSPECTION') multiplier = 2.5;

        for (const vehicleType of vehicleTypes) {
            const base = (basePricesByType[vehicleType] || 75) * multiplier;
            await prisma.servicePricing.upsert({
                where: {
                    serviceId_vehicleType: {
                        serviceId: service.id,
                        vehicleType
                    }
                },
                update: {
                    basePrice: base,
                    discountedPrice: base * 0.9
                },
                create: {
                    serviceId: service.id,
                    vehicleType,
                    basePrice: base,
                    discountedPrice: base * 0.9
                }
            });
            pricingCount++;
        }
    }

    console.log(`✅ Created ${pricingCount} pricing entries\n`);

    // ============================================
    // Test Data for Towing Service
    // ============================================
    console.log('🚗 Seeding test data for towing service...\n');

    const hash = await bcrypt.hash('Admin123!', 10);
    const testCustomers = [];
    const testVehicles = [];

    // Create 3 test customers with vehicles
    for (let i = 1; i <= 3; i++) {
        const customer = await prisma.user.upsert({
            where: {
                email: `customer${i}@test.com`
            },
            update: {},
            create: {
                email: `customer${i}@test.com`,
                phone: `+96650${i}${i}${i}${i}${i}${i}${i}`,
                passwordHash: hash,
                role: 'CUSTOMER',
                status: 'ACTIVE'
            }
        });
        testCustomers.push(customer);

        // Create 2 vehicles per customer
        for (let v = 1; v <= 2; v++) {
            const firstModel = await prisma.vehicleModel.findFirst();
            const plateNum = `TEST${i}${v}`;
            const vehicle = await prisma.userVehicle.upsert({
                where: {
                    plateNumber: plateNum
                },
                update: {},
                create: {
                    userId: customer.id,
                    vehicleModelId: firstModel.id,
                    plateNumber: plateNum,
                    plateDigits: `${i}${i}${i}${i}`,
                    plateLettersEn: 'ABC',
                    plateLettersAr: 'أ ب ج',
                    isDefault: v === 1,
                    color: ['Red', 'Blue', 'White', 'Black'][Math.floor(Math.random() * 4)]
                }
            });
            testVehicles.push(vehicle);
        }
    }

    // Create 5 test technicians (available for towing)
    const testTechnicians = [];
    const locations = [{
            lat: 24.7136,
            lng: 46.6753,
            city: 'Riyadh'
        },
        {
            lat: 24.7500,
            lng: 46.7000,
            city: 'Riyadh'
        },
        {
            lat: 24.6800,
            lng: 46.6500,
            city: 'Riyadh'
        },
        {
            lat: 24.7200,
            lng: 46.7200,
            city: 'Riyadh'
        },
        {
            lat: 24.7000,
            lng: 46.6400,
            city: 'Riyadh'
        }
    ];

    for (let i = 1; i <= 5; i++) {
        const tech = await prisma.user.upsert({
            where: {
                email: `technician${i}@test.com`
            },
            update: {},
            create: {
                email: `technician${i}@test.com`,
                phone: `+96655${i}${i}${i}${i}${i}${i}${i}`,
                passwordHash: hash,
                role: 'TECHNICIAN',
                status: 'ACTIVE',
                profile: {
                    create: {
                        firstName: `Tech${i}`,
                        lastName: `Towing`,
                        currentLat: locations[i - 1].lat,
                        currentLng: locations[i - 1].lng,
                        isAvailable: true
                    }
                }
            }
        });
        testTechnicians.push(tech);
    }

    console.log(`✅ Created ${testCustomers.length} test customers with ${testVehicles.length} vehicles`);
    console.log(`✅ Created ${testTechnicians.length} test technicians (available for towing)`);
    console.log('');
    console.log('📋 Test Accounts:');
    console.log('   Customers: customer1@test.com, customer2@test.com, customer3@test.com');
    console.log('   Technicians: technician1@test.com ... technician5@test.com');
    console.log('   Password for all: Admin123!');
    console.log('');

    // ============================================
    // 4. Ensure customer profiles (for dashboard display)
    // ============================================
    console.log('👤 Ensuring customer profiles...');
    const customerNames = [{
            first: 'Ahmed',
            last: 'Ali'
        },
        {
            first: 'Sara',
            last: 'Mohammed'
        },
        {
            first: 'Omar',
            last: 'Hassan'
        }
    ];
    for (let i = 0; i < testCustomers.length; i++) {
        const cust = testCustomers[i];
        const names = customerNames[i] || {
            first: 'Customer',
            last: String(i + 1)
        };
        await prisma.profile.upsert({
            where: {
                userId: cust.id
            },
            update: {
                firstName: names.first,
                lastName: names.last
            },
            create: {
                userId: cust.id,
                firstName: names.first,
                lastName: names.last
            }
        });
    }
    console.log('✅ Customer profiles ready\n');

    // ============================================
    // 5. Products (كتالوج المنتجات)
    // ============================================
    console.log('📦 Seeding Products...');
    const productRows = [{
            sku: 'OIL-001',
            name: 'Castrol Edge 5W-30',
            nameAr: 'كاسترول إيدج 5W-30',
            category: 'OIL',
            brand: 'Castrol',
            price: 89.99,
            stock: 120,
            featured: true
        },
        {
            sku: 'OIL-002',
            name: 'Mobil 1 Full Synthetic',
            nameAr: 'موبيل 1 اصطناعي كامل',
            category: 'OIL',
            brand: 'Mobil',
            price: 75.50,
            stock: 85,
            featured: true
        },
        {
            sku: 'OIL-003',
            name: 'Shell Helix HX7',
            nameAr: 'شل هيليكس HX7',
            category: 'OIL',
            brand: 'Shell',
            price: 62.00,
            stock: 200,
            featured: false
        },
        {
            sku: 'FLT-001',
            name: 'Oil Filter OE',
            nameAr: 'فلتر زيت أصلي',
            category: 'FILTER',
            brand: 'Bosch',
            price: 24.99,
            stock: 150,
            featured: false
        },
        {
            sku: 'FLT-002',
            name: 'Air Filter Cabin',
            nameAr: 'فلتر هواء الكابينة',
            category: 'FILTER',
            brand: 'Mann',
            price: 18.50,
            stock: 90,
            featured: false
        },
        {
            sku: 'BRK-001',
            name: 'Brake Pads Front Set',
            nameAr: 'فحمات فرامل أمامية',
            category: 'BRAKE_PAD',
            brand: 'Brembo',
            price: 145.00,
            stock: 40,
            featured: true
        },
        {
            sku: 'BRK-002',
            name: 'Brake Pads Rear',
            nameAr: 'فحمات فرامل خلفية',
            category: 'BRAKE_PAD',
            brand: 'Brembo',
            price: 98.00,
            stock: 45,
            featured: false
        },
        {
            sku: 'BAT-001',
            name: 'Varta Dynamic 12V 60Ah',
            nameAr: 'فارتا ديناميك 12 فولت 60 أمبير',
            category: 'BATTERY',
            brand: 'Varta',
            price: 220.00,
            stock: 30,
            featured: true
        },
        {
            sku: 'BAT-002',
            name: 'Bosch S4 005',
            nameAr: 'بوش S4 005',
            category: 'BATTERY',
            brand: 'Bosch',
            price: 195.00,
            stock: 25,
            featured: false
        },
        {
            sku: 'TIR-001',
            name: 'Michelin Pilot Sport 4',
            nameAr: 'ميشلان بايلوت سبورت 4',
            category: 'TIRE',
            brand: 'Michelin',
            price: 185.00,
            stock: 60,
            featured: true
        },
        {
            sku: 'TIR-002',
            name: 'Bridgestone Turanza',
            nameAr: 'بريدجستون تورانزا',
            category: 'TIRE',
            brand: 'Bridgestone',
            price: 165.00,
            stock: 50,
            featured: false
        },
        {
            sku: 'FLU-001',
            name: 'Coolant Concentrate',
            nameAr: 'سائل تبريد مركز',
            category: 'FLUID',
            brand: 'Prestone',
            price: 28.99,
            stock: 80,
            featured: false
        },
        {
            sku: 'FLU-002',
            name: 'Brake Fluid DOT 4',
            nameAr: 'سائل فرامل DOT 4',
            category: 'FLUID',
            brand: 'Castrol',
            price: 15.50,
            stock: 100,
            featured: false
        },
        {
            sku: 'ACC-001',
            name: 'Car Cover Universal',
            nameAr: 'غطاء سيارة عام',
            category: 'ACCESSORY',
            brand: 'Generic',
            price: 45.00,
            stock: 70,
            featured: false
        },
        {
            sku: 'ACC-002',
            name: 'Dash Cam 1080p',
            nameAr: 'كاميرا داش 1080',
            category: 'ACCESSORY',
            brand: 'AutoGuard',
            price: 89.99,
            stock: 35,
            featured: true
        }
    ];

    for (const row of productRows) {
        await prisma.product.upsert({
            where: {
                sku: row.sku
            },
            update: {
                stockQuantity: row.stock,
                price: row.price,
                isFeatured: row.featured
            },
            create: {
                sku: row.sku,
                name: row.name,
                nameAr: row.nameAr,
                category: row.category,
                brand: row.brand,
                price: row.price,
                stockQuantity: row.stock,
                isFeatured: row.featured,
                isActive: true
            }
        });
    }
    console.log(`✅ Products: ${productRows.length} items\n`);

    // ============================================
    // 6. Bookings (حجوزات)
    // ============================================
    console.log('📅 Seeding Bookings...');
    const statuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    const times = ['09:00', '10:30', '14:00', '15:30', '11:00'];
    const now = new Date();
    let bookingCount = 0;

    for (let i = 0; i < testCustomers.length; i++) {
        const customer = testCustomers[i];
        const vehicles = testVehicles.filter((v) => v.userId === customer.id);
        if (vehicles.length === 0) continue;
        for (let j = 0; j < 2; j++) {
            const scheduledDate = new Date(now);
            scheduledDate.setDate(scheduledDate.getDate() - (i * 2 + j));
            const status = statuses[(i + j) % statuses.length];
            const totalPrice = 120 + (i + 1) * 25 + j * 15;
            const bookingNumber = `BKG-SEED-${String(bookingCount + 1).padStart(3, '0')}`;
            const existing = await prisma.booking.findUnique({
                where: {
                    bookingNumber
                }
            });
            if (existing) continue;
            await prisma.booking.create({
                data: {
                    bookingNumber,
                    customerId: customer.id,
                    vehicleId: vehicles[0].id,
                    scheduledDate,
                    scheduledTime: times[bookingCount % times.length],
                    status,
                    subtotal: totalPrice * 0.9,
                    tax: totalPrice * 0.05,
                    totalPrice,
                    laborFee: 50,
                    deliveryFee: 0,
                    partsTotal: 0
                }
            });
            bookingCount++;
        }
    }
    console.log(`✅ Bookings: ${bookingCount} created\n`);

    // ============================================
    // 7. Invoices (فواتير) — for completed/pending bookings
    // ============================================
    console.log('🧾 Seeding Invoices...');
    const bookingsForInvoice = await prisma.booking.findMany({
        where: {
            status: {
                in: ['COMPLETED', 'CONFIRMED', 'IN_PROGRESS']
            }
        },
        take: 6,
        orderBy: {
            createdAt: 'desc'
        }
    });
    const invStatuses = ['DRAFT', 'PENDING', 'PAID', 'PARTIALLY_PAID'];
    let invoicesCreated = 0;
    for (let idx = 0; idx < bookingsForInvoice.length; idx++) {
        const b = bookingsForInvoice[idx];
        const invNum = idx + 1;
        const invNumber = `INV-SEED-${String(invNum).padStart(3, '0')}`;
        const existingInv = await prisma.invoice.findUnique({
            where: {
                bookingId: b.id
            }
        });
        if (existingInv) continue;
        const totalAmount = Number(b.totalPrice) || 150;
        const status = invStatuses[idx % invStatuses.length];
        const paidAmount = status === 'PAID' ? totalAmount : status === 'PARTIALLY_PAID' ? totalAmount * 0.5 : 0;
        const dueDate = new Date(b.scheduledDate || now);
        dueDate.setDate(dueDate.getDate() + 14);
        await prisma.invoice.create({
            data: {
                invoiceNumber: invNumber,
                bookingId: b.id,
                customerId: b.customerId,
                subtotal: totalAmount * 0.95,
                tax: totalAmount * 0.05,
                discount: 0,
                totalAmount,
                paidAmount,
                status,
                issuedAt: b.createdAt || now,
                dueDate,
                paidAt: status === 'PAID' ? new Date() : null
            }
        });
        invoicesCreated++;
    }
    console.log(`✅ Invoices: ${invoicesCreated} created\n`);

    console.log('✅ Database seeding completed successfully! 🎉\n');

    // Summary
    const adminCount = await prisma.user.count({
        where: {
            role: 'ADMIN'
        }
    });
    const customerCount = await prisma.user.count({
        where: {
            role: 'CUSTOMER'
        }
    });
    const techCount = await prisma.user.count({
        where: {
            role: 'TECHNICIAN'
        }
    });
    const vehicleCount = await prisma.userVehicle.count();
    const productCount = await prisma.product.count();
    const bookingCountTotal = await prisma.booking.count();
    const invoiceCountTotal = await prisma.invoice.count();
    const summary = await Promise.all([
        prisma.vehicleBrand.count(),
        prisma.vehicleModel.count(),
        prisma.service.count(),
        prisma.servicePricing.count()
    ]);

    console.log('📊 Summary:');
    console.log(`   - Admin users: ${adminCount}`);
    console.log(`   - Customers: ${customerCount}`);
    console.log(`   - Technicians: ${techCount}`);
    console.log(`   - Vehicles: ${vehicleCount}`);
    console.log(`   - Vehicle Brands: ${summary[0]}`);
    console.log(`   - Vehicle Models: ${summary[1]}`);
    console.log(`   - Services: ${summary[2]}`);
    console.log(`   - Service Pricing: ${summary[3]}`);
    console.log(`   - Products: ${productCount}`);
    console.log(`   - Bookings: ${bookingCountTotal}`);
    console.log(`   - Invoices: ${invoiceCountTotal}`);
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });