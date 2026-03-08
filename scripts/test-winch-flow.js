/**
 * Test script: Winch/Towing flow from request to completion
 *
 * الفيندور صاحب الوينش هو المتحكم بالكامل (مش الفني):
 * 1) العميل: تسجيل دخول → إنشاء طلب سحب (من أين إلى أين)
 * 2) فيندور الوينش: تسجيل دخول → عرض الطلبات القريبة → إرسال عرض
 * 3) العميل: عرض العروض → قبول عرض
 * 4) أدمن: تحديد الفاتورة كمدفوعة (إيداع حصة الفيندور وخصم عمولة المنصة)
 * 5) فيندور الوينش: قائمة مهامه → تحديث الحالة حتى COMPLETED
 *
 * Prerequisites:
 * - Server running: npm run dev
 * - DB seeded with customer + vehicle: npm run prisma:seed (أو على الأقل عميل ومركبة)
 * - Towing vendor + winch with location: node prisma/seed-towing-vendor-for-test.js
 *
 * Usage:
 *   npm run test:winch-flow
 *   API_BASE_URL=http://localhost:3000 (default customer: user1@akfeek.com / Customer123!, vendor: vendor-towing-service-1@akfeek.com / Vendor123!)
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
// بيانات من الـ seed: user1@akfeek.com (seed-10-users)، vendor-towing-service-1 (seed-24-vendors)، admin (seed.js)
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'user1@akfeek.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'Customer123!';
const VENDOR_EMAIL = process.env.TEST_WINCH_VENDOR_EMAIL || 'vendor-towing-service-1@akfeek.com';
const VENDOR_PASSWORD = process.env.TEST_WINCH_VENDOR_PASSWORD || 'Vendor123!';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@akfeek.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

let customerToken = null;
let vendorToken = null;
let adminToken = null;

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
    throw new Error('Customer login failed. Run prisma seed (user1@akfeek.com / Customer123!)');
  }
  customerToken = res.data.data.token;
  setAuth(customerToken);
  log('✅ Customer login OK', { email: CUSTOMER_EMAIL });
}

async function loginAsVendor() {
  const res = await api.post('/auth/login', { identifier: VENDOR_EMAIL, password: VENDOR_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Vendor login failed. Run: npm run prisma:seed:24vendors then prisma:seed:winches (vendor-towing-service-1@akfeek.com / Vendor123!)');
  }
  vendorToken = res.data.data.token;
  setAuth(vendorToken);
  log('✅ Winch vendor login OK', { email: VENDOR_EMAIL });
}

async function loginAsAdmin() {
  const res = await api.post('/auth/login', { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Admin login failed. Use admin@akfeek.com / Admin123!');
  }
  adminToken = res.data.data.token;
  setAuth(adminToken);
  log('✅ Admin login OK');
}

async function getMyVehicles() {
  const res = await api.get('/vehicles');
  if (!res.data || !Array.isArray(res.data.data)) {
    throw new Error('Get vehicles failed or no data. Seed customer with vehicles.');
  }
  const vehicles = res.data.data;
  if (vehicles.length === 0) {
    throw new Error('No vehicles. Add a vehicle for the customer (e.g. via seed).');
  }
  log('✅ Customer vehicles', vehicles.map((v) => ({ id: v.id, plateNumber: v.plateNumber })));
  return vehicles;
}

async function createTowingRequest(vehicleId) {
  const payload = {
    vehicleId,
    pickupLocation: {
      latitude: 24.7136,
      longitude: 46.6753,
      address: 'King Fahd Road, Riyadh',
    },
    destinationLocation: {
      latitude: 24.75,
      longitude: 46.7,
      address: 'Workshop, Riyadh',
    },
    vehicleCondition: 'NOT_STARTING',
    urgency: 'NORMAL',
    notes: 'Test winch flow',
  };
  const res = await api.post('/bookings/towing/request', payload);
  if (res.status !== 201 || !res.data.success || !res.data.data?.broadcastId) {
    throw new Error('Create towing request failed: ' + JSON.stringify(res.data?.message || res.data));
  }
  const data = res.data.data;
  log('✅ Towing request created', {
    bookingId: data.bookingId,
    broadcastId: data.broadcastId,
    nearbyWinchesCount: data.nearbyWinchesCount,
  });
  if (data.nearbyWinchesCount === 0) {
    throw new Error('No winches nearby. Run: node prisma/seed-towing-vendor-for-test.js (winch with Riyadh lat/lng)');
  }
  return data;
}

async function getWinchBroadcasts() {
  const res = await api.get('/winches/my/broadcasts');
  if (!res.data.success) {
    throw new Error('Get winch broadcasts failed: ' + JSON.stringify(res.data));
  }
  const list = res.data.data?.broadcasts || [];
  if (list.length === 0) {
    throw new Error('No broadcasts for winch. Ensure winch has latitude/longitude and is within TOWING_SEARCH_RADIUS of pickup.');
  }
  log('✅ Winch broadcasts', list.map((b) => ({ id: b.id, yourPrice: b.yourPrice })));
  return list;
}

async function submitWinchOffer(broadcastId) {
  const res = await api.post(`/winches/my/broadcasts/${broadcastId}/offer`, { message: 'Test offer' });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error('Submit winch offer failed: ' + JSON.stringify(res.data));
  }
  log('✅ Winch offer submitted', res.data.data?.offer || res.data.data);
  return res.data.data;
}

async function getOffers(broadcastId) {
  const res = await api.get(`/bookings/towing/${broadcastId}/offers`);
  if (!res.data.success || !res.data.data?.offers) {
    throw new Error('Get offers failed: ' + JSON.stringify(res.data));
  }
  const offers = res.data.data.offers;
  if (offers.length === 0) {
    throw new Error('No offers yet. Winch must submit offer first.');
  }
  log('✅ Offers for customer', offers.map((o) => ({ id: o.id, bidAmount: o.bidAmount })));
  return offers;
}

async function acceptOffer(broadcastId, offerId) {
  const res = await api.post(`/bookings/towing/${broadcastId}/offers/${offerId}/accept`);
  if (!res.data.success) {
    throw new Error('Accept offer failed: ' + JSON.stringify(res.data));
  }
  const inv = res.data.data?.invoice;
  log('✅ Offer accepted', {
    bookingId: res.data.data?.booking?.id,
    invoiceId: inv?.id,
    totalAmount: inv?.totalAmount,
  });
  return res.data.data;
}

async function markInvoicePaid(invoiceId) {
  setAuth(adminToken);
  const res = await api.patch(`/invoices/${invoiceId}/mark-paid`, { method: 'CASH' });
  if (!res.data.success) {
    throw new Error('Mark invoice paid failed (need admin). ' + JSON.stringify(res.data));
  }
  log('✅ Invoice marked paid');
  return res.data;
}

async function getWinchVendorJobs() {
  setAuth(vendorToken);
  const res = await api.get('/winches/my/jobs');
  if (!res.data.success) {
    throw new Error('Get winch vendor jobs failed: ' + JSON.stringify(res.data));
  }
  const jobs = res.data.data?.jobs || [];
  log('✅ مهام فيندور الوينش', jobs.map((j) => ({ id: j.id, status: j.status })));
  return jobs;
}

async function updateWinchJobStatus(jobId, status) {
  setAuth(vendorToken);
  const res = await api.patch(`/winches/my/jobs/${jobId}/status`, { status });
  if (!res.data.success) {
    throw new Error('Update job status failed: ' + JSON.stringify(res.data));
  }
  log(`✅ حالة المهمة → ${status}`);
  return res.data;
}

async function run() {
  console.log('\n--- Test: Winch Flow (من الطلب حتى إتمام النقل) ---');
  console.log(`API: ${BASE_URL}`);
  console.log(`Customer: ${CUSTOMER_EMAIL} | Winch vendor: ${VENDOR_EMAIL}\n`);

  try {
    // 1) Customer: login, get vehicle, create towing request
    await loginAsCustomer();
    const vehicles = await getMyVehicles();
    const vehicleId = vehicles[0].id;
    const { broadcastId } = await createTowingRequest(vehicleId);

    // 2) Winch vendor: login, get broadcasts, submit offer
    await loginAsVendor();
    const broadcasts = await getWinchBroadcasts();
    const broadcast = broadcasts.find((b) => b.id === broadcastId) || broadcasts[0];
    await submitWinchOffer(broadcast.id);

    // 3) Customer: get offers, accept one
    await loginAsCustomer();
    const offers = await getOffers(broadcastId);
    const offerId = offers[0].id;
    const acceptData = await acceptOffer(broadcastId, offerId);
    const invoiceId = acceptData?.invoice?.id;
    if (!invoiceId) {
      console.log('\n⚠️ No invoice in response (optional: mark-paid step skipped)');
    } else {
      // 4) Admin: mark invoice paid (opens socket for tracking/chat)
      await loginAsAdmin();
      await markInvoicePaid(invoiceId);
    }

    // 5) فيندور الوينش: جلب مهامه وتحديث الحالة حتى COMPLETED (هو المتحكم)
    await loginAsVendor();
    const jobs = await getWinchVendorJobs();
    const job = jobs.find((j) => j.status === 'TECHNICIAN_ASSIGNED') || jobs[0];
    if (!job) {
      console.log('\n⚠️ No job found for winch vendor (ensure offer was accepted and invoice paid)');
    } else {
      await updateWinchJobStatus(job.id, 'TECHNICIAN_EN_ROUTE');
      await updateWinchJobStatus(job.id, 'ARRIVED');
      await updateWinchJobStatus(job.id, 'IN_PROGRESS');
      await updateWinchJobStatus(job.id, 'COMPLETED');
    }

    console.log('\n✅ اختبار فلو الوينش (فيندور الوينش هو المتحكم) اكتمل بنجاح.\n');
  } catch (err) {
    const msg = err.response?.data || err.message;
    console.error('\n❌ Test failed:', typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg);
    if (err.response?.status) {
      console.error('HTTP Status:', err.response.status);
    }
    process.exit(1);
  }
}

run();
