/**
 * Test script: Mobile Workshop flow (الفلو الجديد)
 *
 * 1) Customer: login -> get workshop types -> create request (vehicle + type + service + location + searchRadiusKm)
 * 2) Vendor: login -> get my/requests -> submit "موافقة فقط" (بدون price) → يظهر سعر الخدمة المطلوبة في العرض
 * 3) Customer: get request by id -> sees offer with price -> select offer (offerId فقط، بدون mobileWorkshopServiceId)
 * 4) Optional: Admin mark invoice paid
 *
 * Prerequisites:
 * - Server running: npm run dev
 * - DB seeded: prisma:seed:all (or seed-24-vendors, seed-mobile-workshops, seed-5-services-per-mobile-workshop, seed-mobile-workshop-flow-data)
 * - Customer with vehicle: user1@akfeek.com (seed-10-users-vehicles)
 *
 * Usage: npm run test:mobile-workshop-flow
 *   API_BASE_URL=http://localhost:3000
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';

const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'user1@akfeek.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'Customer123!';
const VENDOR_EMAIL = process.env.TEST_MOBILE_WORKSHOP_VENDOR_EMAIL || 'vendor-mobile-workshop-1@akfeek.com';
const VENDOR_PASSWORD = process.env.TEST_WINCH_VENDOR_PASSWORD || 'Vendor123!';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@akfeek.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!';

const REQUEST_LOCATION = {
  latitude: 24.7136,
  longitude: 46.6753,
  addressText: 'King Fahd Road, Riyadh',
  city: 'Riyadh',
};
const SEARCH_RADIUS_KM = 25;

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
    throw new Error('Customer login failed. Seed customer (e.g. user1@akfeek.com / Customer123!)');
  }
  customerToken = res.data.data.token;
  setAuth(customerToken);
  log('Customer login OK', { email: CUSTOMER_EMAIL });
}

async function loginAsVendor() {
  const res = await api.post('/auth/login', { identifier: VENDOR_EMAIL, password: VENDOR_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Vendor login failed. Run: npm run prisma:seed:24vendors && npm run prisma:seed:mobileworkshops (vendor-mobile-workshop-1@akfeek.com / Vendor123!)');
  }
  vendorToken = res.data.data.token;
  setAuth(vendorToken);
  log('Mobile workshop vendor login OK', { email: VENDOR_EMAIL });
}

async function loginAsAdmin() {
  const res = await api.post('/auth/login', { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Admin login failed. Use admin@akfeek.com / Admin123!');
  }
  adminToken = res.data.data.token;
  setAuth(adminToken);
  log('Admin login OK');
}

async function getWorkshopTypes() {
  const res = await api.get('/mobile-workshop-types');
  if (!res.data || !Array.isArray(res.data.data)) {
    throw new Error('Get workshop types failed or no data.');
  }
  const types = res.data.data;
  if (types.length === 0) {
    throw new Error('No mobile workshop types. Run: npm run prisma:seed:mobile-workshop-flow');
  }
  const first = types[0];
  const typeServices = first.typeServices || [];
  const serviceId = typeServices[0]?.id || null;
  log('Workshop types', types.map((t) => ({ id: t.id, name: t.nameAr || t.name, servicesCount: (t.typeServices || []).length })));
  return { workshopTypeId: first.id, workshopTypeServiceId: serviceId };
}

async function getMyVehicles() {
  const res = await api.get('/vehicles');
  if (!res.data || !Array.isArray(res.data.data)) {
    throw new Error('Get vehicles failed or no data.');
  }
  const vehicles = res.data.data;
  if (vehicles.length === 0) {
    throw new Error('No vehicles. Run: npm run prisma:seed:10users-vehicles (and ensure user1 has a vehicle).');
  }
  log('Customer vehicles', vehicles.map((v) => ({ id: v.id, plateNumber: v.plateNumber })));
  return vehicles;
}

async function createMobileWorkshopRequest(vehicleId, workshopTypeId, workshopTypeServiceId) {
  const payload = {
    vehicleId,
    workshopTypeId,
    workshopTypeServiceId: workshopTypeServiceId || undefined,
    latitude: REQUEST_LOCATION.latitude,
    longitude: REQUEST_LOCATION.longitude,
    addressText: REQUEST_LOCATION.addressText,
    city: REQUEST_LOCATION.city,
    searchRadiusKm: SEARCH_RADIUS_KM,
  };
  const res = await api.post('/mobile-workshop-requests', payload);
  if (res.status !== 201 || !res.data.success || !res.data.request?.id) {
    throw new Error('Create mobile workshop request failed: ' + JSON.stringify(res.data?.message || res.data));
  }
  const data = res.data;
  log('Mobile workshop request created', {
    requestId: data.request.id,
    requestNumber: data.request.requestNumber,
    workshopsNotified: data.workshopsNotified,
    nearbyOnly: data.nearbyOnly,
    searchRadiusKm: data.searchRadiusKm,
  });
  if (data.workshopsNotified === 0) {
    throw new Error('No workshops notified. Ensure mobile workshops exist with same type+service and (optional) lat/lng within radius.');
  }
  return data;
}

async function getVendorRequests() {
  const res = await api.get('/mobile-workshops/my/requests');
  if (!res.data.success) {
    throw new Error('Get vendor requests failed: ' + JSON.stringify(res.data));
  }
  const list = res.data.data?.data ?? res.data.data ?? [];
  if (list.length === 0) {
    throw new Error('No requests for vendor. Ensure request was created and workshop matches type+service.');
  }
  log('Vendor requests', list.map((r) => ({ id: r.id, status: r.status, offersCount: (r.offers || []).length })));
  return list;
}

async function submitOfferAcceptOnly(workshopId, requestId) {
  // الفلو الجديد: الفيندور يوافق فقط (بدون price) → السيرفر يضع سعر الخدمة المطلوبة من الورشة في العرض
  const res = await api.post(`/mobile-workshops/${workshopId}/requests/${requestId}/offer`, {
    message: 'موافق على الطلب',
  });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error('Submit offer failed: ' + JSON.stringify(res.data));
  }
  const offer = res.data?.offer;
  log('Vendor accepted (accept only) — offer has requested service price', {
    offerId: offer?.id,
    price: offer?.price,
    acceptOnly: offer?.acceptOnly,
  });
  return res.data;
}

async function getRequestById(requestId) {
  const res = await api.get(`/mobile-workshop-requests/${requestId}`);
  if (!res.data.success || !res.data.data) {
    throw new Error('Get request failed: ' + JSON.stringify(res.data));
  }
  const request = res.data.data;
  const offers = request.offers || [];
  if (offers.length === 0) {
    throw new Error('No offers on request. Vendor must submit offer first.');
  }
  const firstOffer = offers[0];
  log('Request with offers — customer sees price of requested service', {
    requestId: request.id,
    offersCount: offers.length,
    firstOfferPrice: firstOffer.price,
    firstOfferId: firstOffer.id,
  });
  return request;
}

async function selectOffer(requestId, offerId, mobileWorkshopServiceId = null) {
  // الفلو الجديد: العميل يرسل offerId فقط (السعر موجود في العرض)
  const body = mobileWorkshopServiceId ? { offerId, mobileWorkshopServiceId } : { offerId };
  const res = await api.post(`/mobile-workshop-requests/${requestId}/select-offer`, body);
  if (!res.data.success) {
    throw new Error('Select offer failed: ' + JSON.stringify(res.data));
  }
  const inv = res.data?.invoice ?? res.data.data?.invoice;
  const booking = res.data?.booking ?? res.data.data?.booking;
  log('Offer selected (booking + invoice created)', {
    bookingId: booking?.id,
    invoiceId: inv?.id,
    totalAmount: inv?.totalAmount,
  });
  return res.data.data ?? res.data;
}

async function markInvoicePaid(invoiceId) {
  setAuth(adminToken);
  const res = await api.patch(`/invoices/${invoiceId}/mark-paid`, { method: 'CASH' });
  if (!res.data.success) {
    throw new Error('Mark invoice paid failed: ' + JSON.stringify(res.data));
  }
  log('Invoice marked paid');
  return res.data;
}

async function run() {
  console.log('\n--- Test: Mobile Workshop Flow ---');
  console.log(`API: ${BASE_URL}`);
  console.log(`Customer: ${CUSTOMER_EMAIL} | Vendor: ${VENDOR_EMAIL}\n`);

  try {
    await loginAsCustomer();
    const vehicles = await getMyVehicles();
    const vehicleId = vehicles[0].id;
    const { workshopTypeId, workshopTypeServiceId } = await getWorkshopTypes();

  const createResult = await createMobileWorkshopRequest(vehicleId, workshopTypeId, workshopTypeServiceId);
  const requestId = createResult.request?.id;
  if (!requestId) throw new Error('No requestId in create response');

    await loginAsVendor();
    const myWorkshopRes = await api.get('/mobile-workshops/my');
    if (!myWorkshopRes.data.success || !myWorkshopRes.data.data?.id) {
      throw new Error('Get my workshop failed. Vendor must have a mobile workshop (prisma:seed:mobileworkshops).');
    }
    const workshopId = myWorkshopRes.data.data.id;
    const vendorRequests = await getVendorRequests();
    const req = vendorRequests.find((r) => r.id === requestId) || vendorRequests[0];
    await submitOfferAcceptOnly(workshopId, req.id);

    await loginAsCustomer();
    const requestWithOffers = await getRequestById(requestId);
    const offer = requestWithOffers.offers[0];
    // الفلو الجديد: العرض فيه سعر الخدمة المطلوبة — العميل يوافق بـ offerId فقط
    const selectData = await selectOffer(requestId, offer.id, null);
    const invoiceId = selectData?.invoice?.id;

    if (invoiceId) {
      await loginAsAdmin();
      await markInvoicePaid(invoiceId);
    }

    console.log('\n--- Mobile Workshop flow test passed (الفلو الجديد: موافقة فقط → سعر الخدمة يظهر → عميل يوافق بـ offerId) ---\n');
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
