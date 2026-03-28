/**
 * E2E: رحلة «خدمة أكفيك» (Akfeek Journey) — أقرب سيناريو للزر في التطبيق
 *
 * 1) عميل: تسجيل دخول → مركبة → POST /api/akfeek-journey/start
 * 2) تخطي سحب التأمين
 * 3) رفع مستند تأمين (صورة PNG صغيرة) على POST .../documents — أو تخطي إذا فشل الرفع
 * 4) تخطي سحب للورشة
 * 5) حجز ورشة معتمدة (POST /api/bookings) → ربط الحجز PUT ليس — PATCH .../step/WORKSHOP_BOOKING/link
 * 6) دفع فاتورة الورشة PATCH /api/invoices/my/:id/pay → GET /me يجب أن يفتح خطوة العودة للمنزل
 * 7) تخطي POST_REPAIR_TOW_HOME → رحلة COMPLETED
 *
 * المتطلبات:
 * - السيرفر يعمل (npm run dev)
 * - بيانات سيد: عميل بمركبة (مثلاً seed-10-users-vehicles)، فيندور ورشة معتمدة + ورشة (seed-24-vendors + seed-18-workshops)، خدمات كتالوج
 *
 * الاستخدام:
 *   npm run test:akfeek-journey-flow
 *
 * متغيرات اختيارية:
 *   API_BASE_URL=http://localhost:3000
 *   TEST_CUSTOMER_EMAIL=user1@akfeek.com
 *   TEST_CUSTOMER_PASSWORD=Customer123!
 *   TEST_CERTIFIED_WORKSHOP_VENDOR_EMAIL=vendor-certified-workshop-1@akfeek.com
 *   TEST_VENDOR_PASSWORD=Vendor123!
 *   TEST_AKFEEK_SKIP_DOC_UPLOAD=1   — تخطي خطوة رفع الملف (PATCH complete فقط)
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
const VENDOR_EMAIL =
  process.env.TEST_CERTIFIED_WORKSHOP_VENDOR_EMAIL || 'vendor-certified-workshop-1@akfeek.com';
const VENDOR_PASSWORD = process.env.TEST_VENDOR_PASSWORD || 'Vendor123!';
const SKIP_DOC_UPLOAD = process.env.TEST_AKFEEK_SKIP_DOC_UPLOAD === '1';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  validateStatus: () => true,
});

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

async function loginCustomer() {
  const res = await api.post('/auth/login', {
    identifier: CUSTOMER_EMAIL,
    password: CUSTOMER_PASSWORD,
  });
  await assertOk(res, 'Customer login');
  setAuth(res.data.data.token);
  return res.data.data;
}

async function loginVendor() {
  const res = await api.post('/auth/login', {
    identifier: VENDOR_EMAIL,
    password: VENDOR_PASSWORD,
  });
  await assertOk(res, 'Vendor login');
  setAuth(res.data.data.token);
  return res.data.data;
}

async function getVehicles() {
  const res = await api.get('/vehicles');
  await assertOk(res, 'GET /vehicles');
  const list = res.data.data;
  if (!Array.isArray(list) || !list.length) {
    throw new Error('No vehicles for customer. Seed seed-10-users-vehicles or add a vehicle.');
  }
  return list;
}

async function getWorkshopId() {
  const res = await api.get('/workshops/profile/me');
  await assertOk(res, 'GET /workshops/profile/me');
  if (!res.data.data?.id) throw new Error('Vendor has no certified workshop linked.');
  return res.data.data.id;
}

async function getOneCatalogService() {
  const res = await api.get('/services', { params: { isActive: true, limit: 10 } });
  await assertOk(res, 'GET /services');
  const list = res.data.data ?? res.data;
  if (!Array.isArray(list) || !list.length) {
    throw new Error('No catalog services. Run a seed that creates Service records.');
  }
  return list[0];
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
      notes: `Akfeek journey E2E test booking (${attempt})`,
    });
    if (res.data?.success && res.status < 400) {
      return res.data.data;
    }
    if (res.data?.code === 'SLOT_NOT_AVAILABLE') {
      lastErr = res.data;
      continue;
    }
    await assertOk(res, 'POST /bookings (certified workshop)');
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

/** Minimal 1x1 PNG (base64) */
function writeTempPng() {
  const b64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const filePath = path.join(os.tmpdir(), `akfeek-journey-doc-${Date.now()}.png`);
  fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
  return filePath;
}

