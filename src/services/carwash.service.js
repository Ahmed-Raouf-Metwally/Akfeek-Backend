const prisma = require('../utils/database/prisma');
const {
    calculateETA,
    calculateDistance,
    findNearbyTechnicians
} = require('../utils/towing'); // Reusing utility functions
const {
    getSystemSetting
} = require('../utils/systemSettings');
const {
    AppError
} = require('../api/middlewares/error.middleware');
const osrmService = require('./osrm.service');

class CarWashService {
    /**
     * Create car wash request and broadcast to nearby technicians
     */
    async createWashRequest(customerId, data) {
        const {
            vehicleId,
            location, // { latitude, longitude, address }
            serviceType, // "INTERNAL", "EXTERNAL", "FULL"
            notes,
            estimatedBudget
        } = data;

        // Validate vehicle ownership
        const vehicle = await prisma.userVehicle.findFirst({
            where: {
                id: vehicleId,
                userId: customerId
            }
        });

        if (!vehicle) {
            throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
        }

        // Get Mobile Car Wash service
        // We look for the service we seeded
        const washService = await prisma.service.findFirst({
            where: {
                name: 'Mobile Car Wash',
                type: 'EMERGENCY' // Using EMERGENCY type for Broadcast flow
            }
        });

        if (!washService) {
            throw new AppError('Mobile Car Wash service not available', 500, 'SERVICE_ERROR');
        }

        // Create booking
        const booking = await prisma.booking.create({
            data: {
                bookingNumber: await this.generateBookingNumber(),
                customerId,
                vehicleId,
                status: 'BROADCASTING',
                pickupLat: location.latitude,
                pickupLng: location.longitude,
                pickupAddress: location.address,
                // Destination is same as pickup for car wash usually, or null. 
                // Schema might require destination fields or allow nulls. 
                // Checking schema... destinationLat/Lng are optional floats? 
                // Actually towing service sets them. 
                // For car wash, destination is same as pickup (mobile service).
                destinationLat: location.latitude,
                destinationLng: location.longitude,
                destinationAddress: location.address,
                totalPrice: 0, // Pending offers
                notes,
                metadata: {
                    serviceType,
                    estimatedBudget,
                    serviceId: washService.id
                }
            }
        });

        // Create broadcast
        const broadcastTimeout = await getSystemSetting('CARWASH_BROADCAST_TIMEOUT', 15);
        const expiresAt = new Date(Date.now() + broadcastTimeout * 60000);

        const broadcast = await prisma.jobBroadcast.create({
            data: {
                bookingId: booking.id,
                customerId,
                latitude: location.latitude,
                longitude: location.longitude,
                locationAddress: location.address,
                radiusKm: await getSystemSetting('CARWASH_SEARCH_RADIUS', 10),
                broadcastUntil: expiresAt,
                description: `Car Wash Request: ${serviceType}` + (notes ? ` - ${notes}` : ''),
                urgency: 'NORMAL',
                estimatedBudget,
                status: 'BROADCASTING'
            }
        });

        return {
            bookingId: booking.id,
            broadcastId: broadcast.id,
            status: 'BROADCASTING',
            broadcastUntil: expiresAt
        };
    }

