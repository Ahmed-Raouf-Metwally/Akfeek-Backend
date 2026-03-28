/**
 * E2E: رحلة «خدمة أكفيك» بدون تخطي أي خطوة (لا skip).
 *
 * - INSURANCE_TOW: طلب سحب → فيندور الوينش يقدّم عرض → العميل يقبل العرض (+ دفع فاتورة السحب) → ربط الحجز بالرحلة
 * - INSURANCE_DOCS: رفع مستند (multipart) — لا PATCH complete ولا skip
 * - TOW_TO_WORKSHOP: طلب سحب ثانٍ + عرض وقبول ودفع (إن وُجدت فاتورة) + ربط
 * - WORKSHOP_BOOKING: حجز ورشة معتمدة + ربط + دفع الفاتورة
 * - POST_REPAIR_TOW_HOME: طلب سحب ثالث + عرض وقبول ودفع + ربط (إنهاء الرحلة)
 *
 * المتطلبات (إضافة لسيد الرحلة السريع):
 * - ونش قريب من نقطة الالتقاط (seed: prisma:seed:winches + prisma:seed:winches-location)
 * - OSRM/شبكة تعمل إن كان السيرفر يحسب المسافة للسحب
 *
 *   npm run test:akfeek-journey-flow:no-skip
 *
 * متغيرات:
 *   API_BASE_URL, TEST_CUSTOMER_EMAIL, TEST_CUSTOMER_PASSWORD
 *   TEST_CERTIFIED_WORKSHOP_VENDOR_EMAIL, TEST_VENDOR_PASSWORD
 *   TEST_WINCH_VENDOR_EMAIL (افتراضي vendor-towing-service-1@akfeek.com)
 *   TEST_WINCH_VENDOR_PASSWORD — نفس حساب اختبار الوينش (سطحه) لإرسال العرض
 *
 * المخرجات تتضمن: GET /winches/my (بيانات الوينش والتاجر)، ولكل سحب: مقدّم الخدمة من قائمة العروض
 * وبعد القبول: الحجز + winch + المستخدم المعيّن (فيندور الوينش على technician في الحجز).
 */
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'user1@akfeek.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'Customer123!';
const WORKSHOP_VENDOR_EMAIL =
  process.env.TEST_CERTIFIED_WORKSHOP_VENDOR_EMAIL || 'vendor-certified-workshop-1@akfeek.com';
const WORKSHOP_VENDOR_PASSWORD = process.env.TEST_VENDOR_PASSWORD || 'Vendor123!';
const WINCH_VENDOR_EMAIL =
  process.env.TEST_WINCH_VENDOR_EMAIL || 'vendor-towing-service-1@akfeek.com';
const WINCH_VENDOR_PASSWORD = process.env.TEST_WINCH_VENDOR_PASSWORD || 'Vendor123!';

/** نفس إحداثيات اختبار الوينش — لازم يكون في ونش ضمن نطاق البحث */
const PICKUP_LOCATION = {
  latitude: 24.7136,
  longitude: 46.6753,
  address: 'King Fahd Road, Riyadh, pickup (Akfeek no-skip test)',
};
const DESTINATION_LOCATION = {
  latitude: 24.75,
  longitude: 46.7,
  address: 'Destination, Riyadh (Akfeek no-skip test)',
};

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  validateStatus: () => true,
});

/** يُعبأ بعد تسجيل دخول فيندور السحب (الوينش) */
let winchToken = '';

function setAuth(token) {
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : '';
  api.defaults.headers.common['Content-Type'] = 'application/json';
}

function log(msg, extra) {
  console.log(msg);
  if (extra !== undefined) console.log(typeof extra === 'string' ? extra : JSON.stringify(extra, null, 2));
}

async function assertOk(res, label) {
  if (res.status >= 400 || !res.data?.success) {
    throw new Error(
      `${label} failed HTTP ${res.status}: ` + JSON.stringify(res.data || res.statusText, null, 2)
    );
  }
  return res.data;
}

