const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    try {
        const service = await prisma.service.findFirst({
            where: { name: 'Mobile Car Wash' }
        });
        console.log('Service found:', service ? 'YES' : 'NO');
        if (service) console.log(service);

        const technician = await prisma.user.findUnique({
            where: { email: 'washer@akfeek.com' }
        });
        console.log('Technician found:', technician ? 'YES' : 'NO');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
