const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./utils/logger/logger');
const prisma = require('./utils/database/prisma');

let io;
// In-memory last known driver location per booking (fallback when DB persistence fails)
const lastBookingLocation = new Map();

/**
 * Initialize Socket.io
 * @param {http.Server} server - HTTP server instance
 */
function init(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Auth: JWT from handshake (client sends socket.auth.token or query.token)
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId || decoded.id;
            socket.role = decoded.role || null;
            if (!socket.userId) return next(new Error('Invalid token'));
            next();
        } catch (err) {
            next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

        const emitCurrentBookingLocation = async (bookingId, technicianId, targetSocket = socket) => {
            if (!bookingId || !technicianId) return;

            let locationPayload = null;

            // 1) Try DB (source of truth when available)
            try {
                const latestLocation = await prisma.technicianLocation.findFirst({
                    where: {
                        bookingId,
                        technicianId,
                        status: { not: 'OFFLINE' }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });

                if (latestLocation) {
                    locationPayload = {
                        bookingId,
                        latitude: Number(latestLocation.latitude),
                        longitude: Number(latestLocation.longitude),
                        heading: latestLocation.heading != null ? Number(latestLocation.heading) : null,
                        speed: latestLocation.speed != null ? Number(latestLocation.speed) : null,
                        timestamp: latestLocation.createdAt
                    };
                }
            } catch (_) {
                // ignore DB errors, fallback to memory
            }

            // 2) Fallback to in-memory last location (when DB insert is not available)
            if (!locationPayload) {
                const mem = lastBookingLocation.get(bookingId);
                if (mem && mem.technicianId === technicianId) {
                    locationPayload = {
                        bookingId,
                        latitude: Number(mem.latitude),
                        longitude: Number(mem.longitude),
                        heading: mem.heading != null ? Number(mem.heading) : null,
                        speed: mem.speed != null ? Number(mem.speed) : null,
                        timestamp: mem.timestamp
                    };
                }
            }

            if (!locationPayload) return;

            targetSocket.emit('booking:current_location', locationPayload);
            targetSocket.emit('winch:location_update', locationPayload);
            targetSocket.emit('technician:location_update', locationPayload);
        };

        // ——— حجز الوينش: غرفة مشتركة بين العميل وفيندور الوينش ———

        // العميل ينضم لغرفة الحجز — مسموح فقط بعد دفع الفاتورة (حتى يتفتح السوكت للتتبع والمحادثة)
        socket.on('customer:join_booking', async (bookingId) => {
            if (!bookingId) return socket.emit('error', { message: 'bookingId required' });
            try {
                const booking = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    select: {
                        customerId: true,
                        technicianId: true,
                        invoice: { select: { status: true } }
                    }
                });
                if (!booking) return socket.emit('error', { message: 'Booking not found' });
                if (booking.customerId !== socket.userId) {
                    return socket.emit('error', { message: 'Not authorized for this booking' });
                }
                if (booking.invoice?.status !== 'PAID') {
                    return socket.emit('error', { message: 'Payment required before joining. Pay the invoice first.', code: 'PAYMENT_REQUIRED' });
                }
                socket.join(`booking:${bookingId}`);
                logger.info(`Customer ${socket.userId} joined booking room: ${bookingId}`);
                socket.emit('customer:joined', { bookingId, message: 'Joined booking room for tracking and chat' });
                await emitCurrentBookingLocation(bookingId, booking.technicianId);
            } catch (err) {
                socket.emit('error', { message: err.message || 'Failed to join booking' });
            }
        });

        // السائق (فيندور الوينش/الفني) ينضم لنفس الغرفة — بعد دفع العميل فقط
        socket.on('driver:join_booking', async (bookingId) => {
            if (!bookingId) return socket.emit('error', { message: 'bookingId required' });
            try {
                const booking = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    select: {
                        customerId: true,
                        technicianId: true,
                        invoice: { select: { status: true } }
                    }
                });
                if (!booking) return socket.emit('error', { message: 'Booking not found' });
                if (booking.technicianId !== socket.userId) {
                    return socket.emit('error', { message: 'Not authorized for this booking' });
                }
                if (booking.invoice?.status !== 'PAID') {
                    return socket.emit('error', { message: 'Customer must pay first. Socket opens after payment.', code: 'PAYMENT_REQUIRED' });
                }
                socket.join(`booking:${bookingId}`);
                logger.info(`Driver ${socket.userId} joined booking room: ${bookingId}`);
                socket.emit('driver:joined', { bookingId, message: 'Joined booking room for tracking and chat' });
            } catch (err) {
                socket.emit('error', { message: err.message || 'Failed to join booking' });
            }
        });

        socket.on('customer:leave_booking', (bookingId) => {
            socket.leave(`booking:${bookingId}`);
            logger.info(`Customer left booking room: ${bookingId}`);
        });

        socket.on('driver:leave_booking', (bookingId) => {
            socket.leave(`booking:${bookingId}`);
            logger.info(`Driver left booking room: ${bookingId}`);
        });

        // العميل يطلب آخر موقع محفوظ حاليًا يدويًا بعد الانضمام
        socket.on('booking:get_current_location', async (bookingId) => {
            if (!bookingId) return socket.emit('error', { message: 'bookingId required' });
            try {
                const booking = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    select: {
                        customerId: true,
                        technicianId: true,
                        invoice: { select: { status: true } }
                    }
                });

                if (!booking) {
                    return socket.emit('error', { message: 'Booking not found' });
                }

                const isCustomer = booking.customerId === socket.userId;
                const isDriver = booking.technicianId === socket.userId;

                if (!isCustomer && !isDriver) {
                    return socket.emit('error', { message: 'Not authorized for this booking' });
                }

                if (booking.invoice?.status !== 'PAID') {
                    return socket.emit('error', {
                        message: 'Payment required before tracking.',
                        code: 'PAYMENT_REQUIRED'
                    });
                }

                await emitCurrentBookingLocation(bookingId, booking.technicianId);
            } catch (err) {
                socket.emit('error', { message: err.message || 'Failed to get current location' });
            }
        });

        // تتبع الموقع: السائق يرسل موقعه → يُبث للعميل ويُحفظ
        socket.on('driver:location', async (payload) => {
            const { bookingId, latitude, longitude, heading, speed } = payload || {};
            if (!bookingId || latitude == null || longitude == null) {
                return socket.emit('error', { message: 'bookingId, latitude, longitude required' });
            }
            try {
                const booking = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    select: {
                        technicianId: true,
                        invoice: { select: { status: true } }
                    }
                });
                if (!booking || booking.technicianId !== socket.userId) {
                    return socket.emit('error', { message: 'Not authorized' });
                }
                if (booking.invoice?.status !== 'PAID') {
                    return socket.emit('error', {
                        message: 'Customer must pay first. Tracking opens after payment.',
                        code: 'PAYMENT_REQUIRED'
                    });
                }
                const locationData = {
                    bookingId,
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    heading: heading != null ? Number(heading) : null,
                    speed: speed != null ? Number(speed) : null,
                    timestamp: new Date().toISOString()
                };
                // Keep last location in memory for snapshot requests
                lastBookingLocation.set(bookingId, { ...locationData, technicianId: socket.userId });
                io.to(`booking:${bookingId}`).emit('winch:location_update', locationData);
                io.to(`booking:${bookingId}`).emit('technician:location_update', locationData);
                try {
                    await prisma.technicianLocation.create({
                        data: {
                            technicianId: socket.userId,
                            bookingId,
                            latitude: locationData.latitude,
                            longitude: locationData.longitude,
                            heading: locationData.heading,
                            speed: locationData.speed,
                            status: 'ON_JOB'
                        }
                    });
                } catch (_) { /* ignore duplicate or schema mismatch */ }
            } catch (err) {
                socket.emit('error', { message: err.message || 'Failed to send location' });
            }
        });

        // محادثة داخل الحجز: العميل أو السائق/الفيندور يرسل رسالة → تُحفظ وتُبث للطرف الآخر
        socket.on('booking:message', async (payload) => {
            const { bookingId, text } = payload || {};
            if (!bookingId || !text || typeof text !== 'string') {
                return socket.emit('error', { message: 'bookingId and text required' });
            }
            try {
                const booking = await prisma.booking.findUnique({
                    where: { id: bookingId },
                    select: {
                        customerId: true,
                        technicianId: true,
                        chatRoom: { select: { id: true } },
                        mobileWorkshop: { select: { vendor: { select: { userId: true } } } }
                    }
                });
                if (!booking) return socket.emit('error', { message: 'Booking not found' });
                const vendorUserId = booking.mobileWorkshop?.vendor?.userId || null;
                const isCustomer = booking.customerId === socket.userId;
                const isDriver = booking.technicianId === socket.userId || vendorUserId === socket.userId;
                if (!isCustomer && !isDriver) {
                    return socket.emit('error', { message: 'Not authorized for this booking' });
                }
                const content = text.trim().slice(0, 2000);
                const msg = {
                    bookingId,
                    from: isCustomer ? 'customer' : 'driver',
                    userId: socket.userId,
                    text: content,
                    timestamp: new Date().toISOString()
                };
                if (booking.chatRoom?.id) {
                    await prisma.chatMessage.create({
                        data: { roomId: booking.chatRoom.id, userId: socket.userId, content }
                    });
                }
                io.to(`booking:${bookingId}`).emit('booking:message', msg);
            } catch (err) {
                socket.emit('error', { message: err.message || 'Failed to send message' });
            }
        });

        // ——— باقي الأحداث (إشعارات، فنيين، فيدباك) ———
        socket.on('technician:join', (technicianId) => {
            if (technicianId !== socket.userId) return;
            socket.join(`technician:${technicianId}`);
            logger.info(`Technician joined room: ${technicianId}`);
            socket.emit('technician:joined', { technicianId, message: 'Connected for location updates' });
        });

        socket.on('technician:leave', (technicianId) => {
            socket.leave(`technician:${technicianId}`);
        });

        socket.on('feedback:join', (feedbackId) => {
            socket.join(`feedback:${feedbackId}`);
            socket.emit('feedback:joined', { feedbackId, message: 'Connected to feedback ticket' });
        });

        socket.on('feedback:leave', (feedbackId) => {
            socket.leave(`feedback:${feedbackId}`);
        });

        socket.on('user:join', (userId) => {
            if (userId !== socket.userId) return;
            socket.join(`user:${userId}`);
            logger.info(`User joined notification room: ${userId}`);
        });

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });

        socket.on('error', (error) => {
            logger.error('Socket error:', error);
        });
    });

    logger.info('✅ Socket.io initialized (booking rooms + tracking + chat)');
    return io;
}

