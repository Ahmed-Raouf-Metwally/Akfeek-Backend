/**
 * Test script: Winch/Towing flow from request to completion
 *
 * 1) Customer: login -> create towing request (pickup + destination -> price from distance)
 * 2) Winch vendor: login -> get nearby broadcasts -> submit offer (price from pricePerKm)
 * 3) Customer: get offers -> accept one
 * 4) Admin: mark invoice paid (vendor share + platform commission)
 * 5) Winch vendor: get jobs -> update status to COMPLETED
 *
 * Prerequisites:
 * - Server running: npm run dev
 * - DB seeded with customer + vehicle + towing vendor + winch (Riyadh location)
 *
 * Usage: npm run test:winch-flow
 *   API_BASE_URL=http://localhost:3000
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';

const PICKUP_LOCATION = {
  latitude: 24.7136,
  longitude: 46.6753,
  address: 'King Fahd Road, Riyadh, pickup point',
};
const DESTINATION_LOCATION = {
  latitude: 24.7500,
  longitude: 46.7000,
  address: 'Workshop, Al Olaya, Riyadh',
};
// Defaults aligned with prisma/seed.js (demo seed)
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'user1@akfeek.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'password123';
const VENDOR_EMAIL = process.env.TEST_WINCH_VENDOR_EMAIL || 'vendor2@akfeek.com';
const VENDOR_PASSWORD = process.env.TEST_WINCH_VENDOR_PASSWORD || 'password123';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@akfeek.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123';

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
    throw new Error('Customer login failed. Run demo seed: npm run prisma:seed:demo (user1@akfeek.com / password123)');
  }
  customerToken = res.data.data.token;
  setAuth(customerToken);
  log('Customer login OK', { email: CUSTOMER_EMAIL });
}

async function loginAsVendor() {
  const res = await api.post('/auth/login', { identifier: VENDOR_EMAIL, password: VENDOR_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Vendor login failed. Run demo seed: npm run prisma:seed:demo (vendor2@akfeek.com / password123)');
  }
  vendorToken = res.data.data.token;
  setAuth(vendorToken);
  log('Winch vendor login OK', { email: VENDOR_EMAIL });
}

async function loginAsAdmin() {
  const res = await api.post('/auth/login', { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Admin login failed. Ensure admin exists (admin@akfeek.com / admin123). Run: npm run prisma:seed');
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
  log('Customer vehicles', vehicles.map((v) => ({ id: v.id, plateNumber: v.plateNumber })));
  return vehicles;
}

async function createTowingRequest(vehicleId) {
  const payload = {
    vehicleId,
    pickupLocation: PICKUP_LOCATION,
    destinationLocation: DESTINATION_LOCATION,
    vehicleCondition: 'NOT_STARTING',
    urgency: 'NORMAL',
    notes: 'Test winch flow',
  };
  console.log('\nPickup:', PICKUP_LOCATION.address, `[${PICKUP_LOCATION.latitude}, ${PICKUP_LOCATION.longitude}]`);
  console.log('Destination:', DESTINATION_LOCATION.address, `[${DESTINATION_LOCATION.latitude}, ${DESTINATION_LOCATION.longitude}]`);

  const res = await api.post('/bookings/towing/request', payload);
  if (res.status !== 201 || !res.data.success || !res.data.data?.broadcastId) {
    throw new Error('Create towing request failed: ' + JSON.stringify(res.data?.message || res.data));
  }
  const data = res.data.data;
  log('Towing request created', {
    bookingId: data.bookingId,
    broadcastId: data.broadcastId,
    estimatedDistanceKm: data.estimatedDistanceKm,
    estimatedDurationMinutes: data.estimatedDurationMinutes,
    estimatedPrice: data.estimatedPrice,
    nearbyWinchesCount: data.nearbyWinchesCount,
  });
  if (data.nearbyWinchesCount === 0) {
    throw new Error('No winches nearby. Run: npm run prisma:seed:winches and prisma:seed:winches-location (winch with Riyadh lat/lng)');
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
  list.forEach((b) => {
    console.log(`   broadcast ${b.id.slice(0, 8)}... | trip km: ${b.tripDistanceKm ?? '-'} | yourPrice: ${b.yourPrice ?? '-'} SAR`);
  });
  log('Winch broadcasts', list.map((b) => ({ id: b.id, tripDistanceKm: b.tripDistanceKm, yourPrice: b.yourPrice })));
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
  log('Offers for customer', offers.map((o) => ({ id: o.id, bidAmount: o.bidAmount })));
  return offers;
}

async function acceptOffer(broadcastId, offerId) {
  const res = await api.post(`/bookings/towing/${broadcastId}/offers/${offerId}/accept`);
  if (!res.data.success) {
    throw new Error('Accept offer failed: ' + JSON.stringify(res.data));
  }
  const inv = res.data.data?.invoice;
  log('Offer accepted', {
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
  log('Invoice marked paid');
  return res.data;
}

async function getWinchVendorJobs() {
  setAuth(vendorToken);
  const res = await api.get('/winches/my/jobs');
  if (!res.data.success) {
    throw new Error('Get winch vendor jobs failed: ' + JSON.stringify(res.data));
  }
  const jobs = res.data.data?.jobs || [];
  log('Winch vendor jobs', jobs.map((j) => ({ id: j.id, status: j.status })));
  return jobs;
}

async function updateWinchJobStatus(jobId, status) {
  setAuth(vendorToken);
  const res = await api.patch(`/winches/my/jobs/${jobId}/status`, { status });
  if (!res.data.success) {
    throw new Error('Update job status failed: ' + JSON.stringify(res.data));
  }
  log(`Job status -> ${status}`);
  return res.data;
}

async function run() {
  console.log('\n--- Test: Winch Flow ---');
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
    const acceptedBidAmount = offers[0].bidAmount;
    const acceptData = await acceptOffer(broadcastId, offerId);
    const invoiceId = acceptData?.invoice?.id;
    console.log('\nAgreed price (from pickup + destination):', acceptedBidAmount, 'SAR');
    if (!invoiceId) {
      console.log('\n⚠️ No invoice in response (optional: mark-paid step skipped)');
    } else {
      // 4) Admin: mark invoice paid (opens socket for tracking/chat)
      await loginAsAdmin();
      await markInvoicePaid(invoiceId);
    }

    // 5) Winch vendor: get jobs, update status to COMPLETED
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

    console.log('\n--- Summary: price from pickup + destination ---');
    console.log('  Pickup:', PICKUP_LOCATION.address);
    console.log('  Destination:', DESTINATION_LOCATION.address);
    console.log('  Price = OSRM distance * pricePerKm + basePrice.');
    console.log('\nWinch flow test passed.\n');
  } catch (err) {
    const msg = err.response?.data || err.message;
    console.error('\nTest failed:', typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg);
    if (err.response?.status) {
      console.error('HTTP Status:', err.response.status);
    }
    process.exit(1);
  }
}

run();
