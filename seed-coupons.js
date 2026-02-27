const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const vendors = await prisma.vendorProfile.findMany({
        where: { status: 'ACTIVE' },
        take: 5
    });

    if (vendors.length === 0) {
        console.log('No active vendors found to add coupons for.');
        return;
    }

    const coupons = [];
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(now.getMonth() + 1);

    for (const vendor of vendors) {
        // Percentage coupon
        coupons.push({
            vendorId: vendor.id,
            code: `PROMO10_${vendor.businessName.substring(0, 3).toUpperCase()}`,
            discountType: 'PERCENT',
            discountValue: 10,
            minOrderAmount: 100,
            validFrom: now,
            validUntil: nextMonth,
            maxUses: 50,
            isActive: true
        });

        // Fixed amount coupon
        coupons.push({
            vendorId: vendor.id,
            code: `SAVE50_${vendor.businessName.substring(0, 3).toUpperCase()}`,
            discountType: 'FIXED',
            discountValue: 50,
            minOrderAmount: 200,
            validFrom: now,
            validUntil: nextMonth,
            maxUses: 20,
            isActive: true
        });
    }

    console.log(`Seeding ${coupons.length} coupons...`);

    for (const couponData of coupons) {
        try {
            const created = await prisma.vendorCoupon.upsert({
                where: {
                    vendorId_code: {
                        vendorId: couponData.vendorId,
                        code: couponData.code
                    }
                },
                update: couponData,
                create: couponData
            });
            console.log(`- Coupon ${created.code} added successfully`);
        } catch (e) {
            console.error(`Error adding coupon ${couponData.code}:`, e.message);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