async function login(identifier, password, label) {
  const res = await api.post('/auth/login', { identifier, password });
  await assertOk(res, label);
  setAuth(res.data.data.token);
  return res.data.data;
}

async function getWorkshopId() {
  const res = await api.get('/workshops/profile/me');
  await assertOk(res, 'GET /workshops/profile/me');
  if (!res.data.data?.id) throw new Error('Workshop vendor has no workshop.');
  return res.data.data.id;
}

async function getVehicles() {
  const res = await api.get('/vehicles');
  await assertOk(res, 'GET /vehicles');
  const list = res.data.data;
  if (!Array.isArray(list) || !list.length) {
    throw new Error('No vehicles for customer.');
  }
  return list;
}

async function getOneCatalogService() {
  const res = await api.get('/services', { params: { isActive: true, limit: 10 } });
  await assertOk(res, 'GET /services');
  const list = res.data.data ?? res.data;
  if (!Array.isArray(list) || !list.length) throw new Error('No catalog services.');
  return list[0];
}

/** حجز سحب ببث — يُنشئ JobBroadcast مرتبط بالحجز (مطلوب لربط خطوات الرحلة) */
async function createTowingBooking(vehicleId, notesSuffix) {
  const res = await api.post('/bookings/towing/request', {
    vehicleId,
    pickupLocation: PICKUP_LOCATION,
    destinationLocation: DESTINATION_LOCATION,
    vehicleCondition: 'NOT_STARTING',
    urgency: 'NORMAL',
    notes: `Akfeek journey no-skip — ${notesSuffix}`,
  });
  if (res.status !== 201 || !res.data?.success || !res.data.data?.bookingId) {
    throw new Error(
      `Towing request failed: ${JSON.stringify(res.data)} — تأكد من وجود ونش قريب (seed winches + Riyadh location).`
    );
  }
  return res.data.data;
}

async function createWorkshopBooking(vehicleId, workshopId, serviceId) {
  const base = Date.now();
  let lastErr;
  for (let attempt = 0; attempt < 12; attempt++) {
    const d = new Date();
    d.setDate(d.getDate() + 4 + attempt);
    const scheduledDate = d.toISOString().slice(0, 10);
    const hour = 9 + ((base + attempt) % 7);
    const scheduledTime = `${String(hour).padStart(2, '0')}:${attempt % 2 === 0 ? '15' : '45'}`;
    const res = await api.post('/bookings', {
      vehicleId,
      workshopId,
      deliveryMethod: 'SELF_DELIVERY',
      serviceIds: [serviceId],
      scheduledDate,
      scheduledTime,
      notes: `Akfeek journey no-skip workshop booking (${attempt})`,
    });
    if (res.data?.success && res.status < 400) {
      return res.data.data;
    }
    if (res.data?.code === 'SLOT_NOT_AVAILABLE') {
      lastErr = res.data;
      continue;
    }
    await assertOk(res, 'POST /bookings');
  }
  throw new Error(
    'Could not find free workshop slot after retries: ' + JSON.stringify(lastErr || {})
  );
}

async function payInvoice(invoiceId) {
  const res = await api.patch(`/invoices/my/${invoiceId}/pay`, { method: 'CARD' });
  await assertOk(res, 'PATCH invoices/my/.../pay');
  return res.data;
}

/** بيانات ونش الفيندور (نفس الحساب الذي يقدّم العروض) */
async function getMyWinchProfile() {
  const res = await api.get('/winches/my');
  await assertOk(res, 'GET /winches/my');
  return res.data.data;
}