/**
 * Get Socket.io instance
 * @returns {Server} Socket.io server instance
 */
function getIo() {
    if (!io) {
        throw new Error('Socket.io not initialized. Call init() first.');
    }
    return io;
}

/**
 * Emit notification to specific user
 * @param {string} userId - User ID
 * @param {object} notification - Notification data
 */
function emitNotification(userId, notification) {
    if (!io) {
        // logger.warn('Socket.io not initialized - cannot emit notification');
        return;
    }
    io.to(`user:${userId}`).emit('notification:new', notification);
    logger.debug(`Emitted notification to user: ${userId}`);
}

/**
 * Emit location update to customer
 * @param {string} bookingId - Booking ID
 * @param {object} locationData - Location and ETA data
 */
function emitLocationUpdate(bookingId, locationData) {
    if (!io) {
        logger.warn('Socket.io not initialized - cannot emit location update');
        return;
    }

    io.to(`booking:${bookingId}`).emit('technician:location_update', locationData);
    logger.debug(`Emitted location update for booking: ${bookingId}`);
}

/**
 * Emit booking status change
 * @param {string} bookingId - Booking ID
 * @param {object} statusData - Status update data
 */
function emitBookingStatusChange(bookingId, statusData) {
    if (!io) {
        logger.warn('Socket.io not initialized - cannot emit status change');
        return;
    }

    io.to(`booking:${bookingId}`).emit('booking:status_changed', statusData);
    logger.debug(`Emitted status change for booking: ${bookingId}`);
}

