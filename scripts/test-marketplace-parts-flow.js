/**
 * Test script: فلو بيع قطع الغيار من طلب العميل حتى وصول الطلب
 * الخطوات:
 * 1) العميل: تسجيل دخول → عرض قطع الغيار → إضافة للسلة → إتمام الطلب (checkout)
 * 2) أدمن: تحديد الطلب كمدفوع (paymentStatus: PAID)
 * 3) أدمن: تحديث حالة الطلب CONFIRMED → PROCESSING → SHIPPED → DELIVERED
 * 4) العميل: عرض طلباتي والتحقق من وصول الطلب (DELIVERED)
 *
 * Prerequisites:
 * - Server: npm run dev
 * - DB: عميل + قطع غيار (مثلاً npm run prisma:seed أو seed يحتوي على auto parts)
 * - أدمن: admin@akfeek.com / Admin123!
 *
 * Usage:
 *   npm run test:marketplace-parts-flow
 *   API_BASE_URL=http://localhost:3000 TEST_CUSTOMER_EMAIL=ahmed.ali@example.com TEST_CUSTOMER_PASSWORD=Admin123! node scripts/test-marketplace-parts-flow.js
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || process.env.TEST_USER_EMAIL || 'ahmed.ali@example.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || process.env.TEST_USER_PASSWORD || 'Admin123!';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@akfeek.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

let customerToken = null;
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
    throw new Error('Customer login failed. Run prisma seed (e.g. ahmed.ali@example.com / Admin123!)');
  }
  customerToken = res.data.data.token;
  setAuth(customerToken);
  log('✅ Customer login OK', { email: CUSTOMER_EMAIL });
}

async function loginAsAdmin() {
  const res = await api.post('/auth/login', { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (!res.data.success || !res.data.data?.token) {
    throw new Error('Admin login failed. Use admin@akfeek.com / Admin123!');
  }
  adminToken = res.data.data.token;
  setAuth(adminToken);
  log('✅ Admin login OK', { email: ADMIN_EMAIL });
}

async function getAutoParts() {
  const res = await api.get('/auto-parts', { params: { limit: 10 } });
  if (!res.data.success || !res.data.data?.length) {
    throw new Error('No auto parts found. Seed DB with auto parts and vendor.');
  }
  const parts = res.data.data;
  log('✅ Auto parts', parts.slice(0, 3).map((p) => ({ id: p.id, name: p.name, price: p.price, stockQuantity: p.stockQuantity })));
  return parts;
}

async function addToCart(autoPartId, quantity = 1) {
  const res = await api.post('/cart/items', { autoPartId, quantity });
  if (!res.data.success) {
    throw new Error('Add to cart failed: ' + JSON.stringify(res.data));
  }
  log('✅ Added to cart', { autoPartId, quantity });
  return res.data.data;
}

async function checkout() {
  const payload = {
    shippingAddress: {
      address: '123 شارع الاختبار',
      city: 'الرياض',
      country: 'SA',
      name: 'عميل اختبار',
      phone: '+966501234567',
    },
    paymentMethod: 'CASH',
  };
  const res = await api.post('/cart/checkout', payload);
  if (!res.data.success) {
    throw new Error('Checkout failed: ' + JSON.stringify(res.data));
  }
  const order = res.data.data;
  log('✅ Order created (checkout)', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentStatus: order.paymentStatus,
  });
  return order;
}

async function adminSetOrderPaid(orderId) {
  setAuth(adminToken);
  const res = await api.put(`/marketplace-orders/${orderId}/status`, { paymentStatus: 'PAID' });
  if (!res.data.success) {
    throw new Error('Set order paid failed: ' + JSON.stringify(res.data));
  }
  log('✅ Order marked as PAID');
  return res.data.data;
}

async function adminUpdateOrderStatus(orderId, status) {
  setAuth(adminToken);
  const res = await api.put(`/marketplace-orders/${orderId}/status`, { status });
  if (!res.data.success) {
    throw new Error('Update order status failed: ' + JSON.stringify(res.data));
  }
  log(`✅ Order status → ${status}`);
  return res.data.data;
}

async function getMyOrders() {
  setAuth(customerToken);
  const res = await api.get('/marketplace-orders/my-orders');
  if (!res.data.success) {
    throw new Error('Get my orders failed: ' + JSON.stringify(res.data));
  }
  const orders = res.data.data || [];
  log('✅ My orders', orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus })));
  return orders;
}

async function getOrderById(orderId) {
  setAuth(customerToken);
  const res = await api.get(`/marketplace-orders/${orderId}`);
  if (!res.data.success) {
    throw new Error('Get order failed: ' + JSON.stringify(res.data));
  }
  log('✅ Order details', {
    id: res.data.data.id,
    orderNumber: res.data.data.orderNumber,
    status: res.data.data.status,
    paymentStatus: res.data.data.paymentStatus,
    totalAmount: res.data.data.totalAmount,
  });
  return res.data.data;
}

async function run() {
  console.log('\n--- Test: فلو قطع الغيار (من الطلب حتى التوصيل) ---');
  console.log(`API: ${BASE_URL}`);
  console.log(`Customer: ${CUSTOMER_EMAIL} | Admin: ${ADMIN_EMAIL}\n`);

  try {
    // 1) العميل: تسجيل دخول، عرض قطع غيار، إضافة للسلة، إتمام الطلب
    await loginAsCustomer();
    const parts = await getAutoParts();
    const part = parts[0];
    if ((part.stockQuantity ?? 0) < 1) {
      throw new Error('No stock for first part. Seed auto parts with stockQuantity > 0.');
    }
    await addToCart(part.id, 1);
    const order = await checkout();
    const orderId = order.id;

    // 2) أدمن: تحديد الطلب كمدفوع
    await loginAsAdmin();
    await adminSetOrderPaid(orderId);

    // 3) أدمن: تحديث حالة الطلب حتى التوصيل
    await adminUpdateOrderStatus(orderId, 'CONFIRMED');
    await adminUpdateOrderStatus(orderId, 'PROCESSING');
    await adminUpdateOrderStatus(orderId, 'SHIPPED');
    await adminUpdateOrderStatus(orderId, 'DELIVERED');

    // 4) العميل: التحقق من طلباتي وأن الطلب وصل (DELIVERED)
    await loginAsCustomer();
    const myOrders = await getMyOrders();
    const found = myOrders.find((o) => o.id === orderId);
    if (!found) {
      throw new Error('Order not found in my orders');
    }
    const orderDetails = await getOrderById(orderId);
    if (orderDetails.status !== 'DELIVERED') {
      throw new Error(`Expected order status DELIVERED, got ${orderDetails.status}`);
    }
    if (orderDetails.paymentStatus !== 'PAID') {
      throw new Error(`Expected paymentStatus PAID, got ${orderDetails.paymentStatus}`);
    }

    console.log('\n✅ اختبار فلو قطع الغيار اكتمل بنجاح (طلب → دفع → توصيل).\n');
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
