/**
 * Test script: User order flow (Customer)
 * 1. Login as customer
 * 2. List auto parts (get one product)
 * 3. Add to cart
 * 4. Checkout → create order
 * 5. Get my orders
 *
 * Usage:
 *   node scripts/test-order-flow.js
 *   TEST_USER_EMAIL=ahmed.ali@example.com TEST_USER_PASSWORD=Admin123! node scripts/test-order-flow.js
 *
 * Seeded customer (after prisma:seed): ahmed.ali@example.com / Admin123!
 * Or use customer from create-test-users.js: customer.test@akfeek.com / Test123!
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
const EMAIL = process.env.TEST_USER_EMAIL || 'ahmed.ali@example.com';
const PASSWORD = process.env.TEST_USER_PASSWORD || 'Admin123!';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

let token = null;

async function log(msg, data = null) {
  console.log(msg);
  if (data !== null && data !== undefined) console.log(JSON.stringify(data, null, 2));
}

async function login() {
  const res = await api.post('/auth/login', { identifier: EMAIL, password: PASSWORD });
  if (!res.data.success || !res.data.data?.token) throw new Error('Login failed: ' + JSON.stringify(res.data));
  token = res.data.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  log('✅ Login OK', { user: res.data.data.user?.email });
  return res.data.data;
}

async function getAutoParts() {
  const res = await api.get('/auto-parts', { params: { limit: 5 } });
  if (!res.data.success || !res.data.data?.length) throw new Error('No auto parts found. Seed DB or add vendor products.');
  log('✅ Auto parts (first 5)', res.data.data.map((p) => ({ id: p.id, name: p.name, price: p.price })));
  return res.data.data;
}

async function addToCart(autoPartId, quantity = 1) {
  const res = await api.post('/cart/items', { autoPartId, quantity });
  if (!res.data.success) throw new Error('Add to cart failed: ' + JSON.stringify(res.data));
  log('✅ Added to cart', res.data.data);
  return res.data.data;
}

async function getCart() {
  const res = await api.get('/cart');
  if (!res.data.success) throw new Error('Get cart failed');
  log('✅ Cart', res.data.data);
  return res.data.data;
}

async function checkout(shippingAddress) {
  const payload = {
    shippingAddress: shippingAddress || {
      address: '123 Test St',
      city: 'Riyadh',
      country: 'SA',
      name: 'Test Customer',
      phone: '+966501234001',
    },
    paymentMethod: 'CASH',
  };
  const res = await api.post('/cart/checkout', payload);
  if (!res.data.success) throw new Error('Checkout failed: ' + JSON.stringify(res.data));
  log('✅ Order created (checkout)', res.data.data);
  return res.data.data;
}

async function getMyOrders() {
  const res = await api.get('/marketplace-orders/my-orders');
  if (!res.data.success) throw new Error('Get my orders failed');
  log('✅ My orders', res.data.data);
  return res.data.data;
}

async function run() {
  console.log('\n--- Test: User Order Flow (Customer) ---');
  console.log(`API: ${BASE_URL}`);
  console.log(`User: ${EMAIL}\n`);

  try {
    await login();
    const parts = await getAutoParts();
    const firstPartId = parts[0].id;

    await addToCart(firstPartId, 2);
    await getCart();
    await checkout();
    await getMyOrders();

    console.log('\n✅ Order flow test completed successfully.\n');
  } catch (err) {
    const msg = err.response?.data || err.message;
    console.error('\n❌ Test failed:', msg);
    if (err.response?.status) console.error('Status:', err.response.status);
    process.exit(1);
  }
}

run();
