const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function pad(n, len = 3) {
  return String(n).padStart(len, '0');
}

async function main() {
  console.log('🌱 Seeding Technical Support Requests (طلبات الدعم الفني)...\n');

  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    take: 6,
  });
  if (customers.length === 0) {
    console.log('⚠️ No CUSTOMER users found. Run main seed first (e.g. node prisma/seed.js).');
    return;
  }

  const [admin] = await prisma.user.findMany({ where: { role: 'ADMIN' }, take: 1 });
  const technicians = await prisma.user.findMany({ where: { role: 'TECHNICIAN' }, take: 2 });

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const requests = [
    {
      customerIndex: 0,
      vehicleSerialNumber: 'WBADT43452G123456',
      plateNumber: 'أ ب س 1234',
      hasInsurance: true,
      insuranceCompany: 'شركة التأمين الأهلية',
      deliveryAddress: 'الرياض، حي النخيل، شارع الملك فهد، برج النخيل',
      repairAuthUrl: null,
      najmDocUrl: 'https://example.com/docs/najm-1.pdf',
      trafficReportUrl: null,
      accidentDamages: 'ضرر في الواجهة الأمامية والجناح الأيمن. كسر في المصباح الأمامي.',
      carImageUrls: ['https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400'],
      status: 'PENDING',
      notes: null,
    },
    {
      customerIndex: 1,
      vehicleSerialNumber: '1HGBH41JXMN109186',
      plateNumber: 'د م و 5678',
      hasInsurance: true,
      insuranceCompany: 'بوبا للتأمين',
      deliveryAddress: 'جدة، حي الروضة، طريق الملك عبدالعزيز',
      repairAuthUrl: 'https://example.com/docs/repair-auth-2.pdf',
      najmDocUrl: null,
      trafficReportUrl: 'https://example.com/docs/traffic-2.pdf',
      accidentDamages: 'خدوش على الباب الخلفي الأيسر. انبعاج بسيط.',
      carImageUrls: null,
      status: 'PENDING',
      notes: null,
    },
    {
      customerIndex: 2,
      vehicleSerialNumber: '2T1BURHE5KC123456',
      plateNumber: 'ع س س 9012',
      hasInsurance: false,
      insuranceCompany: null,
      deliveryAddress: 'الدمام، حي الفيصلية، شارع الأمير محمد بن فهد',
      repairAuthUrl: null,
      najmDocUrl: null,
      trafficReportUrl: null,
      accidentDamages: 'تصادم خلفي. ضرر في غطاء الصندوق الخلفي والمرآة.',
      carImageUrls: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400'],
      status: 'ASSIGNED',
      notes: null,
    },
    {
      customerIndex: 3,
      vehicleSerialNumber: '5YJSA1E26HF123456',
      plateNumber: 'هـ ط ص 3456',
      hasInsurance: true,
      insuranceCompany: 'الشركة السعودية للتأمين',
      deliveryAddress: 'مكة المكرمة، حي العزيزية',
      repairAuthUrl: null,
      najmDocUrl: 'https://example.com/docs/najm-4.pdf',
      trafficReportUrl: null,
      accidentDamages: 'كسر في الزجاج الأمامي. ضرر في الكبوت.',
      carImageUrls: null,
      status: 'IN_PROGRESS',
      notes: 'الفني في الطريق للعميل',
    },
    {
      customerIndex: 4,
      vehicleSerialNumber: 'JM1BL1S55A1234567',
      plateNumber: 'ق ر ك 7890',
      hasInsurance: true,
      insuranceCompany: 'تكوين للتأمين',
      deliveryAddress: 'الرياض، حي العليا، طريق العروبة',
      repairAuthUrl: 'https://example.com/docs/repair-5.pdf',
      najmDocUrl: 'https://example.com/docs/najm-5.pdf',
      trafficReportUrl: null,
      accidentDamages: 'تصادم جانبي. أضرار في الأبواب الجانبية اليمنى.',
      carImageUrls: [],
      status: 'COMPLETED',
      notes: 'تم الإصلاح وتسليم السيارة',
    },
    {
      customerIndex: 0,
      vehicleSerialNumber: '1G1YY22G965123456',
      plateNumber: 'أ ب س 1111',
      hasInsurance: false,
      insuranceCompany: null,
      deliveryAddress: 'الرياض، حي الشمال، شارع العليا',
      repairAuthUrl: null,
      najmDocUrl: null,
      trafficReportUrl: null,
      accidentDamages: 'خدش طويل على الجناح الأيمن. بدون تأمين.',
      carImageUrls: null,
      status: 'CANCELLED',
      notes: 'العميل ألغى الطلب',
    },
    {
      customerIndex: 2,
      vehicleSerialNumber: '3VWDP7AJ5EM123456',
      plateNumber: 'ع س س 2222',
      hasInsurance: true,
      insuranceCompany: 'أكسا للتأمين',
      deliveryAddress: 'جدة، حي الحمراء',
      repairAuthUrl: null,
      najmDocUrl: null,
      trafficReportUrl: 'https://example.com/docs/traffic-7.pdf',
      accidentDamages: 'ضرر في المصد الأمامي بسبب اصطدام بحيوان.',
      carImageUrls: null,
      status: 'PENDING',
      notes: null,
    },
    {
      customerIndex: 5,
      vehicleSerialNumber: 'WBA3B1C50EK123456',
      plateNumber: 'ص ل م 3333',
      hasInsurance: true,
      insuranceCompany: 'شركة التأمين الأهلية',
      deliveryAddress: 'الدمام، حي الشاطئ',
      repairAuthUrl: 'https://example.com/docs/repair-8.pdf',
      najmDocUrl: 'https://example.com/docs/najm-8.pdf',
      trafficReportUrl: 'https://example.com/docs/traffic-8.pdf',
      accidentDamages: 'تصادم أمامي. أضرار كبيرة في المحرك الأمامي والهيكل.',
      carImageUrls: ['https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400', 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400'],
      status: 'ASSIGNED',
      notes: null,
    },
  ];

  let seq = 1;
  for (const req of requests) {
    const customer = customers[req.customerIndex % customers.length];
    const number = `TSR-${dateStr}-${pad(seq)}`;
    seq += 1;

    const technicianId = (req.status === 'ASSIGNED' || req.status === 'IN_PROGRESS' || req.status === 'COMPLETED') && technicians.length > 0
      ? technicians[0].id
      : null;
    const assignedById = technicianId && admin ? admin.id : null;
    const assignedAt = technicianId ? new Date() : null;

    await prisma.technicalSupportRequest.upsert({
      where: { number },
      update: {},
      create: {
        number,
        customerId: customer.id,
        technicianId,
        assignedById,
        assignedAt,
        vehicleSerialNumber: req.vehicleSerialNumber,
        plateNumber: req.plateNumber,
        hasInsurance: req.hasInsurance,
        insuranceCompany: req.insuranceCompany,
        deliveryAddress: req.deliveryAddress,
        repairAuthUrl: req.repairAuthUrl,
        najmDocUrl: req.najmDocUrl,
        trafficReportUrl: req.trafficReportUrl,
        accidentDamages: req.accidentDamages,
        carImageUrls: req.carImageUrls && req.carImageUrls.length > 0 ? req.carImageUrls : null,
        status: req.status,
        notes: req.notes,
      },
    });
    console.log(`  ✅ ${number} – ${req.plateNumber} (${req.status})`);
  }

  console.log(`\n✅ Created/updated ${requests.length} technical support requests.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
