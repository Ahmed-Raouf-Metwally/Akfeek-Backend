const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('🌱 Seeding activity logs...');

  // Get existing users
  const admin = await p.user.findFirst({ where: { role: 'ADMIN' } });
  const customers = await p.user.findMany({ where: { role: 'CUSTOMER' }, take: 3 });
  const technicians = await p.user.findMany({ where: { role: 'TECHNICIAN' }, take: 3 });
  const bookings = await p.booking.findMany({ take: 5, select: { id: true, bookingNumber: true } });
  const users = await p.user.findMany({ take: 5, select: { id: true, email: true } });

  const ips = ['192.168.1.10', '192.168.1.22', '10.0.0.5', '172.16.0.3', '41.33.120.5'];
  const now = new Date();
  const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000);

  const logs = [
    // Admin actions
    {
      userId: admin?.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: admin?.id,
      ipAddress: ips[0],
      details: { email: admin?.email, role: 'ADMIN', success: true },
      createdAt: hoursAgo(1),
    },
    {
      userId: admin?.id,
      action: 'SETTINGS_UPDATED',
      entity: 'SystemSettings',
      entityId: null,
      ipAddress: ips[0],
      details: { changed: ['VAT_RATE', 'PLATFORM_COMMISSION_PERCENT'], by: admin?.email },
      createdAt: hoursAgo(2),
    },
    {
      userId: admin?.id,
      action: 'USER_STATUS_CHANGED',
      entity: 'User',
      entityId: customers[0]?.id,
      ipAddress: ips[0],
      details: { targetEmail: customers[0]?.email, from: 'ACTIVE', to: 'SUSPENDED', reason: 'Policy violation' },
      createdAt: hoursAgo(3),
    },
    {
      userId: admin?.id,
      action: 'SERVICE_CREATED',
      entity: 'Service',
      entityId: null,
      ipAddress: ips[0],
      details: { serviceName: 'Premium Car Wash', price: 150, by: admin?.email },
      createdAt: hoursAgo(5),
    },
    {
      userId: admin?.id,
      action: 'WORKSHOP_VERIFIED',
      entity: 'Workshop',
      entityId: null,
      ipAddress: ips[0],
      details: { workshopName: 'Al-Faris Auto Center', isVerified: true },
      createdAt: hoursAgo(6),
    },
    {
      userId: admin?.id,
      action: 'WALLET_CREDIT',
      entity: 'Wallet',
      entityId: null,
      ipAddress: ips[0],
      details: { targetEmail: customers[1]?.email, amount: 500, currency: 'SAR', reason: 'Refund' },
      createdAt: hoursAgo(8),
    },
    // Booking events
    ...(bookings.slice(0, 3).map((b, i) => ({
      userId: customers[i % customers.length]?.id,
      action: 'BOOKING_CREATED',
      entity: 'Booking',
      entityId: b.id,
      ipAddress: ips[i + 1],
      details: { bookingNumber: b.bookingNumber, serviceType: 'DIRECT' },
      createdAt: hoursAgo(4 + i * 2),
    }))),
    // User logins
    ...(customers.map((c, i) => ({
      userId: c.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: c.id,
      ipAddress: ips[i % ips.length],
      details: { email: c.email, role: 'CUSTOMER', success: true },
      createdAt: hoursAgo(10 + i),
    }))),
    ...(technicians.map((t, i) => ({
      userId: t.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: t.id,
      ipAddress: ips[(i + 2) % ips.length],
      details: { email: t.email, role: 'TECHNICIAN', success: true },
      createdAt: hoursAgo(12 + i),
    }))),
    // Invoice & payment events
    {
      userId: admin?.id,
      action: 'INVOICE_ISSUED',
      entity: 'Invoice',
      entityId: null,
      ipAddress: ips[0],
      details: { amount: 750, currency: 'SAR', customerEmail: customers[0]?.email },
      createdAt: hoursAgo(14),
    },
    {
      userId: customers[0]?.id,
      action: 'PAYMENT_RECEIVED',
      entity: 'Payment',
      entityId: null,
      ipAddress: ips[1],
      details: { amount: 750, method: 'WALLET', status: 'PAID' },
      createdAt: hoursAgo(14),
    },
    // Admin brand/model management
    {
      userId: admin?.id,
      action: 'BRAND_CREATED',
      entity: 'VehicleBrand',
      entityId: null,
      ipAddress: ips[0],
      details: { brandName: 'Lucid', brandNameAr: 'لوسيد' },
      createdAt: hoursAgo(20),
    },
    {
      userId: admin?.id,
      action: 'COUPON_CREATED',
      entity: 'Coupon',
      entityId: null,
      ipAddress: ips[0],
      details: { code: 'RAMADAN50', discount: '50%', type: 'PERCENTAGE' },
      createdAt: hoursAgo(24),
    },
    {
      userId: admin?.id,
      action: 'USER_ROLE_CHANGED',
      entity: 'User',
      entityId: technicians[0]?.id,
      ipAddress: ips[0],
      details: { targetEmail: technicians[0]?.email, from: 'CUSTOMER', to: 'TECHNICIAN' },
      createdAt: hoursAgo(30),
    },
    // System events
    {
      userId: null,
      action: 'SYSTEM_BACKUP',
      entity: 'System',
      entityId: null,
      ipAddress: '127.0.0.1',
      details: { type: 'full', size: '142MB', duration: '00:02:14' },
      createdAt: hoursAgo(36),
    },
    {
      userId: null,
      action: 'SYSTEM_STARTUP',
      entity: 'System',
      entityId: null,
      ipAddress: '127.0.0.1',
      details: { version: '1.0.0', environment: 'development' },
      createdAt: hoursAgo(48),
    },
    {
      userId: admin?.id,
      action: 'FEEDBACK_RESOLVED',
      entity: 'Feedback',
      entityId: null,
      ipAddress: ips[0],
      details: { subject: 'تأخير في الخدمة', resolution: 'تم الرد والاعتذار للعميل' },
      createdAt: hoursAgo(50),
    },
    {
      userId: admin?.id,
      action: 'VENDOR_APPROVED',
      entity: 'Vendor',
      entityId: null,
      ipAddress: ips[0],
      details: { businessName: 'Auto Shine', type: 'CAR_WASH' },
      createdAt: hoursAgo(60),
    },
  ].filter(Boolean);

  await p.activityLog.createMany({ data: logs, skipDuplicates: true });

  console.log(`✅ Created ${logs.length} activity logs`);
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
