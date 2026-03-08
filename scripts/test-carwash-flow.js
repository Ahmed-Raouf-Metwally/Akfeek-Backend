/**
 * Test script: Car Wash flow (ورش الغسيل) — من طلب العميل حتى الدفع
 *
 * 1) العميل: تسجيل دخول → إنشاء طلب غسيل (POST /api/bookings/carwash/request)
 * 2) الفني: تسجيل دخول → جلب الطلبات النشطة → إرسال عرض (bidAmount, estimatedArrival)
 * 3) العميل: جلب عروض الطلب → قبول عرض → يُنشأ الحجز والفاتورة
 * 4) العميل: جلب الفاتورة (بالحجز) → دفع الفاتورة
 *
 * Prerequisites:
 * - Server: npm run dev
 * - DB: seed مع عميل + مركبة + فني غسيل (مثلاً seed.js + seed-technicians + seed-10-users-vehicles)
 * - خدمة غسيل: node prisma/seed-carwash-service.js (تنشئ "Mobile Car Wash" إن لم تكن موجودة)
 *
 * Usage:
 *   npm run test:carwash-flow
 *   API_BASE_URL=http://localhost:3000 node scripts/test-carwash-flow.js
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'ahmed.ali@example.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'Admin123!';
const TECHNICIAN_EMAIL = process.env.TEST_CARWASH_TECHNICIAN_EMAIL || 'wash_tech@akfeek.com';
const TECHNICIAN_PASSWORD = process.env.TEST_CARWASH_TECHNICIAN_PASSWORD || 'Admin123!';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

let customerToken = null;
let technicianToken = null;

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
    throw new Error('Customer login failed. Use seed (e.g. ahmed.ali@example.com / Admin123!)');
  }
  customerToken = res.data.data.token;
  setAuth(customerToken);
  log('✅ Customer login OK', { email: CUSTOMER_EMAIL });
}

async function loginAsTechnician() {
  const res = await api.post('/auth/login', { identifier: TECHNICIAN_EMAIL, password: TECHNICIAN_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Technician login failed. Use seed-technicians (wash_tech@akfeek.com / Admin123!)');
  }
  technicianToken = res.data.data.token;
  setAuth(technicianToken);
  log('✅ Car wash technician login OK', { email: TECHNICIAN_EMAIL });
}

async function getMyVehicles() {
  const res = await api.get('/vehicles');
  if (!res.data || !Array.isArray(res.data.data)) {
    throw new Error('Get vehicles failed or no data. Seed customer with vehicles.');
  }
  const vehicles = res.data.data;
  if (vehicles.length === 0) throw new Error('No vehicles for customer.');
  log('✅ Customer vehicles', vehicles.map((v) => ({ id: v.id })));
  return vehicles;
}

async function createCarWashRequest(vehicleId) {
  const res = await api.post('/bookings/carwash/request', {
    vehicleId,
    location: {
      latitude: 24.7136,
      longitude: 46.6753,
      address: 'Riyadh, Al Olaya',
    },
    serviceType: 'FULL',
    notes: 'تيست غسيل',
    estimatedBudget: 150,
  });
  if (!res.data.success || !res.data.data?.broadcastId) {
    throw new Error('Create car wash request failed: ' + JSON.stringify(res.data));
  }
  const { bookingId, broadcastId, status } = res.data.data;
  log('✅ Car wash request created', { bookingId, broadcastId, status });
  return { bookingId, broadcastId };
}

async function getTechnicianBroadcasts() {
  setAuth(technicianToken);
  const res = await api.get('/technician/carwash/broadcasts');
  if (!res.data.success || !Array.isArray(res.data.data?.broadcasts)) {
    throw new Error('Get broadcasts failed: ' + JSON.stringify(res.data));
  }
  const broadcasts = res.data.data.broadcasts;
  if (broadcasts.length === 0) {
    throw new Error('No car wash broadcasts for technician. Ensure request was created and broadcast is active.');
  }
  log('✅ Technician broadcasts', broadcasts.length);
  return broadcasts;
}

async function submitOffer(broadcastId, bidAmount = 120, estimatedArrival = 15) {
  setAuth(technicianToken);
  const res = await api.post(`/technician/carwash/${broadcastId}/offers`, {
    bidAmount,
    estimatedArrival,
    message: 'عرض تيست',
  });
  if (!res.data.success && res.status !== 200) {
    throw new Error('Submit offer failed: ' + JSON.stringify(res.data));
  }
  const offer = res.data.data || res.data;
  log('✅ Offer submitted', { offerId: offer?.id, bidAmount });
  return offer;
}

async function getOffers(broadcastId) {
  setAuth(customerToken);
  const res = await api.get(`/bookings/carwash/${broadcastId}/offers`);
  if (!res.data.success || !res.data.data?.offers?.length) {
    throw new Error('Get offers failed or no offers: ' + JSON.stringify(res.data));
  }
  const offers = res.data.data.offers;
  log('✅ Customer got offers', offers.length);
  return offers;
}

async function acceptOffer(broadcastId, offerId) {
  setAuth(customerToken);
  const res = await api.post(`/bookings/carwash/${broadcastId}/offers/${offerId}/accept`);
  if (!res.data.success || !res.data.data?.booking?.id) {
    throw new Error('Accept offer failed: ' + JSON.stringify(res.data));
  }
  const booking = res.data.data.booking;
  log('✅ Offer accepted, booking created', { bookingId: booking.id, status: booking.status });
  return booking;
}

async function getMyInvoiceByBookingId(bookingId) {
  setAuth(customerToken);
  const res = await api.get(`/invoices/my/${bookingId}`);
  if (!res.data.success || !res.data.data) {
    throw new Error('Get my invoice failed: ' + JSON.stringify(res.data));
  }
  const invoice = res.data.data;
  log('✅ My invoice', { id: invoice.id, totalAmount: invoice.totalAmount, status: invoice.status });
  return invoice;
}

async function customerPayInvoice(invoiceId) {
  setAuth(customerToken);
  const res = await api.patch(`/invoices/my/${invoiceId}/pay`, { method: 'CARD' });
  if (!res.data.success) {
    throw new Error('Customer pay failed: ' + JSON.stringify(res.data));
  }
  if (res.data.data?.status !== 'PAID') {
    throw new Error('Payment did not complete: invoice status ' + (res.data.data?.status ?? 'missing'));
  }
  log('✅ Invoice paid');
  return res.data;
}

async function run() {
  console.log('\n--- Test: Car Wash Flow (طلب → عرض → قبول → دفع) ---');
  console.log(`API: ${BASE_URL}`);
  console.log(`Customer: ${CUSTOMER_EMAIL} | Technician: ${TECHNICIAN_EMAIL}\n`);

  try {
    // 1) Customer: login, get vehicle, create car wash request
    await loginAsCustomer();
    const vehicles = await getMyVehicles();
    const vehicleId = vehicles[0].id;
    const { broadcastId } = await createCarWashRequest(vehicleId);

    // 2) Technician: login, get broadcasts, submit offer
    await loginAsTechnician();
    const broadcasts = await getTechnicianBroadcasts();
    await submitOffer(broadcastId, 120, 15);

    // 3) Customer: get offers, accept one
    await loginAsCustomer();
    const offers = await getOffers(broadcastId);
    const offerId = offers[0].id;
    const booking = await acceptOffer(broadcastId, offerId);

    // 4) Customer: get invoice (by booking id) and pay
    const invoice = await getMyInvoiceByBookingId(booking.id);
    await customerPayInvoice(invoice.id);

    console.log('\n✅ اختبار فلو ورش الغسيل اكتمل بنجاح (طلب → عرض → قبول → دفع).\n');
  } catch (err) {
    const msg = err.response?.data ?? err.message ?? err;
    console.error('\n❌ Test failed:', typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg));
    if (err.response?.status) console.error('HTTP Status:', err.response.status);
    process.exit(1);
  }
}

run();