function pickWinchProviderFromCustomerOffer(offer) {
  if (!offer) return null;
  if (offer.winch) {
    return {
      source: 'winch',
      offerId: offer.id,
      bidAmount: offer.bidAmount,
      estimatedArrivalMinutes: offer.winch.estimatedArrival,
      distanceKm: offer.winch.distance,
      winchId: offer.winch.id,
      winchName: offer.winch.name,
      winchNameAr: offer.winch.nameAr,
      vendorTradeName: offer.winch.vendorName,
      vendorTradeNameAr: offer.winch.vendorNameAr,
      rating: offer.winch.averageRating,
      totalTrips: offer.winch.totalTrips,
    };
  }
  if (offer.technician) {
    return {
      source: 'technician',
      offerId: offer.id,
      bidAmount: offer.bidAmount,
      technician: offer.technician,
    };
  }
  return { source: 'unknown', offerId: offer.id, bidAmount: offer.bidAmount };
}

function pickAssignedProviderFromAccept(acceptData) {
  const b = acceptData?.booking;
  if (!b) return null;
  return {
    bookingId: b.id,
    bookingNumber: b.bookingNumber,
    bookingStatus: b.status,
    agreedPrice: b.agreedPrice,
    winch: b.winch || null,
    assignedUser: b.technician
      ? {
          userId: b.technician.id,
          displayName: b.technician.name,
          phone: b.technician.phone,
        }
      : null,
  };
}

/**
 * فلو السطحة: الوينش يقدّم عرض على البث → العميل يشوف العروض ويقبل → دفع فاتورة السحب (عميل).
 * يُفترض أن `customerToken` صالح قبل الاستدعاء؛ يُعاد ضبط العميل بعد انتهاء الدالة.
 */
async function winchSubmitOfferAndCustomerAccept(broadcastId, customerToken, label) {
  setAuth(winchToken);
  const listRes = await api.get('/winches/my/broadcasts');
  await assertOk(listRes, `${label}: GET winch broadcasts`);
  const broadcasts = listRes.data.data?.broadcasts || [];
  const match = broadcasts.find((b) => b.id === broadcastId);
  if (!match) {
    throw new Error(
      `${label}: البث ${broadcastId} غير ظاهر للوينش. تحقق من الموقع ونطاق TOWING_SEARCH_RADIUS.`
    );
  }

  const offerRes = await api.post(`/winches/my/broadcasts/${broadcastId}/offer`, {
    message: `Akfeek no-skip — ${label}`,
  });
  if (!offerRes.data?.success || offerRes.status >= 400) {
    throw new Error(
      `${label}: submit winch offer failed: ` + JSON.stringify(offerRes.data || offerRes.status)
    );
  }
  log(`${label}: winch offer submitted`, offerRes.data.data?.offer || { ok: true });

  setAuth(customerToken);
  const offRes = await api.get(`/bookings/towing/${broadcastId}/offers`);
  await assertOk(offRes, `${label}: GET towing offers`);
  const offers = offRes.data.data?.offers || [];
  if (!offers.length) {
    throw new Error(`${label}: لا توجد عروض للعميل بعد تقديم الوينش.`);
  }
  const chosen = offers[0];
  log(`${label}: مقدّم الخدمة (ظاهر للعميل في العروض)`, pickWinchProviderFromCustomerOffer(chosen));

  const offerId = chosen.id;
  const accRes = await api.post(`/bookings/towing/${broadcastId}/offers/${offerId}/accept`);
  await assertOk(accRes, `${label}: accept towing offer`);
  const invoiceId = accRes.data.data?.invoice?.id;
  const invStatus = accRes.data.data?.invoice?.status;
  log(`${label}: بعد قبول العرض — الحجز ومقدّم الخدمة المعيّن`, pickAssignedProviderFromAccept(accRes.data.data));
  log(`${label}: offer accepted (invoice)`, {
    bookingId: accRes.data.data?.booking?.id,
    invoiceId,
    invoiceStatus: invStatus,
  });

  if (invoiceId && invStatus !== 'PAID' && invStatus !== 'PARTIALLY_PAID') {
    await payInvoice(invoiceId);
    log(`${label}: towing invoice paid (CARD)`, { invoiceId });
  }

  setAuth(customerToken);
  return accRes.data.data;
}

