const { Server } = require('socket.io');
const logger = require('./utils/logger/logger');

let io;

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

    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}`);

        // Customer joins booking room for tracking updates
        socket.on('customer:join_booking', (bookingId) => {
            socket.join(`booking:${bookingId}`);
            logger.info(`Customer joined booking room: ${bookingId}`);

            socket.emit('customer:joined', {
                bookingId,
                message: 'Successfully joined booking tracking'
            });
        });

        // Customer leaves booking room
        socket.on('customer:leave_booking', (bookingId) => {
            socket.leave(`booking:${bookingId}`);
            logger.info(`Customer left booking room: ${bookingId}`);
        });

        // Technician joins their own room
        socket.on('technician:join', (technicianId) => {
            socket.join(`technician:${technicianId}`);
            logger.info(`Technician joined room: ${technicianId}`);

            socket.emit('technician:joined', {
                technicianId,
                message: 'Successfully connected for location updates'
            });
        });

        // Technician leaves room
        socket.on('technician:leave', (technicianId) => {
            socket.leave(`technician:${technicianId}`);
            logger.info(`Technician left room: ${technicianId}`);
        });

        // Feedback Chat: Join ticket room
        socket.on('feedback:join', (feedbackId) => {
            socket.join(`feedback:${feedbackId}`);
            logger.info(`User joined feedback ticket room: ${feedbackId}`);

            socket.emit('feedback:joined', {
                feedbackId,
                message: 'Connected to feedback ticket real-time support'
            });
        });

        // Feedback Chat: Leave ticket room
        socket.on('feedback:leave', (feedbackId) => {
            socket.leave(`feedback:${feedbackId}`);
            logger.info(`User left feedback ticket room: ${feedbackId}`);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });

        // Handle errors
        socket.on('error', (error) => {
            logger.error('Socket error:', error);
        });
    });

    logger.info('✅ Socket.io initialized successfully');
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
    if (!io) {
        logger.warn('Socket.io not initialized - cannot emit arrival notification');
        return;
    }

    io.to(`booking:${bookingId}`).emit('technician:arrived', { location });
    logger.info(`Technician arrived at ${location} for booking: ${bookingId}`);
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
    emitLocationUpdate,
    emitBookingStatusChange,
    emitTechnicianArrival,
    emitFeedbackReply
};
