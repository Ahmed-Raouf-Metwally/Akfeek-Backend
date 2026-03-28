/**
 * Test: فلو الفحص التكميلي بعد دفع فاتورة الورشة (PENDING_CUSTOMER → approve/reject → دفع المتبقي)
 *
 * 1) عميل: حجز ورشة معتمدة + فاتورة تُنشأ تلقائياً
 * 2) أدمن: mark-paid (CASH) لدفع المبلغ الأول بالكامل
 * 3) فيندور الورشة: PUT inspection بحالة COMPLETED + بنود بأسعار
 * 4) يُتوقع تقرير PENDING_CUSTOMER ولا يُضاف للفاتورة قبل موافقة العميل
 * 5) فرع approve: عميل يوافق → بنود SUPPLEMENTAL_* + PARTIALLY_PAID → شحن محفظة → دفع المتبقي WALLET
 *    أو فرع reject: عميل يرفض → لا بنود تكميلية
 *
 * المتطلبات:
 * - السيرفر: npm run dev (أو start)
 * - نفس بيانات seed الورش المعتمدة (مثل test-certified-workshop-flow)
 *
 * الاستخدام:
 *   npm run test:workshop-inspection-supplement
 *   API_BASE_URL=http://localhost:3000 node scripts/test-workshop-inspection-supplement-flow.js
 *
 * فرع الرفض فقط:
 *   INSPECT_SUPPLEMENT_BRANCH=reject npm run test:workshop-inspection-supplement
 */
require('dotenv').config();
const axios = require('axios');
const prisma = require('../src/utils/database/prisma');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
const BRANCH = (process.env.INSPECT_SUPPLEMENT_BRANCH || 'approve').toLowerCase();

const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'ahmed.ali@example.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'Admin123!';
const VENDOR_EMAIL = process.env.TEST_CERTIFIED_WORKSHOP_VENDOR_EMAIL || 'vendor-certified-workshop-1@akfeek.com';
const VENDOR_PASSWORD = process.env.TEST_VENDOR_PASSWORD || 'Vendor123!';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@akfeek.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

function setAuth(token) {
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : '';
}

function log(msg, data = null) {
  console.log(msg);
  if (data != null) console.log(JSON.stringify(data, null, 2));
}

async function login(identifier, password) {
  const res = await api.post('/auth/login', { identifier, password });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error(`Login failed: ${identifier}`);
  }
  return { token: res.data.data.token, user: res.data.data.user };
}

async function getMyWorkshopVendor() {
  const res = await api.get('/workshops/profile/me');
  if (!res.data.success || !res.data.data?.id) {
    throw new Error('No workshop for certified vendor');
  }
  return res.data.data;
}

async function getMyVehicles() {
  const res = await api.get('/vehicles');
  if (!res.data?.data?.length) throw new Error('No vehicles for customer');
  return res.data.data;
}

async function getOneCatalogService() {
  const res = await api.get('/services', { params: { isActive: true, limit: 5 } });
  const list = res.data?.data ?? res.data;
  if (!Array.isArray(list) || !list.length) throw new Error('No catalog services');
  return list[0];
}

async function createBooking(vehicleId, workshopId, serviceId, scheduledDate, scheduledTime) {
  const res = await api.post('/bookings', {
    vehicleId,
    workshopId,
    deliveryMethod: 'SELF_DELIVERY',
    serviceIds: [serviceId],
    scheduledDate,
    scheduledTime: scheduledTime || '10:00',
    notes: 'تيست فحص تكميلي بعد الدفع',
  });
  if (res.status !== 201 || !res.data.success || !res.data.data?.id) {
    throw new Error('Create booking failed: ' + JSON.stringify(res.data));
  }
  return res.data.data;
}

async function getMyInvoice(bookingId) {
  const res = await api.get(`/invoices/my/${bookingId}`);
  if (!res.data.success || !res.data.data) throw new Error('getMyInvoice failed');
  return res.data.data;
}

async function markPaidAdmin(invoiceId) {
  const res = await api.patch(`/invoices/${invoiceId}/mark-paid`, { method: 'CASH' });
  if (!res.data.success) throw new Error('mark-paid failed: ' + JSON.stringify(res.data));
  return res.data.data;
}

