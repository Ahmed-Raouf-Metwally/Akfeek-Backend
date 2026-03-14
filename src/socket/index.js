const socketIo = require('socket.io');
const customerNamespace = require('./namespaces/customer.namespace');
const technicianNamespace = require('./namespaces/technician.namespace');
const supplierNamespace = require('./namespaces/supplier.namespace');
const adminNamespace = require('./namespaces/admin.namespace');
const logger = require('../utils/logger/logger');

let io;

module.exports = {
  /**
   * Initialize Socket.io server
   * @param {Object} server - HTTP server instance
   * @returns {Object} Socket.io instance
   */
  init(server) {
    io = socketIo(server, {
      cors: {
        origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Initialize namespaces for different user roles
    customerNamespace.init(io.of('/customer'));
    technicianNamespace.init(io.of('/technician'));
    supplierNamespace.init(io.of('/supplier'));
    adminNamespace.init(io.of('/admin'));

    logger.info('✅ Socket.io initialized with 4 namespaces');
    logger.info('   - /customer (for customers)');
    logger.info('   - /technician (for technicians)');
    logger.info('   - /supplier (for suppliers)');
    logger.info('   - /admin (for admins)');

    return io;
  },

  /**
   * Get Socket.io instance
   * @returns {Object} Socket.io instance
   */
  getIo() {
    if (!io) {
      throw new Error('Socket.io not initialized. Call init() first.');
    }
    return io;
  },

  /**
   * Emit event to customer
   * @param {string} customerId - Customer user ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToCustomer(customerId, event, data) {
    if (!io) return;
    io.of('/customer').to(`user-${customerId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Emit event to technician
   * @param {string} technicianId - Technician user ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToTechnician(technicianId, event, data) {
    if (!io) return;
    io.of('/technician').to(`user-${technicianId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Emit event to supplier
   * @param {string} supplierId - Supplier user ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToSupplier(supplierId, event, data) {
    if (!io) return;
    io.of('/supplier').to(`user-${supplierId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Emit event to all admins
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToAdmins(event, data) {
    if (!io) return;
    io.of('/admin').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Emit event to all users in a booking
   * @param {Object} booking - Booking object with customerId and technicianId
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToBookingParties(booking, event, data) {
    if (!io) return;
    
    // Emit to customer
    if (booking.customerId) {
      this.emitToCustomer(booking.customerId, event, data);
    }
    
    // Emit to technician
    if (booking.technicianId) {
      this.emitToTechnician(booking.technicianId, event, data);
    }
  },

  /**
   * Broadcast job to technicians within radius
   * @param {Array} technicianIds - Array of technician IDs
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  broadcastToTechnicians(technicianIds, event, data) {
    if (!io) return;
    
    technicianIds.forEach(techId => {
      this.emitToTechnician(techId, event, data);
    });
  },

  /**
   * Emit notification to a user (customer or vendor) — يصل لـ /customer أو /technician حسب اتصال المستخدم
   * @param {string} userId - User ID
   * @param {Object} payload - { type, title, titleAr?, message, requestId?, offerId?, ... }
   */
  emitNotification(userId, payload) {
    if (!io || !userId) return;
    const data = { ...payload, timestamp: new Date().toISOString() };
    io.of('/customer').to(`user-${userId}`).emit('notification', data);
    io.of('/technician').to(`user-${userId}`).emit('notification', data);
  },

  /**
   * بعد اختيار العميل للعرض — إشعار الطرفين لفتح التتبع والشات
   * @param {string} bookingId - Booking ID
   * @param {Object} data - { customerId, driverId } (driverId = vendor userId)
   */
  emitBookingReady(bookingId, data) {
    if (!io) return;
    const payload = { bookingId, ...data, timestamp: new Date().toISOString() };
    if (data.customerId) {
      io.of('/customer').to(`user-${data.customerId}`).emit('booking_ready', payload);
    }
    if (data.driverId) {
      io.of('/technician').to(`user-${data.driverId}`).emit('booking_ready', payload);
    }
  },

  /**
   * بعد دفع الفاتورة — فتح التتبع والشات للعميل والورشة
   * @param {string} bookingId - Booking ID
   * @param {Object} data - { customerId, technicianId (vendor userId) }
   */
  emitInvoicePaid(bookingId, data) {
    if (!io) return;
    const payload = { bookingId, trackingAndChatEnabled: true, timestamp: new Date().toISOString() };
    if (data.customerId) {
      io.of('/customer').to(`user-${data.customerId}`).emit('invoice_paid', payload);
    }
    if (data.technicianId) {
      io.of('/technician').to(`user-${data.technicianId}`).emit('invoice_paid', payload);
    }
  },

  /**
   * بث طلب ونش جديد للوينشات القريبة (فيندورز)
   * @param {string[]} vendorUserIds - مصفوفة userId للفيندورز
   * @param {Object} data - بيانات الطلب للعرض الفوري
   */
  emitNewTowingRequestToWinches(vendorUserIds, data) {
    if (!io || !Array.isArray(vendorUserIds) || vendorUserIds.length === 0) return;
    const payload = { ...data, timestamp: new Date().toISOString() };
    vendorUserIds.forEach((userId) => {
      io.of('/technician').to(`user-${userId}`).emit('winch:new_request', payload);
    });
  },

  /**
   * بث طلب ورشة متنقلة للورش القريبة فقط (فيندورز) — يحدد الأقرب حسب المسافة
   * @param {Array<{ userId: string, distanceKm?: number }>} vendors - مصفوفة فيندورز (userId + مسافة اختيارية)
   * @param {Object} data - بيانات الطلب للعرض الفوري
   */
  emitNewMobileWorkshopRequestToVendors(vendors, data) {
    if (!io || !Array.isArray(vendors) || vendors.length === 0) return;
    const payload = { ...data, timestamp: new Date().toISOString() };
    vendors.forEach((v) => {
      const userId = typeof v === 'string' ? v : v.userId;
      if (!userId) return;
      const roomPayload = v.distanceKm != null ? { ...payload, distanceKm: v.distanceKm } : payload;
      io.of('/technician').to(`user-${userId}`).emit('mobile_workshop:new_request', roomPayload);
    });
  },
};