/**
 * Emit technician arrival notification
 * @param {string} bookingId - Booking ID
 * @param {string} location - 'pickup' or 'destination'
 */
function emitTechnicianArrival(bookingId, location) {
    if (!io) return;
    io.to(`booking:${bookingId}`).emit('technician:arrived', { location });
    logger.info(`Technician arrived at ${location} for booking: ${bookingId}`);
}

/**
 * عند إنشاء طلب سحب — إرسال فوري (push) للوينشات القريبة حتى يظهر الطلب بدون polling
 * @param {string[]} vendorUserIds - مصفوفة userId لكل فيندور ونش قريب
 * @param {object} payload - { broadcastId, bookingId, pickupLocation, destinationLocation, distanceKm, urgency, vehicleCondition, expiresAt }
 */
function emitNewTowingRequestToWinches(vendorUserIds, payload) {
    if (!io || !Array.isArray(vendorUserIds) || vendorUserIds.length === 0) return;
    const data = {
        event: 'winch:new_request',
        message: 'New towing request near you',
        messageAr: 'طلب سحب جديد قريب منك',
        ...payload
    };
    for (const userId of vendorUserIds) {
        if (userId) io.to(`user:${userId}`).emit('winch:new_request', data);
    }
    logger.debug(`Emitted new towing request to ${vendorUserIds.length} winch(es)`);
}