async function upsertInspection(bookingId) {
  const body = {
    mileage: 52000,
    overallCondition: 'FAIR',
    estimatedCost: 200,
    status: 'COMPLETED',
    items: [
      {
        category: 'Brakes',
        issue: 'Pad wear',
        issueAr: 'تآكل فحمات',
        severity: 'MEDIUM',
        recommendedAction: 'Replace pads',
        estimatedCost: 88.5,
        requiresPart: false,
        priority: 1,
      },
    ],
  };
  const res = await api.put(`/workshops/profile/me/bookings/${bookingId}/inspection`, body);
  if (!res.data.success) throw new Error('upsert inspection failed: ' + JSON.stringify(res.data));
  return res.data.data;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function creditCustomerWallet(userId, amount) {
  const n = Number(amount);
  await prisma.wallet.upsert({
    where: { userId },
    create: { userId, availableBalance: n, pendingBalance: 0 },
    update: { availableBalance: { increment: n } },
  });
}

async function runApproveFlow() {
  const { token: vTok } = await login(VENDOR_EMAIL, VENDOR_PASSWORD);
  setAuth(vTok);
  const workshop = await getMyWorkshopVendor();

  const { token: cTok, user: customer } = await login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  setAuth(cTok);
  const vehicles = await getMyVehicles();
  const catalogSvc = await getOneCatalogService();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduledDate = tomorrow.toISOString().slice(0, 10);
  const scheduledTime = '11:30';

  const booking = await createBooking(vehicles[0].id, workshop.id, catalogSvc.id, scheduledDate, scheduledTime);
  log('✅ Booking', { id: booking.id });

  let inv = await getMyInvoice(booking.id);
  const initialTotal = Number(inv.totalAmount);
  assert(initialTotal > 0, 'invoice total should be positive');
  log('✅ Initial invoice', { id: inv.id, totalAmount: initialTotal, status: inv.status });

  const { token: aTok } = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  setAuth(aTok);
  await markPaidAdmin(inv.id);
  log('✅ Admin marked initial invoice paid (CASH)');

  setAuth(vTok);
  const inspResult = await upsertInspection(booking.id);
  const report = inspResult.report;
  assert(report?.status === 'PENDING_CUSTOMER', `expected PENDING_CUSTOMER, got ${report?.status}`);
  log('✅ After inspection with paid invoice → PENDING_CUSTOMER');

  setAuth(cTok);
  const repGet = await api.get(`/bookings/${booking.id}/inspection-report`);
  assert(repGet.data.data?.status === 'PENDING_CUSTOMER', 'GET inspection-report should be PENDING_CUSTOMER');

  inv = await getMyInvoice(booking.id);
  const supplementalBefore = (inv.lineItems || []).filter((l) =>
    String(l.itemType || '').startsWith('SUPPLEMENTAL_')
  );
  assert(supplementalBefore.length === 0, 'no supplemental lines before customer approve');

  const appr = await api.patch(`/bookings/${booking.id}/inspection-supplement/approve`);
  assert(appr.data.success, 'approve failed');
  log('✅ Customer approved supplemental');

  inv = await getMyInvoice(booking.id);
  const supplementalAfter = (inv.lineItems || []).filter((l) =>
    String(l.itemType || '').startsWith('SUPPLEMENTAL_')
  );
  assert(supplementalAfter.length >= 1, 'expected at least one supplemental line item');
  assert(inv.status === 'PARTIALLY_PAID', `expected PARTIALLY_PAID, got ${inv.status}`);
  const paid = Number(inv.paidAmount);
  const total = Number(inv.totalAmount);
  const remaining = Math.round((total - paid) * 100) / 100;
  assert(remaining > 0, 'should owe remainder');
  log('✅ Invoice after approve', { status: inv.status, paidAmount: paid, totalAmount: total, remaining });

  await creditCustomerWallet(customer.id, Math.max(remaining + 500, 10000));
  log('✅ Credited customer wallet for remainder');

  const payRes = await api.patch(`/invoices/my/${booking.id}/pay`, { method: 'WALLET' });
  assert(payRes.data.success, 'customer pay remainder failed: ' + JSON.stringify(payRes.data));

  inv = await getMyInvoice(booking.id);
  assert(inv.status === 'PAID', `expected PAID after wallet pay, got ${inv.status}`);
  assert(Number(inv.paidAmount) >= Number(inv.totalAmount) - 0.02, 'paidAmount should cover total');
  log('✅ Final invoice PAID after paying remainder', { paidAmount: inv.paidAmount, totalAmount: inv.totalAmount });

  console.log('\n✅ فرع approve: اكتمل بنجاح.\n');
}

async function runRejectFlow() {
  const { token: vTok } = await login(VENDOR_EMAIL, VENDOR_PASSWORD);
  setAuth(vTok);
  const workshop = await getMyWorkshopVendor();

  const { token: cTok } = await login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  setAuth(cTok);
  const vehicles = await getMyVehicles();
  const catalogSvc = await getOneCatalogService();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const scheduledDate = tomorrow.toISOString().slice(0, 10);

  const booking = await createBooking(vehicles[0].id, workshop.id, catalogSvc.id, scheduledDate, '14:00');
  let inv = await getMyInvoice(booking.id);

  const { token: aTok } = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  setAuth(aTok);
  await markPaidAdmin(inv.id);

  setAuth(vTok);
  await upsertInspection(booking.id);

  setAuth(cTok);
  const rej = await api.patch(`/bookings/${booking.id}/inspection-supplement/reject`, {
    comment: 'لا أرغب بالإصلاح الإضافي',
  });
  assert(rej.data.success, 'reject failed');
  assert(rej.data.data?.report?.customerResponse === 'REJECTED', 'expected customerResponse REJECTED');

  inv = await getMyInvoice(booking.id);
  const supplemental = (inv.lineItems || []).filter((l) =>
    String(l.itemType || '').startsWith('SUPPLEMENTAL_')
  );
  assert(supplemental.length === 0, 'reject should not add supplemental lines');

  console.log('\n✅ فرع reject: اكتمل بنجاح.\n');
}

async function main() {
  console.log('\n--- Test: Workshop inspection supplement (دفع أولي → فحص → موافقة/رفض → دفع متبقي) ---');
  console.log(`API: ${BASE_URL} | Branch: ${BRANCH}\n`);

  try {
    if (BRANCH === 'reject') {
      await runRejectFlow();
    } else {
      await runApproveFlow();
    }
  } catch (err) {
    const msg = err.response?.data ?? err.message ?? err;
    console.error('\n❌ Test failed:', typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg));
    if (err.response?.status) console.error('HTTP Status:', err.response.status);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