function writeTempPng() {
  const b64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const filePath = path.join(os.tmpdir(), `akfeek-no-skip-doc-${Date.now()}.png`);
  fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
  return filePath;
}

async function uploadInsuranceDoc(journeyId, token) {
  const filePath = writeTempPng();
  try {
    const form = new FormData();
    form.append('files', fs.createReadStream(filePath), 'insurance.png');
    form.append('labels', JSON.stringify(['other']));
    const res = await axios.post(`${BASE_URL}/api/akfeek-journey/${journeyId}/documents`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    });
    await assertOk(res, 'POST .../documents');
    return res.data.data;
  } finally {
    try {
      fs.unlinkSync(filePath);
    } catch (_) {
      /* ignore */
    }
  }
}

async function main() {
  console.log('\n========== Akfeek Journey — E2E (no skip, all steps) ==========');
  console.log('API:', BASE_URL);
  console.log('Customer:', CUSTOMER_EMAIL);
  console.log('Workshop vendor:', WORKSHOP_VENDOR_EMAIL);
  console.log('Winch vendor (for nearby winches):', WINCH_VENDOR_EMAIL);
  console.log('');

  await login(WORKSHOP_VENDOR_EMAIL, WORKSHOP_VENDOR_PASSWORD, 'Workshop vendor login');
  const workshopId = await getWorkshopId();
  log('Workshop ID', workshopId);

  await login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD, 'Customer login');
  const customerToken = String(api.defaults.headers.common.Authorization || '').replace(
    /^Bearer\s+/i,
    ''
  );

  const winchLogin = await api.post('/auth/login', {
    identifier: WINCH_VENDOR_EMAIL,
    password: WINCH_VENDOR_PASSWORD,
  });
  await assertOk(winchLogin, 'Winch vendor login');
  winchToken = winchLogin.data.data.token;

  setAuth(winchToken);
  const winchProfile = await getMyWinchProfile();
  log('مقدّم خدمة الوينش (حساب الاختبار)', {
    vendorLoginEmail: WINCH_VENDOR_EMAIL,
    winchId: winchProfile.id,
    name: winchProfile.name,
    nameAr: winchProfile.nameAr,
    plateNumber: winchProfile.plateNumber,
    city: winchProfile.city,
    lat: winchProfile.latitude,
    lng: winchProfile.longitude,
    basePrice: winchProfile.basePrice,
    pricePerKm: winchProfile.pricePerKm,
    minPrice: winchProfile.minPrice,
    vendorTradeName: winchProfile.vendor?.businessName,
    vendorTradeNameAr: winchProfile.vendor?.businessNameAr,
  });
  setAuth(customerToken);

  const vehicles = await getVehicles();
  const vehicleId = vehicles[0].id;
  log('Vehicle ID', vehicleId);

  const catalogService = await getOneCatalogService();
  log('Catalog service', { id: catalogService.id, name: catalogService.name || catalogService.nameAr });

  const me0 = await api.get('/akfeek-journey/me');
  if (me0.data?.data?.journey?.id && me0.data.data.journey.status === 'ACTIVE') {
    await api.patch(`/akfeek-journey/${me0.data.data.journey.id}/abandon`);
    log('Abandoned previous active journey');
  }

  const start = await api.post('/akfeek-journey/start', { vehicleId });
  await assertOk(start, 'POST /akfeek-journey/start');
  const journeyId = start.data.data.id;
  let journey = start.data.data;
  if (journey.currentStep !== 'INSURANCE_TOW') {
    throw new Error('Expected INSURANCE_TOW first, got ' + journey.currentStep);
  }
  log('Journey started', { journeyId, currentStep: journey.currentStep });

  const tow1 = await createTowingBooking(vehicleId, 'insurance tow');
  log('Towing booking #1 (insurance)', { bookingId: tow1.bookingId, broadcastId: tow1.broadcastId });

  await winchSubmitOfferAndCustomerAccept(tow1.broadcastId, customerToken, 'Tow #1 insurance');

  let r = await api.patch(`/akfeek-journey/${journeyId}/step/INSURANCE_TOW/link`, {
    bookingId: tow1.bookingId,
  });
  await assertOk(r, 'link INSURANCE_TOW');
  journey = r.data.data;
  log('After link INSURANCE_TOW', { currentStep: journey.currentStep });
  if (journey.currentStep !== 'INSURANCE_DOCS') {
    throw new Error('Expected INSURANCE_DOCS after insurance tow link');
  }

  journey = await uploadInsuranceDoc(journeyId, customerToken);
  log('Insurance docs uploaded', { currentStep: journey.currentStep });
  if (journey.currentStep !== 'TOW_TO_WORKSHOP') {
    throw new Error('Expected TOW_TO_WORKSHOP after documents');
  }

  const tow2 = await createTowingBooking(vehicleId, 'tow to workshop');
  log('Towing booking #2 (to workshop)', {
    bookingId: tow2.bookingId,
    broadcastId: tow2.broadcastId,
  });

  await winchSubmitOfferAndCustomerAccept(tow2.broadcastId, customerToken, 'Tow #2 to workshop');

  r = await api.patch(`/akfeek-journey/${journeyId}/step/TOW_TO_WORKSHOP/link`, {
    bookingId: tow2.bookingId,
  });
  await assertOk(r, 'link TOW_TO_WORKSHOP');
  journey = r.data.data;
  log('After link TOW_TO_WORKSHOP', { currentStep: journey.currentStep });
  if (journey.currentStep !== 'WORKSHOP_BOOKING') {
    throw new Error('Expected WORKSHOP_BOOKING');
  }

  const booking = await createWorkshopBooking(vehicleId, workshopId, catalogService.id);
  log('Workshop booking', { id: booking.id, bookingNumber: booking.bookingNumber });

  r = await api.patch(`/akfeek-journey/${journeyId}/step/WORKSHOP_BOOKING/link`, {
    bookingId: booking.id,
  });
  await assertOk(r, 'link WORKSHOP_BOOKING');
  journey = r.data.data;
  log('After link workshop', { currentStep: journey.currentStep });

  let me = await api.get('/akfeek-journey/me');
  await assertOk(me, 'GET /akfeek-journey/me');
  const inv = me.data.data.workshopInvoice;
  if (!inv?.id) throw new Error('No workshop invoice');
  log('Workshop invoice', { id: inv.id, status: inv.status });

  if (inv.status !== 'PAID' && inv.status !== 'PARTIALLY_PAID') {
    await payInvoice(inv.id);
    log('Invoice paid (CARD)');
  }

  me = await api.get('/akfeek-journey/me');
  await assertOk(me, 'GET /me after pay');
  journey = me.data.data.journey;
  if (!journey) throw new Error('Expected active journey after pay');
  log('After pay', { currentStep: journey.currentStep });
  if (journey.currentStep !== 'POST_REPAIR_TOW_HOME') {
    throw new Error(`Expected POST_REPAIR_TOW_HOME, got ${journey.currentStep}`);
  }

  const tow3 = await createTowingBooking(vehicleId, 'return home');
  log('Towing booking #3 (return home)', {
    bookingId: tow3.bookingId,
    broadcastId: tow3.broadcastId,
  });

  await winchSubmitOfferAndCustomerAccept(tow3.broadcastId, customerToken, 'Tow #3 return home');

  r = await api.patch(`/akfeek-journey/${journeyId}/step/POST_REPAIR_TOW_HOME/link`, {
    bookingId: tow3.bookingId,
  });
  await assertOk(r, 'link POST_REPAIR_TOW_HOME');
  journey = r.data.data;
  if (journey.status !== 'COMPLETED') {
    throw new Error('Journey should be COMPLETED after return-home link');
  }
  log('Journey COMPLETED (linked return-home tow, no skip)');

  console.log('\n✅ Akfeek journey no-skip E2E passed.\n');
}

main().catch((err) => {
  console.error('\n❌ Test failed:', err.message || err);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
