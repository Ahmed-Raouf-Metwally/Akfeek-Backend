/**
 * Test script: Towing (Winch) socket after payment + current location snapshot
 *
 * What it tests:
 * - Full HTTP flow (request -> offer -> accept -> invoice paid)
 * - GET /api/bookings/towing/booking/:bookingId/socket-access (should succeed after payment)
 * - Socket:
 *   - customer:join_booking + driver:join_booking
 *   - driver:location (push location)
 *   - booking:get_current_location (pull latest saved location)
 *   - customer receives booking:current_location and winch:location_update
 *
 * Usage:
 *   npm run test:towing-socket
 *
 * Env:
 *   API_BASE_URL=http://localhost:3000
 *   TEST_CUSTOMER_EMAIL / TEST_CUSTOMER_PASSWORD
 *   TEST_WINCH_VENDOR_EMAIL / TEST_WINCH_VENDOR_PASSWORD
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
 */
require('dotenv').config();
const axios = require('axios');
const { io } = require('socket.io-client');

const BASE_URL = process.env.API_BASE_URL || process.env.TEST_API_URL || 'http://localhost:3000';

const PICKUP_LOCATION = {
  latitude: 24.7136,
  longitude: 46.6753,
  address: 'King Fahd Road, Riyadh, pickup point',
};
const DESTINATION_LOCATION = {
  latitude: 24.75,
  longitude: 46.7,
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

function setAuth(token) {
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : '';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForEvent(socket, eventName, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout waiting for event: ${eventName}`)), timeoutMs);
    socket.once(eventName, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}

async function login(identifier, password) {
  const res = await api.post('/auth/login', { identifier, password });
  const token = res.data?.data?.token;
  if (!res.data?.success || !token) {
    throw new Error(`Login failed for ${identifier}: ${JSON.stringify(res.data)}`);
  }
  return token;
}

async function getMyVehicles() {
  const res = await api.get('/vehicles');
  const list = res.data?.data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('No vehicles found for customer. Seed customer vehicles first.');
  }
  return list;
}

async function createTowingRequest(vehicleId) {
  const payload = {
    vehicleId,
    pickupLocation: PICKUP_LOCATION,
    destinationLocation: DESTINATION_LOCATION,
    vehicleCondition: 'NOT_STARTING',
    urgency: 'NORMAL',
    notes: 'Test towing socket after payment',
  };
  const res = await api.post('/bookings/towing/request', payload);
  if (res.status !== 201 || !res.data?.success) {
    throw new Error(`Create towing request failed: ${JSON.stringify(res.data)}`);
  }
  return res.data.data; // { bookingId, broadcastId, ... }
}

async function getWinchBroadcasts() {
  const res = await api.get('/winches/my/broadcasts');
  if (!res.data?.success) throw new Error(`Get winch broadcasts failed: ${JSON.stringify(res.data)}`);
  const list = res.data.data?.broadcasts || [];
  if (list.length === 0) throw new Error('No broadcasts found for vendor.');
  return list;
}

async function submitWinchOffer(broadcastId) {
  const res = await api.post(`/winches/my/broadcasts/${broadcastId}/offer`, { message: 'Test offer (socket)' });
  if (!(res.status === 200 || res.status === 201) || !res.data?.success) {
    throw new Error(`Submit offer failed: ${JSON.stringify(res.data)}`);
  }
  return res.data.data;
}

async function getOffers(broadcastId) {
  const res = await api.get(`/bookings/towing/${broadcastId}/offers`);
  if (!res.data?.success) throw new Error(`Get offers failed: ${JSON.stringify(res.data)}`);
  const offers = res.data.data?.offers || [];
  if (offers.length === 0) throw new Error('No offers yet. Vendor must submit offer first.');
  return offers;
}

async function acceptOffer(broadcastId, offerId) {
  const res = await api.post(`/bookings/towing/${broadcastId}/offers/${offerId}/accept`);
  if (!res.data?.success) throw new Error(`Accept offer failed: ${JSON.stringify(res.data)}`);
  return res.data.data; // { booking, invoice }
}

async function markInvoicePaidAsAdmin(invoiceId) {
  const res = await api.patch(`/invoices/${invoiceId}/mark-paid`, { method: 'CASH' });
  if (!res.data?.success) throw new Error(`Mark invoice paid failed: ${JSON.stringify(res.data)}`);
}

async function getSocketAccess(bookingId) {
  const res = await api.get(`/bookings/towing/booking/${bookingId}/socket-access`);
  if (!res.data?.success) throw new Error(`socket-access failed: ${JSON.stringify(res.data)}`);
  return res.data.data;
}

function connectSocket(token) {
  return io(BASE_URL, {
    transports: ['websocket'],
    auth: { token },
  });
}

async function run() {
  console.log('\n--- Test: Towing Socket After Payment ---');
  console.log('API:', BASE_URL);

  // 1) Customer: login + create request
  const customerToken = await login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  setAuth(customerToken);
  const vehicles = await getMyVehicles();
  const { bookingId, broadcastId } = await createTowingRequest(vehicles[0].id);
  console.log('Created towing request:', { bookingId, broadcastId });

  // 2) Vendor: submit offer
  const vendorToken = await login(VENDOR_EMAIL, VENDOR_PASSWORD);
  setAuth(vendorToken);
  const broadcasts = await getWinchBroadcasts();
  const chosenBroadcast = broadcasts.find((b) => b.id === broadcastId) || broadcasts[0];
  await submitWinchOffer(chosenBroadcast.id);
  console.log('Vendor submitted offer');

  // 3) Customer: accept offer
  setAuth(customerToken);
  const offers = await getOffers(broadcastId);
  const accepted = await acceptOffer(broadcastId, offers[0].id);
  const acceptedBookingId = accepted?.booking?.id || bookingId;
  const invoiceId = accepted?.invoice?.id;
  if (!invoiceId) throw new Error('No invoice returned from acceptOffer.');
  console.log('Offer accepted:', { acceptedBookingId, invoiceId });

  // 4) Admin: mark invoice paid
  const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  setAuth(adminToken);
  await markInvoicePaidAsAdmin(invoiceId);
  console.log('Invoice marked PAID (admin)');

  // 5) Customer: socket-access (should be allowed)
  setAuth(customerToken);
  const socketAccess = await getSocketAccess(acceptedBookingId);
  console.log('socket-access OK:', {
    bookingId: socketAccess.bookingId,
    joinEvent: socketAccess.joinEvent,
    currentLocationRequestEvent: socketAccess.currentLocationRequestEvent,
    currentLocationResponseEvent: socketAccess.currentLocationResponseEvent,
  });

  // 6) Socket: connect both customer + driver and join
  const customerSocket = connectSocket(customerToken);
  const driverSocket = connectSocket(vendorToken);

  const customerConnected = waitForEvent(customerSocket, 'connect', 15000);
  const driverConnected = waitForEvent(driverSocket, 'connect', 15000);
  await Promise.all([customerConnected, driverConnected]);

  // Join rooms (must be paid)
  customerSocket.emit('customer:join_booking', acceptedBookingId);
  driverSocket.emit('driver:join_booking', acceptedBookingId);

  // If there is already a stored location, customer will receive booking:current_location automatically.
  // We'll still push a new one to ensure the DB gets a fresh location.
  await sleep(700);

  const sampleLocation = {
    bookingId: acceptedBookingId,
    latitude: PICKUP_LOCATION.latitude + 0.001,
    longitude: PICKUP_LOCATION.longitude + 0.001,
    heading: 90,
    speed: 12,
  };

  const gotUpdate = waitForEvent(customerSocket, 'winch:location_update', 15000);
  driverSocket.emit('driver:location', sampleLocation);
  const updatePayload = await gotUpdate;
  console.log('Customer got push location (winch:location_update):', updatePayload);

  // Now explicitly request the latest saved location snapshot
  const gotCurrent = waitForEvent(customerSocket, 'booking:current_location', 15000);
  customerSocket.emit('booking:get_current_location', acceptedBookingId);
  const currentPayload = await gotCurrent;
  console.log('Customer got current location (booking:current_location):', currentPayload);

  // cleanup
  customerSocket.disconnect();
  driverSocket.disconnect();
  console.log('\n✅ Towing socket test passed.\n');
}

run().catch((err) => {
  const msg = err.response?.data || err.message;
  console.error('\nTest failed:', typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg);
  process.exit(1);
});

