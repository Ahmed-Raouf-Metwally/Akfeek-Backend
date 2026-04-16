const trackingService = require('../../services/tracking.service');
const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');
const socketIo = require('../../socket');

/**
 * Tracking Controller
 * Handles real-time location tracking endpoints
 */

/**
 * Update technician location (called by technician app)
 */
exports.updateLocation = async (req, res, next) => {
    try {
        const technicianId = req.user.id;
        const locationData = req.body;

        if (locationData.bookingId) {
            const booking = await prisma.booking.findUnique({
                where: { id: locationData.bookingId },
                select: {
                    technicianId: true,
                    invoice: { select: { status: true } }
                }
            });

            if (!booking || booking.technicianId !== technicianId) {
                throw new AppError('Not authorized for this booking', 403, 'FORBIDDEN');
            }
            if (booking.invoice?.status !== 'PAID') {
                throw new AppError('Customer must pay first. Tracking opens after payment.', 400, 'PAYMENT_REQUIRED');
            }
        }

        const result = await trackingService.updateTechnicianLocation(technicianId, locationData);

        // Emit Socket.io event to customer if on job
        if (locationData.bookingId && result.eta) {
            const io = socketIo.getIo();
            const payload = {
                bookingId: locationData.bookingId,
                location: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    heading: locationData.heading,
                    speed: locationData.speed,
                    timestamp: new Date()
                },
                eta: result.eta
            };
            io.to(`booking:${locationData.bookingId}`).emit('technician:location_update', payload);
            io.to(`booking:${locationData.bookingId}`).emit('winch:location_update', payload);
        }

        res.json({
            success: true,
            message: 'Location updated successfully',
            messageAr: 'تم تحديث الموقع بنجاح',
            data: {
                location: result.location,
                eta: result.eta
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get tracking info for customer
 */
exports.getTrackingInfo = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const customerId = req.user.id;

        // Verify customer owns this booking
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            select: {
                customerId: true,
                invoice: { select: { status: true } }
            }
        });

        if (!booking) {
            throw new AppError('Booking not found', 404, 'NOT_FOUND');
        }

        if (booking.customerId !== customerId) {
            throw new AppError('Unauthorized', 403, 'FORBIDDEN');
        }
        if (booking.invoice?.status !== 'PAID') {
            throw new AppError('Payment required before tracking', 400, 'PAYMENT_REQUIRED');
        }

        const trackingInfo = await trackingService.getTrackingInfo(bookingId);

        res.json({
            success: true,
            message: 'Tracking info retrieved',
            messageAr: 'تم الحصول على معلومات التتبع',
            data: trackingInfo
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get location history
 */
exports.getLocationHistory = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const { startTime, endTime, limit } = req.query;

        const history = await trackingService.getLocationHistory(bookingId, {
            startTime,
            endTime,
            limit: limit ? parseInt(limit) : undefined
        });

        res.json({
            success: true,
            message: 'Location history retrieved',
            messageAr: 'تم الحصول على سجل المواقع',
            data: history
        });
    } catch (error) {
        next(error);
    }
};