    /**
     * Get offers for a broadcast
     */
    async getOffers(broadcastId, customerId) {
        const broadcast = await prisma.jobBroadcast.findUnique({
            where: {
                id: broadcastId
            },
            include: {
                booking: {
                    select: {
                        id: true,
                        customerId: true,
                        status: true
                    }
                },
                offers: {
                    include: {
                        technician: {
                            include: {
                                profile: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        avatar: true,
                                        currentLat: true,
                                        currentLng: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        bidAmount: 'asc'
                    }
                }
            }
        });

        if (!broadcast) {
            throw new AppError('Broadcast not found', 404, 'BROADCAST_NOT_FOUND');
        }

        if (broadcast.booking.customerId !== customerId) {
            throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
        }

        // Calculate ETA for each offer
        const offersWithETA = await Promise.all(
            broadcast.offers.map(async (offer) => {
                const eta = await calculateETA(
                    offer.technician.profile.currentLat || 0,
                    offer.technician.profile.currentLng || 0,
                    broadcast.latitude,
                    broadcast.longitude
                );

                return {
                    id: offer.id,
                    technician: {
                        id: offer.technicianId,
                        name: `${offer.technician.profile.firstName} ${offer.technician.profile.lastName}`,
                        avatar: offer.technician.profile.avatar,
                        rating: 4.8, // Mock rating
                        distance: eta.distance,
                        estimatedArrival: eta.etaMinutes
                    },
                    bidAmount: offer.bidAmount,
                    message: offer.message,
                    status: offer.status,    // Note: Schema might use isSelected, need to verify if status exists on Offer
                    // Actually previous fix removed status from CREATE, but verifying schema...
                    // JobOffer schema has NO status field?? 
                    // Let's check Schema again quickly. 
                    // JobOffer: isSelected Boolean @default(false). 
                    // So we should return 'ACCEPTED' if isSelected is true, else 'PENDING'?
                    // Or maybe we map isSelected to a status string for frontend.
                    isSelected: offer.isSelected,
                    createdAt: offer.createdAt
                };
            })
        );

        return {
            broadcast: {
                id: broadcast.id,
                status: broadcast.status,
                location: {
                    latitude: broadcast.latitude,
                    longitude: broadcast.longitude,
                    address: broadcast.locationAddress
                },
                expiresAt: broadcast.broadcastUntil
            },
            offers: offersWithETA.map(o => ({
                ...o,
                status: o.isSelected ? 'ACCEPTED' : 'PENDING' // API contract mapping
            }))
        };
    }

    /**
     * Accept an offer
     */
    async acceptOffer(broadcastId, offerId, customerId) {
        const broadcast = await prisma.jobBroadcast.findUnique({
            where: { id: broadcastId },
            include: { booking: true }
        });

        if (!broadcast) throw new AppError('Broadcast not found', 404, 'BROADCAST_NOT_FOUND');
        if (broadcast.booking.customerId !== customerId) throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
        if (broadcast.status !== 'BROADCASTING' && broadcast.status !== 'OFFERS_RECEIVED' && broadcast.status !== 'TECHNICIAN_SELECTED') throw new AppError('Broadcast is not active', 400, 'INVALID_STATUS');

        const offer = await prisma.jobOffer.findFirst({
            where: { id: offerId, broadcastId },
            include: { technician: { include: { profile: true } } }
        });

        if (!offer) throw new AppError('Offer not found', 404, 'OFFER_NOT_FOUND');

        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // Mark offer selected
            await tx.jobOffer.update({
                where: { id: offerId },
                data: { isSelected: true }
            });

            // Update broadcast status
            await tx.jobBroadcast.update({
                where: { id: broadcastId },
                data: { status: 'TECHNICIAN_SELECTED' }
            });

            // Update booking
            const updatedBooking = await tx.booking.update({
                where: { id: broadcast.booking.id },
                data: {
                    technicianId: offer.technicianId,
                    status: 'TECHNICIAN_ASSIGNED',
                    totalPrice: offer.bidAmount,
                    subtotal: offer.bidAmount // Assuming flat rate for now
                    // acceptedAt removed as it's not in schema
                },
                include: {
                    technician: { include: { profile: true } }
                }
            });

            return updatedBooking;
        });

        return {
            booking: {
                id: result.id,
                bookingNumber: result.bookingNumber,
                status: result.status,
                technician: {
                    id: result.technician.id,
                    name: `${result.technician.profile.firstName} ${result.technician.profile.lastName}`,
                    phone: result.technician.phone,
                    avatar: result.technician.profile.avatar
                },
                agreedPrice: result.agreedPrice
            }
        };
    }

    async generateBookingNumber() {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        const count = await prisma.booking.count({
            where: { createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) } }
        });
        return `WASH-${dateStr}-${String(count + 1).padStart(3, '0')}`;
    }
}

module.exports = new CarWashService();
