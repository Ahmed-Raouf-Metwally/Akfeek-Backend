/**
 * Test script: Comprehensive Care flow (العناية الشاملة)
 *
 * 1) العميل: تسجيل دخول → اختيار ورشة عناية شاملة (خدمة من كتالوج العناية الشاملة) → حجز خدمة
 * 2) بعد الحجز: جلب الفاتورة ودفعها
 * 3) الفيندور: عند إتمام الخدمة في الورشة يحدد الحجز كمكتمل (PATCH /api/bookings/:id/complete)
 *
 * Prerequisites:
 * - Server: npm run dev
 * - DB: npm run prisma:seed:all (أو seed-24-vendors, seed-5-services-per-comprehensive-care, seed-10-users-vehicles)
 *
 * Usage:
 *   npm run test:comprehensive-care-flow
 *   API_BASE_URL=http://localhost:3000 node scripts/test-comprehensive-care-flow.js
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'ahmed.ali@example.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'Admin123!';
const VENDOR_EMAIL = process.env.TEST_COMPREHENSIVE_CARE_VENDOR_EMAIL || 'vendor-comprehensive-care-1@akfeek.com';
const VENDOR_PASSWORD = process.env.TEST_VENDOR_PASSWORD || 'Vendor123!';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

let customerToken = null;
let vendorToken = null;

function log(msg, data = null) {
  console.log(msg);
  if (data !== null && data !== undefined) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function setAuth(token) {
  api.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : '';
}

async function loginAsCustomer() {
  const res = await api.post('/auth/login', { identifier: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Customer login failed. Use seed with customer (e.g. ahmed.ali@example.com / Admin123!)');
  }
  customerToken = res.data.data.token;
  setAuth(customerToken);
  log('✅ Customer login OK', { email: CUSTOMER_EMAIL });
}

async function loginAsVendor() {
  const res = await api.post('/auth/login', { identifier: VENDOR_EMAIL, password: VENDOR_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Vendor login failed. Use seed-24-vendors (vendor-comprehensive-care-1@akfeek.com / Vendor123!)');
  }
  vendorToken = res.data.data.token;
  setAuth(vendorToken);
  log('✅ Comprehensive care vendor login OK', { email: VENDOR_EMAIL });
}

async function getMyVehicles() {
  const res = await api.get('/vehicles');
  if (!res.data || !Array.isArray(res.data.data)) {
    throw new Error('Get vehicles failed or no data. Seed customer with vehicles.');
  }
  const vehicles = res.data.data;
  if (vehicles.length === 0) {
    throw new Error('No vehicles. Add a vehicle for the customer.');
  }
  log('✅ Customer vehicles', vehicles.map((v) => ({ id: v.id })));
  return vehicles;
}

/** Get one comprehensive care service that belongs to the currently logged-in vendor (call after loginAsVendor). */
async function getMyVendorComprehensiveCareService() {
  const res = await api.get('/services', { params: { category: 'COMPREHENSIVE_CARE', vendorId: 'me', isActive: true } });
  const list = res.data?.data ?? res.data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('No comprehensive care services for this vendor. Run: seed-5-services-per-comprehensive-care (after seed-24-vendors).');
  }
  const service = list[0];
  log('✅ Vendor comprehensive care service', { id: service.id, name: service.nameAr || service.name });
  return service;
}

async function createBooking(vehicleId, serviceId, scheduledDate, scheduledTime) {
  const res = await api.post('/bookings', {
    vehicleId,
    serviceIds: [serviceId],
    scheduledDate,
    scheduledTime: scheduledTime || '10:00',
    notes: 'تيست العناية الشاملة',
  });
  if (res.status !== 201 || !res.data.success || !res.data.data?.id) {
    throw new Error('Create booking failed: ' + JSON.stringify(res.data?.message || res.data));
  }
  const booking = res.data.data;
  log('✅ Booking created', { bookingId: booking.id, bookingNumber: booking.bookingNumber });
  return booking;
}

async function getMyInvoiceByBookingId(bookingId) {
  setAuth(customerToken);
  const res = await api.get(`/invoices/my/${bookingId}`);
  if (!res.data.success || !res.data.data) {
    throw new Error('Get my invoice failed (by bookingId): ' + JSON.stringify(res.data));
  }
  log('✅ My invoice', { id: res.data.data.id, totalAmount: res.data.data.totalAmount, status: res.data.data.status });
  return res.data.data;
}

async function customerPayInvoice(invoiceId) {
  setAuth(customerToken);
  const res = await api.patch(`/invoices/my/${invoiceId}/pay`, { method: 'CARD' });
  if (!res.data.success) {
    throw new Error('Customer pay invoice failed: ' + JSON.stringify(res.data));
  }
  if (res.data.data?.status !== 'PAID') {
    throw new Error('Payment did not complete: invoice status ' + (res.data.data?.status || 'missing'));
  }
  log('✅ Invoice paid');
  return res.data;
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
  log('✅ Booking marked as completed by vendor');
  return res.data;
}

async function run() {
  console.log('\n--- Test: Comprehensive Care Flow (حجز → دفع → الفيندور يحدد مكتمل) ---');
  console.log(`API: ${BASE_URL}`);
  console.log(`Customer: ${CUSTOMER_EMAIL} | Vendor: ${VENDOR_EMAIL}\n`);

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledDate = tomorrow.toISOString().slice(0, 10);
    const scheduledTime = '10:00';

    // 1) Vendor: login and get one of his comprehensive care services (so the booking will belong to him)
    await loginAsVendor();
    const service = await getMyVendorComprehensiveCareService();
    const serviceId = service.id;

    // 2) Customer: login, vehicles, create booking with that service
    await loginAsCustomer();
    const vehicles = await getMyVehicles();
    const vehicleId = vehicles[0].id;
    const booking = await createBooking(vehicleId, serviceId, scheduledDate, scheduledTime);

    // 3) Customer: get invoice (by booking id) and pay
    const invoice = await getMyInvoiceByBookingId(booking.id);
    await customerPayInvoice(invoice.id);

    // 4) Vendor: mark booking as completed (بعد إتمام الخدمة في الورشة)
    await loginAsVendor();
    await vendorCompleteBooking(booking.id);

    console.log('\n✅ اختبار فلو العناية الشاملة اكتمل بنجاح (حجز → دفع → الفيندور يحدد مكتمل).\n');
  } catch (err) {
    const msg = err.response?.data ?? err.message ?? err;
    console.error('\n❌ Test failed:', typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg));
    if (err.response?.status) console.error('HTTP Status:', err.response.status);
    if (err.code) console.error('Code:', err.code);
    process.exit(1);
  }
}

run();
