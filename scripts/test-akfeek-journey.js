/**
 * Akfeek Journey API smoke test
 *
 * 1) Customer login → POST /api/akfeek-journey/start
 * 2) GET /me → skip each step in order until journey COMPLETED
 * 3) POST /start again (should succeed — no active journey)
 *
 * Optional: TEST_AKFEEK_LINK_BOOKING_ID=uuid — after start, PATCH link on INSURANCE_TOW
 *   (booking must be customer's towing job with JobBroadcast).
 *
 * Usage: npm run test:akfeek-journey
 *   API_BASE_URL=http://localhost:3000
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'user1@akfeek.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'Customer123!';
const LINK_BOOKING_ID = process.env.TEST_AKFEEK_LINK_BOOKING_ID || '';

const STEPS = [
  'INSURANCE_TOW',
  'INSURANCE_DOCS',
  'TOW_TO_WORKSHOP',
  'WORKSHOP_BOOKING',
  'POST_REPAIR_TOW_HOME',
];

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

function setAuth(token) {
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : '';
}

async function main() {
  const login = await api.post('/auth/login', {
    identifier: CUSTOMER_EMAIL,
    password: CUSTOMER_PASSWORD,
  });
  if (!login.data?.success || !login.data?.data?.token) {
    throw new Error('Login failed: use CUSTOMER role seed user (e.g. user1@akfeek.com)');
  }
  setAuth(login.data.data.token);

  const start1 = await api.post('/akfeek-journey/start', {});
  if (!start1.data?.success) throw new Error('start failed: ' + JSON.stringify(start1.data));
  const journeyId = start1.data.data.id;
  console.log('Started journey', journeyId);

  let journey = start1.data.data;

  if (LINK_BOOKING_ID) {
    const linkRes = await api.patch(`/akfeek-journey/${journeyId}/step/INSURANCE_TOW/link`, {
      bookingId: LINK_BOOKING_ID,
    });
    journey = linkRes.data.data;
    console.log('Linked INSURANCE_TOW booking', LINK_BOOKING_ID);
  }

  let guard = 0;
  while (journey?.status === 'ACTIVE' && guard < 20) {
    const step = journey.currentStep;
    if (!STEPS.includes(step)) throw new Error('Unknown currentStep: ' + step);
    const skipRes = await api.patch(`/akfeek-journey/${journeyId}/step/${step}/skip`);
    journey = skipRes.data.data;
    guard += 1;
  }

  if (journey?.status !== 'COMPLETED') {
    throw new Error('Expected COMPLETED after skips, got: ' + JSON.stringify(journey));
  }
  console.log('Journey completed');

  const start2 = await api.post('/akfeek-journey/start', {});
  if (!start2.data?.success) throw new Error('Second start should succeed: ' + JSON.stringify(start2.data));
  await api.patch(`/akfeek-journey/${start2.data.data.id}/abandon`);
  console.log('Second journey started then abandoned — OK');

  console.log('\n--- Akfeek journey test passed ---\n');
}

main().catch((err) => {
  console.error(err.response?.data || err.message);
  process.exit(1);
});
