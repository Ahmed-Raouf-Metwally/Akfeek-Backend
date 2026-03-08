/**
 * Test: فلو ورش الغسيل (مثل العناية الشاملة — بدون فني، حجز مباشر من الفيندور)
 *
 * 1) الفيندور: تسجيل دخول → جلب خدمة غسيل من خدمات ورشتي
 * 2) العميل: تسجيل دخول → حجز الخدمة (POST /api/bookings مع serviceIds، بدون workshopId)
 * 3) العميل: جلب الفاتورة ودفعها
 * 4) الفيندور: تحديد الحجز كمكتمل (PATCH /api/bookings/:id/complete)
 *
 * Prerequisites:
 * - Server: npm run dev
 * - DB: seed-24-vendors (فيندور CAR_WASH)، ثم node prisma/seed-carwash-vendor-services.js
 * - عميل ومركبة: seed مع ahmed.ali@example.com أو seed-10-users-vehicles
 *
 * Usage:
 *   npm run test:carwash-flow-vendor
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'ahmed.ali@example.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'Admin123!';
const VENDOR_EMAIL = process.env.TEST_CARWASH_VENDOR_EMAIL || 'vendor-car-wash-1@akfeek.com';
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
    throw new Error('Vendor login failed. Use seed-24-vendors (vendor-car-wash-1@akfeek.com / Vendor123!)');
  }
  vendorToken = res.data.data.token;
  setAuth(vendorToken);
  log('✅ Car wash vendor login OK', { email: VENDOR_EMAIL });
}

async function getMyVehicles() {
  const res = await api.get('/vehicles');
  if (!res.data?.data?.length) throw new Error('No vehicles. Seed customer with vehicles.');
  log('✅ Customer vehicles', res.data.data.length);
  return res.data.data;
}

/** خدمة غسيل واحدة من الفيندور (بعد تسجيل دخول الفيندور). */
async function getMyVendorCarWashService() {
  const res = await api.get('/services', { params: { vendorId: 'me', category: 'CLEANING', isActive: true } });
  const list = res.data?.data ?? res.data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('No car wash services for this vendor. Run: node prisma/seed-carwash-vendor-services.js');
  }
  const service = list[0];
  log('✅ Vendor car wash service', { id: service.id, name: service.nameAr || service.name });
  return service;
}

async function createBooking(vehicleId, serviceId, scheduledDate, scheduledTime) {
  const res = await api.post('/bookings', {
    vehicleId,
    serviceIds: [serviceId],
    scheduledDate,
    scheduledTime: scheduledTime || '10:00',
    notes: 'تيست ورش الغسيل',
  });
  if (res.status !== 201 || !res.data.success || !res.data.data?.id) {
    throw new Error('Create booking failed: ' + JSON.stringify(res.data?.message || res.data));
  }
  log('✅ Booking created', { bookingId: res.data.data.id });
  return res.data.data;
}

async function getMyInvoiceByBookingId(bookingId) {
  setAuth(customerToken);
  const res = await api.get(`/invoices/my/${bookingId}`);
  if (!res.data.success || !res.data.data) {
    throw new Error('Get my invoice failed: ' + JSON.stringify(res.data));
  }
  log('✅ My invoice', { id: res.data.data.id, status: res.data.data.status });
  return res.data.data;
}

async function customerPayInvoice(invoiceId) {
  setAuth(customerToken);
  const res = await api.patch(`/invoices/my/${invoiceId}/pay`, { method: 'CARD' });
  if (!res.data.success || res.data.data?.status !== 'PAID') {
    throw new Error('Pay failed or invoice not PAID: ' + JSON.stringify(res.data));
  }
  log('✅ Invoice paid');
  return res.data;
}

async function vendorCompleteBooking(bookingId) {
  setAuth(vendorToken);
  const res = await api.patch(`/bookings/${bookingId}/complete`);
  if (!res.data.success || res.data.data?.status !== 'COMPLETED') {
    throw new Error('Complete booking failed: ' + JSON.stringify(res.data));
  }
  log('✅ Booking marked completed by vendor');
  return res.data;
}

async function run() {
  console.log('\n--- Test: Car Wash Flow (مثل العناية الشاملة — حجز → دفع → الفيندور يحدد مكتمل) ---');
  console.log(`API: ${BASE_URL}`);
  console.log(`Customer: ${CUSTOMER_EMAIL} | Vendor: ${VENDOR_EMAIL}\n`);

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledDate = tomorrow.toISOString().slice(0, 10);
    const scheduledTime = '10:00';

    await loginAsVendor();
    const service = await getMyVendorCarWashService();

    await loginAsCustomer();
    const vehicles = await getMyVehicles();
    const vehicleId = vehicles[0].id;
    const booking = await createBooking(vehicleId, service.id, scheduledDate, scheduledTime);

    const invoice = await getMyInvoiceByBookingId(booking.id);
    await customerPayInvoice(invoice.id);

    await loginAsVendor();
    await vendorCompleteBooking(booking.id);

    console.log('\n✅ اختبار فلو ورش الغسيل اكتمل بنجاح (حجز → دفع → الفيندور يحدد مكتمل).\n');
  } catch (err) {
    const msg = err.response?.data ?? err.message ?? err;
    console.error('\n❌ Test failed:', typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg));
    if (err.response?.status) console.error('HTTP Status:', err.response.status);
    process.exit(1);
  }
}

run();
