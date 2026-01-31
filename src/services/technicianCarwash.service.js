const prisma = require('../utils/database/prisma');
const { calculateETA } = require('../utils/towing');
const { AppError } = require('../api/middlewares/error.middleware');

class TechnicianCarWashService {
    /**
     * Get active broadcasts for technician
     */
    async getActiveBroadcasts(technicianId) {
        const technician = await prisma.user.findUnique({
            where: { id: technicianId },
            include: {
                profile: {
                    select: {
                        currentLat: true,
                        currentLng: true,
                        isAvailable: true
                    }
                }
            }
        });

        if (!technician || technician.role !== 'TECHNICIAN') {
            throw new AppError('Technician not found', 404, 'USER_NOT_FOUND');
        }

        if (!technician.profile?.isAvailable) {
            return {
                broadcasts: [],
                message: 'You are currently unavailable.'
            };
        }

        // Fetch broadcasts where the booking is relevant to Car Wash (metadata or service check if connected)
        // Since JobBroadcast is generic, we might pull all and filter on client side or checking booking.
        // Better: Filter by verifying the Booking has metadata.serviceType or checking description.
        // For efficiency, we can filter by description start or join with Service table if linked (Booking linked to Service?).
        // Booking has no direct Service relation in schema (it has bookingServices but that's complex).
        // We will filter by checking description 'Car Wash Request' or similar key.
        const broadcasts = await prisma.jobBroadcast.findMany({
            where: {
                status: 'BROADCASTING',
                broadcastUntil: { gt: new Date() },
                description: { contains: 'Car Wash' } // Simple filter for now
            },
            include: {
                booking: {
                    include: {
                        customer: {
                            include: { profile: { select: { firstName: true, lastName: true, avatar: true } } }
                        },
                        vehicle: {
                            select: {
                                plateNumber: true,
                                color: true,
                                vehicleModel: {
                                    select: {
                                        name: true,
                                        year: true,
                                        brand: { select: { name: true } }
                                    }
                                }
                            }
                        }
                    }
                },
                offers: {
                    where: { technicianId },
                    select: { id: true, bidAmount: true, isSelected: true, createdAt: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const broadcastsWithETA = await Promise.all(
            broadcasts.map(async (broadcast) => {
                const eta = await calculateETA(
                    technician.profile.currentLat || 0,
                    technician.profile.currentLng || 0,
                    broadcast.latitude,
                    broadcast.longitude
                );

                return {
                    id: broadcast.id,
                    customer: {
                        name: broadcast.booking.customer.profile
                            ? `${broadcast.booking.customer.profile.firstName} ${broadcast.booking.customer.profile.lastName}`
                            : 'Unknown Customer',
                        avatar: broadcast.booking.customer.profile?.avatar
                    },
                    vehicle: {
                        make: broadcast.booking.vehicle?.vehicleModel?.brand?.name || 'Unknown Make',
                        model: broadcast.booking.vehicle?.vehicleModel?.name || 'Unknown Model',
                        year: broadcast.booking.vehicle?.vehicleModel?.year || 'Unknown Year',
                        plateNumber: broadcast.booking.vehicle?.plateNumber || 'Unknown Plate'
                    },
                    location: {
                        address: broadcast.locationAddress,
                        latitude: broadcast.latitude,
                        longitude: broadcast.longitude,
                        distance: eta.distance,
                        eta: eta.etaMinutes
                    },
                    serviceType: broadcast.booking?.metadata?.serviceType || 'General Wash',
                    estimatedBudget: broadcast.estimatedBudget,
                    myOffer: broadcast.offers[0] || null
                };
            })
        );

        return { broadcasts: broadcastsWithETA };
    }

    /**
     * Submit offer
     */
    async submitOffer(technicianId, broadcastId, data) {
        const { bidAmount, message, estimatedArrival } = data;

        const technician = await prisma.user.findUnique({
            where: { id: technicianId },
            include: { profile: true }
        });

        // Validation (Technician active/available)
        if (!technician.profile.isAvailable) throw new AppError('Unavailable', 400);

        const broadcast = await prisma.jobBroadcast.findUnique({
            where: { id: broadcastId },
            include: { booking: true }
        });

        if (!broadcast || broadcast.status !== 'BROADCASTING') throw new AppError('Broadcast invalid', 400);
        if (new Date() > new Date(broadcast.broadcastUntil)) throw new AppError('Broadcast expired', 400);

        const eta = await calculateETA(
            technician.profile.currentLat || 0,
            technician.profile.currentLng || 0,
            broadcast.latitude,
            broadcast.longitude
        );

        const offer = await prisma.jobOffer.create({
            data: {
                broadcastId,
                technicianId,
                bidAmount,
                message,
                estimatedArrival,
                technicianLat: technician.profile.currentLat || 0,
                technicianLng: technician.profile.currentLng || 0,
                distanceKm: eta.distance || 0
                // Removed status as it's not in schema
            }
        });

        return offer;
    }
}

module.exports = new TechnicianCarWashService();