async function uploadInsuranceDoc(journeyId, token) {
  const filePath = writeTempPng();
  try {
    const form = new FormData();
    form.append('files', fs.createReadStream(filePath), 'insurance-seed.png');
    form.append('labels', JSON.stringify(['other']));
    const res = await axios.post(`${BASE_URL}/api/akfeek-journey/${journeyId}/documents`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
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
  console.log('\n========== Akfeek Journey — E2E flow test ==========');
  console.log('API:', BASE_URL);
  console.log('Customer:', CUSTOMER_EMAIL, '| Vendor:', VENDOR_EMAIL);
  console.log('Skip doc upload:', SKIP_DOC_UPLOAD ? 'yes (complete only)' : 'no (multipart PNG)');
  console.log('');

  let customerToken;

  // Workshop id (vendor)
  await loginVendor();
  const workshopVendorToken = String(api.defaults.headers.common.Authorization || '').replace(
    /^Bearer\s+/i,
    ''
  );
  const workshopId = await getWorkshopId();
  log('Workshop ID', workshopId);

  // Customer
  await loginCustomer();
  customerToken = api.defaults.headers.common.Authorization.replace('Bearer ', '');
  const vehicles = await getVehicles();
  const vehicleId = vehicles[0].id;
  log('Vehicle ID', vehicleId);

  const catalogService = await getOneCatalogService();
  log('Catalog service', { id: catalogService.id, name: catalogService.name || catalogService.nameAr });

  // Abort any stale active journey
  const me0 = await api.get('/akfeek-journey/me');
  if (me0.data?.data?.journey?.id && me0.data.data.journey.status === 'ACTIVE') {
    await api.patch(`/akfeek-journey/${me0.data.data.journey.id}/abandon`);
    log('Abandoned previous active journey');
  }

  const start = await api.post('/akfeek-journey/start', { vehicleId });
  await assertOk(start, 'POST /akfeek-journey/start');
  const journeyId = start.data.data.id;
  let journey = start.data.data;
  log('Journey started', { journeyId, currentStep: journey.currentStep });

  // 1) Skip insurance tow
  let r = await api.patch(`/akfeek-journey/${journeyId}/step/INSURANCE_TOW/skip`);
  await assertOk(r, 'skip INSURANCE_TOW');
  journey = r.data.data;
  log('After skip tow', { currentStep: journey.currentStep });

  // 2) Insurance docs: upload or complete
  if (journey.currentStep !== 'INSURANCE_DOCS') {
    throw new Error('Expected INSURANCE_DOCS, got ' + journey.currentStep);
  }
  if (SKIP_DOC_UPLOAD) {
    r = await api.patch(`/akfeek-journey/${journeyId}/step/INSURANCE_DOCS/complete`);
    await assertOk(r, 'complete INSURANCE_DOCS (no files)');
    journey = r.data.data;
  } else {
    journey = await uploadInsuranceDoc(journeyId, customerToken);
    log('Uploaded insurance doc', { currentStep: journey.currentStep });
  }

  // 3) Skip tow to workshop
  r = await api.patch(`/akfeek-journey/${journeyId}/step/TOW_TO_WORKSHOP/skip`);
  await assertOk(r, 'skip TOW_TO_WORKSHOP');
  journey = r.data.data;
  log('After skip tow→workshop', { currentStep: journey.currentStep });

  // 4) Workshop booking + link
  if (journey.currentStep !== 'WORKSHOP_BOOKING') {
    throw new Error('Expected WORKSHOP_BOOKING, got ' + journey.currentStep);
  }
  const booking = await createWorkshopBooking(vehicleId, workshopId, catalogService.id);
  log('Workshop booking', { id: booking.id, bookingNumber: booking.bookingNumber });

  r = await api.patch(`/akfeek-journey/${journeyId}/step/WORKSHOP_BOOKING/link`, {
    bookingId: booking.id,
  });
  await assertOk(r, 'link WORKSHOP_BOOKING');
  journey = r.data.data;
  log('After link workshop', { currentStep: journey.currentStep, status: journey.status });

  // Workshop vendor: مستندات تأمين أكفيك (قائمة + تنزيل محمي)
  setAuth(workshopVendorToken);
  const docsList = await api.get(
    `/workshops/profile/me/bookings/${booking.id}/akfeek-journey/documents`
  );
  await assertOk(docsList, 'GET workshop Akfeek journey documents');
  const docPayload = docsList.data.data;
  log('Workshop Akfeek docs', {
    hasAkfeekJourney: docPayload.hasAkfeekJourney,
    documentCount: docPayload.documents?.length ?? 0,
  });
  if (!SKIP_DOC_UPLOAD) {
    if (!docPayload.hasAkfeekJourney || !(docPayload.documents?.length > 0)) {
      throw new Error('Expected at least one Akfeek insurance document for workshop API');
    }
    const docId = docPayload.documents[0].id;
    const fileRes = await api.get(
      `/workshops/profile/me/bookings/${booking.id}/akfeek-journey/documents/${docId}/file`,
      { responseType: 'arraybuffer' }
    );
    if (fileRes.status !== 200 || !fileRes.data) {
      throw new Error(`Workshop document download failed HTTP ${fileRes.status}`);
    }
    const len = fileRes.data.byteLength ?? fileRes.data.length;
    if (len < 10) throw new Error('Downloaded file too small');
    log('Workshop downloaded Akfeek document', { bytes: len });
  } else {
    if (docPayload.documents?.length > 0) {
      log('Note: SKIP_DOC_UPLOAD but documents present (unexpected seed?)');
    }
  }
  setAuth(customerToken);

  // 5) Invoice from GET /me
  let me = await api.get('/akfeek-journey/me');
  await assertOk(me, 'GET /akfeek-journey/me');
  const inv = me.data.data.workshopInvoice;
  if (!inv?.id) {
    throw new Error('No workshopInvoice on journey me — expected invoice for booking.');
  }
  log('Workshop invoice', { id: inv.id, status: inv.status, totalAmount: inv.totalAmount });

  if (inv.status === 'PAID' || Number(inv.paidAmount) > 0) {
    log('Invoice already paid; skipping pay step');
  } else {
    await payInvoice(inv.id);
    log('Invoice paid (CARD)');
  }

  me = await api.get('/akfeek-journey/me');
  await assertOk(me, 'GET /me after pay');
  journey = me.data.data.journey;
  if (!journey) {
    throw new Error('Expected active journey after pay, journey is null');
  }
  log('After pay', {
    currentStep: journey.currentStep,
    workshopInvoicePaid: me.data.data.workshopInvoicePaid,
  });

  if (journey.currentStep !== 'POST_REPAIR_TOW_HOME') {
    throw new Error(
      `Expected currentStep POST_REPAIR_TOW_HOME after payment, got ${journey.currentStep}`
    );
  }

  r = await api.patch(`/akfeek-journey/${journeyId}/step/POST_REPAIR_TOW_HOME/skip`);
  await assertOk(r, 'skip POST_REPAIR_TOW_HOME');
  journey = r.data.data;
  if (journey.status !== 'COMPLETED') {
    throw new Error('Journey should be COMPLETED, got ' + JSON.stringify(journey));
  }
  log('Journey COMPLETED');

  const meFinal = await api.get('/akfeek-journey/me');
  if (meFinal.data?.data?.journey != null) {
    log('Note: GET /me still returns journey object after complete — check if null expected:', meFinal.data.data.journey);
  }

  console.log('\n✅ Akfeek journey E2E flow test passed.\n');
}

main().catch((err) => {
  console.error('\n❌ Test failed:', err.message || err);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