/**
 * بعد قبول العميل لعرض الوينش — إشعار الطرفين بالانضمام لغرفة الحجز (تتبع + محادثة)
 * @param {string} bookingId - Booking ID
 * @param {object} payload - { customerId, driverId (technicianId) }
 */
function emitBookingReady(bookingId, payload = {}) {
    if (!io) return;
    io.to(`booking:${bookingId}`).emit('booking:ready', {
        bookingId,
        message: 'Join this room for tracking and chat',
        messageAr: 'انضم لهذه الغرفة للتتبع والمحادثة',
        ...payload
    });
    if (payload.customerId) io.to(`user:${payload.customerId}`).emit('booking:ready', { bookingId, ...payload });
    if (payload.driverId) io.to(`user:${payload.driverId}`).emit('booking:ready', { bookingId, ...payload });
    logger.debug(`Emitted booking:ready for ${bookingId}`);
}

/**
 * Emit invoice paid event then open booking room flow (chat + tracking)
 * @param {string} bookingId
 * @param {object} payload - { customerId, technicianId }
 */
function emitInvoicePaid(bookingId, payload = {}) {
    if (!io) return;
    const data = {
        bookingId,
        message: 'Invoice paid. Chat and tracking are now enabled.',
        messageAr: 'تم دفع الفاتورة. تم تفعيل المحادثة والتتبع.',
        ...payload
    };

    // Legacy/general event for clients listening to invoice status
    io.to(`booking:${bookingId}`).emit('invoice:paid', data);
    if (payload.customerId) io.to(`user:${payload.customerId}`).emit('invoice:paid', data);
    if (payload.technicianId) io.to(`user:${payload.technicianId}`).emit('invoice:paid', data);

    // Primary event used by booking flows (towing + mobile workshop)
    emitBookingReady(bookingId, {
        customerId: payload.customerId,
        driverId: payload.technicianId,
    });
}

/**
 * Emit new reply to feedback ticket subscribers
 * @param {string} feedbackId - Feedback ID
 * @param {object} replyData - Reply details
 */
function emitFeedbackReply(feedbackId, replyData) {
    if (!io) {
        logger.warn('Socket.io not initialized - cannot emit feedback reply');
        return;
    }

    io.to(`feedback:${feedbackId}`).emit('feedback:new_reply', replyData);
    logger.debug(`Emitted new reply for feedback: ${feedbackId}`);
}

module.exports = {
    init,
    getIo,
    emitNotification,
    emitLocationUpdate,
    emitBookingStatusChange,
    emitTechnicianArrival,
    emitNewTowingRequestToWinches,
    emitBookingReady,
    emitInvoicePaid,
    emitFeedbackReply
};
