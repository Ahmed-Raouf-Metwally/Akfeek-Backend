/**
 * Test: فلو الورش المعتمدة (Certified Workshop)
 *
 * 1) الفيندور: تسجيل دخول → جلب ورشتي (GET /api/workshops/profile/me)
 * 2) العميل: تسجيل دخول → قائمة الورش → ورشة معينة → خدمات الورشة → حجز (workshopId + serviceIds + deliveryMethod)
 * 3) الفيندور: تحديد الحجز كمكتمل (PATCH /api/bookings/:id/complete)
 *
 * Prerequisites:
 * - Server: npm run dev
 * - DB: seed-24-vendors, seed-18-workshops (أو prisma:seed:all)، وخدمات كتالوج (مثلاً seed-5-services-per-comprehensive-care أو أي Service)
 * - عميل ومركبة: seed-10-users-vehicles (ahmed.ali@example.com / Admin123!)
 *
 * Usage:
 *   npm run test:certified-workshop-flow
 *   API_BASE_URL=http://localhost:3000 node scripts/test-certified-workshop-flow.js
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'ahmed.ali@example.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'Admin123!';
const VENDOR_EMAIL = process.env.TEST_CERTIFIED_WORKSHOP_VENDOR_EMAIL || 'vendor-certified-workshop-1@akfeek.com';
const VENDOR_PASSWORD = process.env.TEST_VENDOR_PASSWORD || 'Vendor123!';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

let customerToken = null;
let vendorToken = null;

function log(msg, data = null) {
  console.log(msg);
  if (data != null) console.log(JSON.stringify(data, null, 2));
}

function setAuth(token) {
  api.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : '';
}

async function loginAsCustomer() {
  const res = await api.post('/auth/login', { identifier: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Customer login failed. Use seed (e.g. ahmed.ali@example.com / Admin123!)');
  }
  customerToken = res.data.data.token;
  setAuth(customerToken);
  log('✅ Customer login OK', { email: CUSTOMER_EMAIL });
}

async function loginAsVendor() {
  const res = await api.post('/auth/login', { identifier: VENDOR_EMAIL, password: VENDOR_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Vendor login failed. Use seed-24-vendors (vendor-certified-workshop-1@akfeek.com / Vendor123!)');
  }
  vendorToken = res.data.data.token;
  setAuth(vendorToken);
  log('✅ Certified workshop vendor login OK', { email: VENDOR_EMAIL });
}

async function getMyWorkshop() {
  const res = await api.get('/workshops/profile/me');
  if (!res.data.success || !res.data.data?.id) {
    throw new Error('No workshop for this vendor. Run: npm run prisma:seed:18workshops (after seed-24-vendors).');
  }
  const workshop = res.data.data;
  log('✅ My workshop', { id: workshop.id, nameAr: workshop.nameAr || workshop.name });
  return workshop;
}

async function getMyVehicles() {
  const res = await api.get('/vehicles');
  if (!res.data?.data?.length) throw new Error('No vehicles. Seed customer with vehicles (e.g. seed-10-users-vehicles).');
  log('✅ Customer vehicles', res.data.data.length);
  return res.data.data;
}

async function getWorkshopServices(workshopId) {
  const res = await api.get(`/workshops/${workshopId}/services`);
  if (!res.data.success || !Array.isArray(res.data.data)) {
    throw new Error('Failed to get workshop services or workshop has none.');
  }
  log('✅ Workshop services', res.data.data.length);
  return res.data.data;
}

async function getOneCatalogService() {
  const res = await api.get('/services', { params: { isActive: true, limit: 5 } });
  const list = res.data?.data ?? res.data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('No catalog services. Run a seed that creates Service records (e.g. seed-5-services-per-comprehensive-care).');
  }
  const service = list[0];
  log('✅ Catalog service for booking', { id: service.id, name: service.nameAr || service.name });
  return service;
}

async function createCertifiedWorkshopBooking(vehicleId, workshopId, serviceIds, scheduledDate, scheduledTime) {
  const res = await api.post('/bookings', {
    vehicleId,
    workshopId,
    deliveryMethod: 'SELF_DELIVERY',
    serviceIds,
    scheduledDate,
    scheduledTime: scheduledTime || '10:00',
    notes: 'تيست الورش المعتمدة',
  });
  if (res.status !== 201 || !res.data.success || !res.data.data?.id) {
    throw new Error('Create booking failed: ' + JSON.stringify(res.data?.message || res.data));
  }
  const booking = res.data.data;
  log('✅ Certified workshop booking created', { bookingId: booking.id, bookingNumber: booking.bookingNumber });
  return booking;
}

async function vendorCompleteBooking(bookingId) {
  setAuth(vendorToken);
  const res = await api.patch(`/bookings/${bookingId}/complete`);
  if (!res.data.success || !res.data.data) {
    throw new Error('Vendor complete booking failed: ' + JSON.stringify(res.data));
  }
  if (res.data.data.status !== 'COMPLETED') {
    throw new Error('Booking status is not COMPLETED: ' + res.data.data.status);
  }
  log('✅ Booking marked as completed by workshop vendor');
  return res.data;
}

async function run() {
  console.log('\n--- Test: Certified Workshop Flow (الورش المعتمدة — حجز → الفيندور يحدد مكتمل) ---');
  console.log(`API: ${BASE_URL}`);
  console.log(`Customer: ${CUSTOMER_EMAIL} | Vendor: ${VENDOR_EMAIL}\n`);

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledDate = tomorrow.toISOString().slice(0, 10);
    const minsFromMidnight = (Date.now() % (10 * 60));
    const hour = 8 + Math.floor(minsFromMidnight / 60);
    const min = minsFromMidnight % 60;
    const scheduledTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

    // 1) Vendor: login and get my workshop id (so we book at this workshop)
    await loginAsVendor();
    const myWorkshop = await getMyWorkshop();
    const workshopId = myWorkshop.id;

    // 2) Customer: login, vehicles, workshop services (display), one catalog service for booking
    await loginAsCustomer();
    await getWorkshopServices(workshopId);
    const catalogService = await getOneCatalogService();
    const vehicles = await getMyVehicles();
    const vehicleId = vehicles[0].id;

    // 3) Create certified workshop booking (workshopId + serviceIds from catalog; backend uses Service ids)
    const booking = await createCertifiedWorkshopBooking(
      vehicleId,
      workshopId,
      [catalogService.id],
      scheduledDate,
      scheduledTime
    );

    // 4) Vendor: mark booking as completed (حجز ورشة معتمدة → الفيندور يكمّل)
    await loginAsVendor();
    await vendorCompleteBooking(booking.id);

    console.log('\n✅ اختبار فلو الورش المعتمدة اكتمل بنجاح (حجز ورشة → الفيندور يحدد مكتمل).\n');
  } catch (err) {
    const msg = err.response?.data ?? err.message ?? err;
    console.error('\n❌ Test failed:', typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg));
    if (err.response?.status) console.error('HTTP Status:', err.response.status);
    if (err.code) console.error('Code:', err.code);
    process.exit(1);
  }
}

run();
