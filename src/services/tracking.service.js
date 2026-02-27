const prisma = require('../utils/database/prisma');
const osrmService = require('./osrm.service');
const logger = require('../utils/logger/logger');
const { AppError } = require('../api/middlewares/error.middleware');

/**
 * Real-time Location Tracking Service
 * Handles technician GPS tracking for towing jobs
 */

class TrackingService {
    /**
     * Update technician's current location
     * @param {string} technicianId - Technician user ID
     * @param {object} locationData - GPS location data
     * @returns {Promise<object>} Updated location and ETA if on job
     */
    async updateTechnicianLocation(technicianId, locationData) {
        const { latitude, longitude, heading, speed, accuracy, bookingId } = locationData;

        // Validate coordinates
        if (!this.isValidCoordinate(latitude, longitude)) {
            throw new AppError('Invalid GPS coordinates', 400, 'INVALID_COORDINATES');
        }

        // Determine status based on whether technician is on a job
        const status = bookingId ? 'ON_JOB' : 'ONLINE';

        // Store location in database
        const location = await prisma.technicianLocation.create({
            data: {
                technicianId,
                latitude,
                longitude,
                heading,
                speed,
                accuracy,
                bookingId,
                status
            }
        });

        logger.info('Technician location updated', {
            technicianId,
            bookingId,
            latitude,
            longitude
        });

        // If on a job, calculate ETA and emit to customer
        let eta = null;
        if (bookingId) {
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                select: {
                    pickupLat: true,
                    pickupLng: true,
                    destinationLat: true,
                    destinationLng: true,
                    status: true
                }
            });

            if (booking) {
                // Calculate ETA to pickup or destination based on booking status
                let targetLat, targetLng;

                if (booking.status === 'TECHNICIAN_EN_ROUTE' || booking.status === 'ON_THE_WAY') {
                    // Going to pickup/customer location
                    targetLat = booking.pickupLat;
                    targetLng = booking.pickupLng;
                } else if (booking.status === 'IN_PROGRESS') {
                    // Going to destination
                    targetLat = booking.destinationLat;
                    targetLng = booking.destinationLng;
                }

                if (targetLat && targetLng) {
                    eta = await this.calculateETA(latitude, longitude, targetLat, targetLng);
                }
            }
        }

        return {
            location,
            eta
        };
    }

    /**
     * Get technician's current location for tracking
     * @param {string} bookingId - Booking ID
     * @returns {Promise<object>} Technician location and booking details
     */
    async getTrackingInfo(bookingId) {
        // Get booking with technician info
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                technician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        phone: true,
                        profile: {
                            select: {
                                rating: true
                            }
                        }
                    }
                },
                vehicle: {
                    select: {
                        id: true,
                        plateNumber: true,
                        color: true,
                        vehicleModel: {
                            select: {
                                nameAr: true,
                                nameEn: true,
                                brand: {
                                    select: {
                                        nameAr: true,
                                        nameEn: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!booking) {
            throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
        }

        if (!booking.technicianId) {
            throw new AppError('No technician assigned to this booking', 400, 'NO_TECHNICIAN');
        }

        // Get latest location for technician
        const location = await prisma.technicianLocation.findFirst({
            where: {
                technicianId: booking.technicianId,
                status: {
                    not: 'OFFLINE'
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Calculate ETA
        let eta = null;
        if (location) {
            let targetLat, targetLng;

            if (booking.status === 'TECHNICIAN_EN_ROUTE' || booking.status === 'ON_THE_WAY') {
                targetLat = booking.pickupLat;
                targetLng = booking.pickupLng;
            } else if (booking.status === 'IN_PROGRESS') {
                targetLat = booking.destinationLat;
                targetLng = booking.destinationLng;
            }

            if (targetLat && targetLng) {
                eta = await this.calculateETA(
                    location.latitude,
                    location.longitude,
                    targetLat,
                    targetLng
                );
            }
        }

        return {
            booking: {
                id: booking.id,
                bookingNumber: booking.bookingNumber,
                status: booking.status,
                pickupLocation: {
                    latitude: booking.pickupLat,
                    longitude: booking.pickupLng,
                    address: booking.pickupAddress
                },
                destinationLocation: {
                    latitude: booking.destinationLat,
                    longitude: booking.destinationLng,
                    address: booking.destinationAddress
                }
            },
            technician: {
                id: booking.technician.id,
                firstName: booking.technician.firstName,
                lastName: booking.technician.lastName,
                avatar: booking.technician.avatar,
                phone: booking.technician.phone,
                rating: booking.technician.profile?.rating || null,
                currentLocation: location ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    heading: location.heading,
                    speed: location.speed,
                    lastUpdated: location.createdAt
                } : null
            },
            eta: eta
        };
    }

    /**
     * Get location history for a booking
     * @param {string} bookingId - Booking ID
     * @param {object} options - Query options (startTime, endTime, limit)
     * @returns {Promise<Array>} Location history points
     */
    async getLocationHistory(bookingId, options = {}) {
        const { startTime, endTime, limit = 100 } = options;

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            select: { technicianId: true }
        });

        if (!booking || !booking.technicianId) {
            throw new AppError('Booking or technician not found', 404, 'BOOKING_NOT_FOUND');
        }

        const whereClause = {
            bookingId: bookingId,
            technicianId: booking.technicianId
        };

        if (startTime || endTime) {
            whereClause.createdAt = {};
            if (startTime) whereClause.createdAt.gte = new Date(startTime);
            if (endTime) whereClause.createdAt.lte = new Date(endTime);
        }

        const locations = await prisma.technicianLocation.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'asc'
            },
            take: limit,
            select: {
                latitude: true,
                longitude: true,
                heading: true,
                speed: true,
                createdAt: true
            }
        });

        return {
            bookingId,
            points: locations.map(loc => ({
                latitude: loc.latitude,
                longitude: loc.longitude,
                heading: loc.heading,
                speed: loc.speed,
                timestamp: loc.createdAt
            }))
        };
    }

    /**
     * Calculate ETA using OSRM
     * @param {number} fromLat - Current latitude
     * @param {number} fromLng - Current longitude
     * @param {number} toLat - Target latitude
     * @param {number} toLng - Target longitude
     * @returns {Promise<object>} Distance and duration
     */
    async calculateETA(fromLat, fromLng, toLat, toLng) {
        try {
            const route = await osrmService.calculateRouteWithFallback(
                fromLat,
                fromLng,
                toLat,
                toLng
            );

            return {
                distanceKm: route.distance,
                durationMinutes: route.duration,
                method: route.method
            };
        } catch (error) {
            logger.warn('ETA calculation failed', { error: error.message });
            return null;
        }
    }

    /**
     * Validate GPS coordinates (Saudi Arabia bounds)
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {boolean} Is valid
     */
    isValidCoordinate(lat, lng) {
        // Saudi Arabia approximate bounds
        const MIN_LAT = 16.0;
        const MAX_LAT = 33.0;
        const MIN_LNG = 34.0;
        const MAX_LNG = 56.0;

        return (
            lat >= MIN_LAT && lat <= MAX_LAT &&
            lng >= MIN_LNG && lng <= MAX_LNG
        );
    }
}

module.exports = new TrackingService();
