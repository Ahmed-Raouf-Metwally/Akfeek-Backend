/**
 * ============================================================
 * Akfeek — Socket.IO Client Reference Implementation
 * ============================================================
 * Server URL  : wss://akfeek-backend.developteam.site
 * Library     : socket.io-client  (npm i socket.io-client)
 * ============================================================
 */

import { io } from 'socket.io-client';

const SERVER_URL = 'https://akfeek-backend.developteam.site';

// ============================================================
// 1. CONNECTION
// ============================================================

let socket = null;

/**
 * Connect to the socket server with JWT token.
 * Call this right after login.
 */
function connect(jwtToken) {
  if (socket?.connected) return;

  socket = io(SERVER_URL, {
    auth: { token: jwtToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);

    // Join personal notification room after connecting
    socket.emit('user:join', currentUserId);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  // Global error handler
  socket.on('error', (err) => {
    console.error('Socket error:', err.message, err.code);
  });
}

function disconnect() {
  socket?.disconnect();
  socket = null;
}

// ============================================================
// 2. NOTIFICATIONS (كل المستخدمين)
// ============================================================

/**
 * Listen for push notifications from the server.
 * Call after connect().
 */
function onNotification(callback) {
  socket.on('notification:new', (notif) => {
    // notif = { title, titleAr, message, messageAr, type, bookingId }
    callback(notif);
  });
}

// ============================================================
// 3. CUSTOMER — طلب ونش وتتبع الموقع
// ============================================================

const CustomerSocket = {

  /**
   * Step 1: Join the booking room after offer is accepted.
   * Server will auto-send last known location on join.
   */
  joinBooking(bookingId) {
    socket.emit('customer:join_booking', bookingId);

    // Confirmation from server
    socket.on('customer:joined', (data) => {
      console.log('Joined booking room:', data.bookingId);
    });
  },

  /**
   * Step 2: Listen for real-time location updates from the winch.
   */
  onLocationUpdate(callback) {
    socket.on('winch:location_update', (data) => {
      // data = {
      //   bookingId : string,
      //   latitude  : number,
      //   longitude : number,
      //   heading   : number | null,   // اتجاه الحركة بالدرجات (0-360)
      //   speed     : number | null,   // km/h
      //   timestamp : string           // ISO date
      // }
      callback(data);
    });
  },

  /**
   * Step 3 (optional): Request the last saved location manually
   * (useful when reopening the tracking screen).
   */
  requestCurrentLocation(bookingId) {
    socket.emit('booking:get_current_location', bookingId);

    socket.on('booking:current_location', (data) => {
      // same shape as winch:location_update
      console.log('Last known location:', data);
    });
  },

  /**
   * Listen for booking status changes.
   */
  onStatusChanged(callback) {
    socket.on('booking:status_changed', (data) => {
      // data = { bookingId, status, previousStatus }
      callback(data);
    });
  },

  /**
   * Listen for winch arrival notification.
   */
  onWinchArrived(callback) {
    socket.on('technician:arrived', (data) => {
      // data = { location: 'pickup' | 'destination' }
      callback(data);
    });
  },

  /**
   * Send a chat message to the winch vendor.
   */
  sendMessage(bookingId, text) {
    socket.emit('booking:message', { bookingId, text });
  },

  /**
   * Receive chat messages.
   */
  onMessage(callback) {
    socket.on('booking:message', (msg) => {
      // msg = {
      //   bookingId : string,
      //   from      : 'customer' | 'driver',
      //   userId    : string,
      //   text      : string,
      //   timestamp : string
      // }
      callback(msg);
    });
  },

  /**
   * Leave the booking room when closing the tracking screen.
   */
  leaveBooking(bookingId) {
    socket.emit('customer:leave_booking', bookingId);
    socket.off('winch:location_update');
    socket.off('booking:current_location');
    socket.off('booking:status_changed');
    socket.off('booking:message');
    socket.off('technician:arrived');
    socket.off('customer:joined');
  },
};

// ============================================================
// 4. VENDOR (WINCH) — فيندور الونش
// ============================================================

const VendorWinchSocket = {

  /**
   * Step 1: Listen for new towing requests near the winch.
   * Server pushes this automatically when a customer requests.
   */
  onNewRequest(callback) {
    socket.on('winch:new_request', (data) => {
      // data = {
      //   broadcastId      : string,
      //   bookingId        : string,
      //   pickupLocation   : { latitude, longitude, address },
      //   estimatedPrice   : number,
      //   distanceKm       : number,
      //   urgency          : 'NORMAL' | 'URGENT' | 'EMERGENCY',
      //   vehicleCondition : 'DRIVABLE' | 'NON_DRIVABLE' | 'ACCIDENT',
      //   expiresAt        : string  // ISO date — 15 min window
      // }
      callback(data);
    });
  },

  /**
   * Step 2: Join the booking room after the customer accepts your offer.
   */
  joinBooking(bookingId) {
    socket.emit('driver:join_booking', bookingId);

    socket.on('driver:joined', (data) => {
      console.log('Joined booking room as driver:', data.bookingId);
    });
  },

  /**
   * Step 3: Start sending location every 3-5 seconds.
   * Returns a cleanup function to stop tracking.
   */
  startLocationTracking(bookingId, getLocation) {
    const intervalId = setInterval(async () => {
      const { latitude, longitude, heading, speed } = await getLocation();

      socket.emit('driver:location', {
        bookingId,
        latitude,
        longitude,
        heading: heading ?? null,
        speed: speed ?? null,
      });
    }, 3000); // every 3 seconds

    // Return cleanup function
    return () => clearInterval(intervalId);
  },

  /**
   * Send a chat message to the customer.
   */
  sendMessage(bookingId, text) {
    socket.emit('booking:message', { bookingId, text });
  },

  /**
   * Receive chat messages from the customer.
   */
  onMessage(callback) {
    socket.on('booking:message', (msg) => {
      callback(msg);
    });
  },

  /**
   * Leave when job is done or screen is closed.
   */
  leaveBooking(bookingId) {
    socket.emit('driver:leave_booking', bookingId);
    socket.off('driver:joined');
    socket.off('booking:message');
  },
};

// ============================================================
// 5. FULL EXAMPLE — Customer flow
// ============================================================

async function exampleCustomerFlow(token, userId) {
  // 1. Connect
  currentUserId = userId;
  connect(token);

  // 2. Listen for notifications
  onNotification((notif) => {
    console.log('New notification:', notif.titleAr);
    if (notif.type === 'BROADCAST_ACCEPTED') {
      // offer accepted — start tracking
      CustomerSocket.joinBooking(notif.bookingId);
    }
  });

  // 3. After offer accepted, join and track
  const bookingId = 'uuid-booking';
  CustomerSocket.joinBooking(bookingId);
  CustomerSocket.onLocationUpdate((loc) => {
    console.log(`Winch at: ${loc.latitude}, ${loc.longitude} | heading: ${loc.heading}°`);
    // map.updateWinchMarker(loc.latitude, loc.longitude, loc.heading);
  });
  CustomerSocket.onStatusChanged((s) => {
    console.log('Booking status:', s.status);
  });
  CustomerSocket.onMessage((msg) => {
    console.log(`${msg.from}: ${msg.text}`);
  });
}

// ============================================================
// 6. FULL EXAMPLE — Winch vendor flow
// ============================================================

async function exampleVendorFlow(token, userId) {
  currentUserId = userId;
  connect(token);

  // Listen for new requests
  VendorWinchSocket.onNewRequest((req) => {
    console.log('New towing request!', req.broadcastId);
    console.log('Pickup:', req.pickupLocation.address);
    console.log('Price:', req.estimatedPrice, 'SAR');
    // Show notification to vendor
  });

  // After customer accepts your offer, start tracking
  const bookingId = 'uuid-booking';
  VendorWinchSocket.joinBooking(bookingId);

  // Simulate getting device GPS
  const stopTracking = VendorWinchSocket.startLocationTracking(
    bookingId,
    async () => ({
      latitude: 24.7136 + Math.random() * 0.01,
      longitude: 46.6753 + Math.random() * 0.01,
      heading: 90,
      speed: 60,
    })
  );

  // Stop tracking when job is complete
  setTimeout(() => {
    stopTracking();
    VendorWinchSocket.leaveBooking(bookingId);
  }, 30 * 60 * 1000); // 30 minutes
}

// ============================================================
// EXPORT
// ============================================================

export { connect, disconnect, onNotification, CustomerSocket, VendorWinchSocket };
