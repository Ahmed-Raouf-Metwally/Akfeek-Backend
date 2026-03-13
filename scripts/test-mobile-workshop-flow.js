/**
 * Test script: Mobile Workshop flow (طلب → عروض → اختيار → فاتورة → دفع → تتبع/شات)
 *
 * 1) العميل: تسجيل دخول → إنشاء طلب (نوع الورشة + الخدمة + مركبة + موقع)
 * 2) فيندور الورشة المتنقلة: تسجيل دخول → طلبات ورشتي → إرسال عرض
 * 3) العميل: عرض الطلب والعروض → اختيار عرض → إنشاء حجز + فاتورة
 * 4) العميل: جلب فاتورتي → دفع الفاتورة (يفتح التتبع والشات)
 *
 * Prerequisites:
 * - Server running: npm run dev
 * - DB: npm run prisma:seed:all (أو على الأقل seed-24-vendors, seed-mobile-workshops, seed-5-services-per-mobile-workshop, seed-10-users-vehicles)
 * - بيانات الفلو: npm run prisma:seed:mobile-workshop-flow (أو node prisma/seed-mobile-workshop-flow-data.js)
 *
 * Usage:
 *   npm run test:mobile-workshop-flow
 *   API_BASE_URL=http://localhost:3000 node scripts/test-mobile-workshop-flow.js
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'ahmed.ali@example.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'Admin123!';
const VENDOR_EMAIL = process.env.TEST_MOBILE_WORKSHOP_VENDOR_EMAIL || 'vendor-mobile-workshop-1@akfeek.com';
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
    throw new Error('Customer login failed. Use seed-10-users-vehicles (ahmed.ali@example.com / Admin123!)');
  }
  customerToken = res.data.data.token;
  setAuth(customerToken);
  log('✅ Customer login OK', { email: CUSTOMER_EMAIL });
}

async function loginAsVendor() {
  const res = await api.post('/auth/login', { identifier: VENDOR_EMAIL, password: VENDOR_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Vendor login failed. Use seed-24-vendors (vendor-mobile-workshop-1@akfeek.com / Vendor123!)');
  }
  vendorToken = res.data.data.token;
  setAuth(vendorToken);
  log('✅ Mobile workshop vendor login OK', { email: VENDOR_EMAIL });
}

async function getMyVehicles() {
  const res = await api.get('/vehicles');
  if (!res.data || !Array.isArray(res.data.data)) {
    throw new Error('Get vehicles failed or no data. Seed customer with vehicles.');
  }
  const vehicles = res.data.data;
  if (vehicles.length === 0) {
    throw new Error('No vehicles. Add a vehicle for the customer (seed-10-users-vehicles).');
  }
  log('✅ Customer vehicles', vehicles.map((v) => ({ id: v.id })));
  return vehicles;
}

async function getWorkshopTypes() {
  const res = await api.get('/mobile-workshop-types');
  if (!res.data?.data?.length) {
    throw new Error('No mobile workshop types. Run: node prisma/seed-mobile-workshop-flow-data.js');
  }
  const types = res.data.data;
  const type = types.find((t) => t.typeServices?.length > 0) || types[0];
  const typeService = type.typeServices?.[0];
  log('✅ Workshop type + service', {
    workshopTypeId: type.id,
    workshopTypeServiceId: typeService?.id,
  });
  return { type, typeService };
}

async function createRequest(vehicleId, workshopTypeId, workshopTypeServiceId) {
  const payload = {
    vehicleId,
    workshopTypeId,
    latitude: 24.7136,
    longitude: 46.6753,
    addressText: 'King Fahd Road, Riyadh',
    city: 'Riyadh',
  };
  if (workshopTypeServiceId) payload.workshopTypeServiceId = workshopTypeServiceId;
  const res = await api.post('/mobile-workshop-requests', payload);
  if (res.status !== 201 || !res.data.success || !res.data.request?.id) {
    throw new Error('Create mobile workshop request failed: ' + JSON.stringify(res.data?.message || res.data));
  }
  const request = res.data.request;
  log('✅ Request created', {
    requestId: request.id,
    requestNumber: request.requestNumber,
    workshopsNotified: res.data.workshopsNotified,
  });
  return request;
}

async function getVendorWorkshopId(workshopTypeId) {
  const res = await api.get('/mobile-workshops', { params: { workshopTypeId } });
  if (!res.data?.data?.length) {
    throw new Error('No workshops for this type. Run: node prisma/seed-mobile-workshop-flow-data.js');
  }
  const workshopId = res.data.data[0].id;
  log('✅ Vendor workshop id', workshopId);
  return workshopId;
}

async function getMyRequests() {
  const res = await api.get('/mobile-workshops/my/requests');
  if (!res.data.success) {
    throw new Error('Get my requests failed: ' + JSON.stringify(res.data));
  }
  const list = res.data.data || [];
  const myWorkshopId = res.data.myWorkshopId;
  if (list.length === 0) {
    throw new Error('No requests for my workshop. Ensure request was created and workshop has same type+service.');
  }
  if (!myWorkshopId) {
    throw new Error('Backend did not return myWorkshopId for vendor.');
  }
  log('✅ My workshop requests', { requests: list.map((r) => ({ id: r.id })), myWorkshopId });
  return { list, myWorkshopId };
}

// الفيندور يوافق على الطلب فقط (بدون سعر) — العميل لاحقاً يختار خدمة من قائمة الخدمات
async function submitOffer(workshopId, requestId) {
  const res = await api.post(`/mobile-workshops/${workshopId}/requests/${requestId}/offer`, {
    message: 'موافق على الطلب',
  });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error('Submit offer failed: ' + JSON.stringify(res.data));
  }
  log('✅ Vendor accepted request (موافق)', { offerId: res.data.offer?.id, acceptOnly: res.data.offer?.acceptOnly });
  return res.data.offer;
}

async function getRequestById(requestId) {
  const res = await api.get(`/mobile-workshop-requests/${requestId}`);
  if (!res.data.success || !res.data.data) {
    throw new Error('Get request failed: ' + JSON.stringify(res.data));
  }
  const request = res.data.data;
  if (!request.offers?.length) {
    throw new Error('No offers yet. Vendor must submit offer first.');
  }
  const summary = request.offers.map((o) => ({
    id: o.id,
    workshop: o.mobileWorkshop?.nameAr,
    acceptOnly: o.acceptOnly,
    workshopServicesCount: o.workshopServices?.length ?? 0,
  }));
  log('✅ Request with offers (ورش وافقت + خدماتها)', summary);
  return request;
}

// العميل يختار عرض (ورشة) + خدمة من قائمة خدماتها — نرسل offerId و mobileWorkshopServiceId
async function selectOffer(requestId, offerId, mobileWorkshopServiceId) {
  const body = { offerId };
  if (mobileWorkshopServiceId) body.mobileWorkshopServiceId = mobileWorkshopServiceId;
  const res = await api.post(`/mobile-workshop-requests/${requestId}/select-offer`, body);
  if (!res.data.success) {
    throw new Error('Select offer failed: ' + JSON.stringify(res.data));
  }
  const booking = res.data.booking;
  const invoice = res.data.invoice;
  log('✅ Offer selected (خدمة محددة)', {
    bookingId: booking?.id,
    invoiceId: invoice?.id,
    totalAmount: invoice?.totalAmount,
  });
  return res.data;
}

async function getMyInvoice(invoiceId) {
  setAuth(customerToken);
  const res = await api.get(`/invoices/my/${invoiceId}`);
  if (!res.data.success || !res.data.data) {
    throw new Error('Get my invoice failed: ' + JSON.stringify(res.data));
  }
  log('✅ My invoice', {
    id: res.data.data.id,
    totalAmount: res.data.data.totalAmount,
    status: res.data.data.status,
  });
  return res.data.data;
}

async function customerPayInvoice(invoiceId) {
  setAuth(customerToken);
  const res = await api.patch(`/invoices/my/${invoiceId}/pay`, { method: 'CARD' });
  if (!res.data.success) {
    throw new Error('Customer pay invoice failed: ' + JSON.stringify(res.data));
  }
  const inv = res.data.data;
  const payment = res.data.payment;
  if (!inv || inv.status !== 'PAID') {
    throw new Error('Payment did not complete: invoice status is ' + (inv?.status || 'missing'));
  }
  if (!payment || payment.status !== 'COMPLETED') {
    throw new Error('Payment record missing or not COMPLETED: ' + JSON.stringify(res.data));
  }
  log('✅ Invoice paid (تتبع وشات مفعّلان)', {
    invoiceStatus: inv.status,
    paymentId: payment.id,
    amount: payment.amount,
  });
  return res.data;
}

async function run() {
  console.log('\n--- Test: Mobile Workshop Flow (من الطلب حتى الدفع وفتح التتبع والشات) ---');
  console.log(`API: ${BASE_URL}`);
  console.log(`Customer: ${CUSTOMER_EMAIL} | Vendor: ${VENDOR_EMAIL}\n`);

  try {
    // 1) Customer: login, vehicles, types, create request
    await loginAsCustomer();
    const vehicles = await getMyVehicles();
    const vehicleId = vehicles[0].id;
    const { type, typeService } = await getWorkshopTypes();
    const request = await createRequest(vehicleId, type.id, typeService?.id);

    // 2) Vendor: login, get my requests (contains myWorkshopId), submit offer
    await loginAsVendor();
    const { list: requestsList, myWorkshopId: workshopId } = await getMyRequests();
    const reqItem = requestsList.find((r) => r.id === request.id) || requestsList[0];
    await submitOffer(workshopId, reqItem.id);

    // 3) Customer: get request with offers (ورش وافقت + خدماتها)، يختار خدمة واحدة من أول ورشة
    setAuth(customerToken);
    const requestWithOffers = await getRequestById(request.id);
    const firstOffer = requestWithOffers.offers[0];
    const offerId = firstOffer.id;
    const services = firstOffer.workshopServices || [];
    if (!services.length) {
      throw new Error('No workshop services returned; vendor must have at least one service.');
    }
    const chosenServiceId = services[0].id;
    const { invoice } = await selectOffer(request.id, offerId, chosenServiceId);
    const invoiceId = invoice?.id;
    if (!invoiceId) {
      throw new Error('No invoice in select-offer response');
    }

    // 4) Customer: get my invoice, pay (opens tracking & chat)
    await getMyInvoice(invoiceId);
    await customerPayInvoice(invoiceId);

    // 5) Verify payment persisted
    const invoiceAfterPay = await getMyInvoice(invoiceId);
    if (invoiceAfterPay.status !== 'PAID') {
      throw new Error('Invoice still not PAID after payment: ' + invoiceAfterPay.status);
    }
    log('✅ فحص نهائي: الفاتورة مدفوعة', { status: invoiceAfterPay.status });

    console.log('\n✅ اختبار فلو الورش المتنقلة اكتمل بنجاح (طلب → عرض → اختيار → فاتورة → دفع).\n');
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
