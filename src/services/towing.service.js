const prisma = require('../utils/database/prisma');
const {
    calculateDistance,
    calculateETA,
    calculateTowingPrice,
    findNearbyTechnicians
} = require('../utils/towing');
const { getSystemSetting } = require('../utils/systemSettings');
const { AppError } = require('../api/middlewares/error.middleware');
const osrmService = require('./osrm.service');

class TowingService {
    /**
     * Create towing request and broadcast to nearby technicians
     */
    async createTowingRequest(customerId, data) {
        const {
            vehicleId,
            pickupLocation,
            destinationLocation,
            vehicleCondition,
            urgency = 'NORMAL',
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

        // Get towing service
        const towingService = await prisma.service.findFirst({
            where: {
                type: 'EMERGENCY',
                category: 'EMERGENCY',
                nameAr: 'خدمة السحب'
            }
        });

        if (!towingService) {
            throw new AppError('Towing service not configured', 500, 'SERVICE_ERROR');
        }


        // Calculate distance using OSRM (accurate road distance)
        const tripDistance = await osrmService.calculateTripDistance(
            pickupLocation.latitude,
            pickupLocation.longitude,
            destinationLocation.latitude,
            destinationLocation.longitude
        );

        const pricing = await calculateTowingPrice(tripDistance.distance, urgency);

        // Create booking
        const booking = await prisma.booking.create({
            data: {
                bookingNumber: await this.generateBookingNumber(),
                customerId,
                vehicleId,
                status: 'PENDING_BROADCAST',
                pickupLat: pickupLocation.latitude,
                pickupLng: pickupLocation.longitude,
                pickupAddress: pickupLocation.address,
                destinationLat: destinationLocation.latitude,
                destinationLng: destinationLocation.longitude,
                destinationAddress: destinationLocation.address,
                estimatedPrice: pricing.finalPrice,
                notes,
                urgency,
                metadata: {
                    vehicleCondition,
                    estimatedBudget,
                    distance: tripDistance.distance,
                    estimatedDuration: tripDistance.duration,
                    routingMethod: tripDistance.method,
                    pricing
                }
            }
        });

        // Find nearby technicians
        const nearbyTechs = await findNearbyTechnicians(
            pickupLocation.latitude,
            pickupLocation.longitude
        );

        if (nearbyTechs.length === 0) {
            await prisma.booking.update({
                where: { id: booking.id },
                data: { status: 'NO_TECHNICIANS_AVAILABLE' }
            });

            throw new AppError(
                'No technicians available in your area',
                404,
                'NO_TECHNICIANS'
            );
        }

        // Create broadcast
        const broadcastTimeout = await getSystemSetting('TOWING_BROADCAST_TIMEOUT', 15);
        const expiresAt = new Date(Date.now() + broadcastTimeout * 60000);

        const broadcast = await prisma.jobBroadcast.create({
            data: {
                bookingId: booking.id,
                serviceId: towingService.id,
                pickupLat: pickupLocation.latitude,
                pickupLng: pickupLocation.longitude,
                pickupAddress: pickupLocation.address,
                destinationLat: destinationLocation.latitude,
                destinationLng: destinationLocation.longitude,
                destinationAddress: destinationLocation.address,
                radius: await getSystemSetting('TOWING_SEARCH_RADIUS', 10),
                status: 'BROADCASTING',
                expiresAt,
                metadata: {
                    vehicleInfo: vehicle,
                    vehicleCondition,
                    distance: tripDistance.distance,
                    estimatedDuration: tripDistance.duration,
                    estimatedPrice: pricing.finalPrice,
                    urgency,
                    routingMethod: tripDistance.method
                }
            }
        });

        // Update booking status
        await prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'BROADCASTING' }
        });

        // TODO: Send notifications to nearby technicians via Socket.io
        // this.notifyNearbyTechnicians(broadcast, nearbyTechs);

        return {
            bookingId: booking.id,
            broadcastId: broadcast.id,
            status: 'BROADCASTING',
            estimatedDistance: tripDistance.distance,
            estimatedDuration: tripDistance.duration,
            estimatedPrice: pricing.finalPrice,
            pricing: pricing,
            routingMethod: tripDistance.method,
            broadcastUntil: expiresAt,
            nearbyTechniciansCount: nearbyTechs.length
        };
    }

    /**
     * Get offers for a broadcast
     */
    async getOffers(broadcastId, customerId) {
        const broadcast = await prisma.jobBroadcast.findUnique({
            where: { id: broadcastId },
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
                        bidAmount: 'asc' // Cheapest first
                    }
                }
            }
        });

        if (!broadcast) {
            throw new AppError('Broadcast not found', 404, 'NOT_FOUND');
        }

        // Verify ownership
        if (broadcast.booking.customerId !== customerId) {
            throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
        }

        // Calculate ETA for each offer
        const offersWithETA = await Promise.all(
            broadcast.offers.map(async (offer) => {
                const eta = await calculateETA(
                    offer.technician.profile.currentLat,
                    offer.technician.profile.currentLng,
                    broadcast.pickupLat,
                    broadcast.pickupLng
                );

                return {
                    id: offer.id,
                    technician: {
                        id: offer.technicianId,
                        name: `${offer.technician.profile.firstName} ${offer.technician.profile.lastName}`,
                        avatar: offer.technician.profile.avatar,
                        rating: 4.5, // TODO: Calculate from ratings
                        completedJobs: 0, // TODO: Count from bookings
                        distance: eta.distance,
                        estimatedArrival: eta.etaMinutes
                    },
                    bidAmount: offer.bidAmount,
                    message: offer.message,
                    status: offer.status,
                    createdAt: offer.createdAt
                };
            })
        );

        return {
            broadcast: {
                id: broadcast.id,
                status: broadcast.status,
                pickupLocation: {
                    latitude: broadcast.pickupLat,
                    longitude: broadcast.pickupLng,
                    address: broadcast.pickupAddress
                },
                destinationLocation: {
                    latitude: broadcast.destinationLat,
                    longitude: broadcast.destinationLng,
                    address: broadcast.destinationAddress
                },
                expiresAt: broadcast.expiresAt
            },
            offers: offersWithETA
        };
    }

    /**
     * Accept an offer
     */
    async acceptOffer(broadcastId, offerId, customerId) {
        // Get broadcast with booking
        const broadcast = await prisma.jobBroadcast.findUnique({
            where: { id: broadcastId },
            include: {
                booking: true
            }
        });

        if (!broadcast) {
            throw new AppError('Broadcast not found', 404, 'NOT_FOUND');
        }

        if (broadcast.booking.customerId !== customerId) {
            throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
        }

        if (broadcast.status !== 'BROADCASTING') {
            throw new AppError('Broadcast is not active', 400, 'INVALID_STATUS');
        }

        // Get offer
        const offer = await prisma.jobOffer.findFirst({
            where: {
                id: offerId,
                broadcastId
            },
            include: {
                technician: {
                    include: {
                        profile: true
                    }
                }
            }
        });

        if (!offer) {
            throw new AppError('Offer not found', 404, 'NOT_FOUND');
        }

        if (offer.status !== 'PENDING') {
            throw new AppError('Offer is no longer available', 400, 'INVALID_STATUS');
        }

        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // Accept the offer
            await tx.jobOffer.update({
                where: { id: offerId },
                data: { status: 'ACCEPTED' }
            });

            // Reject all other offers
            await tx.jobOffer.updateMany({
                where: {
                    broadcastId,
                    id: { not: offerId }
                },
                data: { status: 'REJECTED' }
            });

            // Update broadcast status
            await tx.jobBroadcast.update({
                where: { id: broadcastId },
                data: { status: 'COMPLETED' }
            });

            // Update booking with technician and price
            const updatedBooking = await tx.booking.update({
                where: { id: broadcast.booking.id },
                data: {
                    technicianId: offer.technicianId,
                    status: 'TECHNICIAN_ASSIGNED',
                    agreedPrice: offer.bidAmount,
                    acceptedAt: new Date()
                },
                include: {
                    technician: {
                        include: {
                            profile: true
                        }
                    }
                }
            });

            return updatedBooking;
        });

        // TODO: Notify technician via Socket.io
        // TODO: Notify rejected technicians

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

    /**
     * Generate unique booking number
     */
    async generateBookingNumber() {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

        const count = await prisma.booking.count({
            where: {
                createdAt: {
                    gte: new Date(today.setHours(0, 0, 0, 0))
                }
            }
        });

        return `TWG-${dateStr}-${String(count + 1).padStart(3, '0')}`;
    }
}

module.exports = new TowingService();
