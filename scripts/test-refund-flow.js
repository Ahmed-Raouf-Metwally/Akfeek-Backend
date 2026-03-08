/**
 * Test script: Refund flow (الاستردادات)
 *
 * 1) Admin: GET /api/admin/finance/refunds — قائمة معاملات الاسترداد
 * يمكن توسيعه لاحقاً: إنشاء حجز → دفع → استرداد عبر POST /api/admin/finance/refunds
 *
 * Prerequisites: Server running (npm run dev), admin user in DB
 *
 * Usage:
 *   npm run test:refund-flow
 *   API_BASE_URL=http://localhost:3000 node scripts/test-refund-flow.js
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@akfeek.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

function log(msg, data = null) {
  console.log(msg);
  if (data != null) console.log(JSON.stringify(data, null, 2));
}

async function loginAsAdmin() {
  const res = await api.post('/auth/login', { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Admin login failed. Ensure admin user exists (e.g. admin@akfeek.com / Admin123!)');
  }
  api.defaults.headers.common['Authorization'] = `Bearer ${res.data.data.token}`;
  return res.data.data.token;
}

async function getRefunds() {
  const res = await api.get('/admin/finance/refunds', { params: { page: 1, limit: 10 } });
  if (!res.data.success) throw new Error(res.data.error || 'Failed to get refunds');
  return res.data.data;
}

async function main() {
  console.log('=== Refund flow test ===');
  console.log('Base URL:', BASE_URL);
  try {
    await loginAsAdmin();
    console.log('Admin logged in.');
    const data = await getRefunds();
    console.log('GET /api/admin/finance/refunds OK');
    log('Refunds list (transactions with type REFUND):', data);
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

main();
