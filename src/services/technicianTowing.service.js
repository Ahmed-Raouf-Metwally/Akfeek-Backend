const prisma = require('../utils/database/prisma');
const { calculateETA } = require('../utils/towing');
const { AppError } = require('../api/middlewares/error.middleware');

class TechnicianTowingService {
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
            throw new AppError('Technician not found', 404, 'NOT_FOUND');
        }

        if (!technician.profile?.isAvailable) {
            return {
                broadcasts: [],
                message: 'You are currently unavailable. Turn on availability to receive broadcasts.'
            };
        }

        if (!technician.profile.currentLat || !technician.profile.currentLng) {
            return {
                broadcasts: [],
                message: 'Please update your location to receive broadcasts.'
            };
        }

        // Get active broadcasts
        const broadcasts = await prisma.jobBroadcast.findMany({
            where: {
                status: 'BROADCASTING',
                expiresAt: {
                    gt: new Date()
                }
            },
            include: {
                booking: {
                    include: {
                        customer: {
                            include: {
                                profile: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        avatar: true
                                    }
                                }
                            }
                        },
                        vehicle: {
                            select: {
                                vehicleType: true,
                                make: true,
                                model: true,
                                year: true,
                                color: true,
                                plateNumber: true
                            }
                        }
                    }
                },
                offers: {
                    where: {
                        technicianId
                    },
                    select: {
                        id: true,
                        bidAmount: true,
                        status: true,
                        createdAt: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Calculate ETA for each broadcast
        const broadcastsWithETA = await Promise.all(
            broadcasts.map(async (broadcast) => {
                const eta = await calculateETA(
                    technician.profile.currentLat,
                    technician.profile.currentLng,
                    broadcast.pickupLat,
                    broadcast.pickupLng
                );

                const myOffer = broadcast.offers[0] || null;

                return {
                    id: broadcast.id,
                    customer: {
                        name: `${broadcast.booking.customer.profile.firstName} ${broadcast.booking.customer.profile.lastName}`,
                        avatar: broadcast.booking.customer.profile.avatar
                    },
                    vehicle: broadcast.booking.vehicle,
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
                    distance: eta.distance,
                    estimatedArrival: eta.etaMinutes,
                    estimatedPrice: broadcast.metadata?.estimatedPrice || 0,
                    urgency: broadcast.metadata?.urgency || 'NORMAL',
                    vehicleCondition: broadcast.metadata?.vehicleCondition,
                    expiresAt: broadcast.expiresAt,
                    myOffer,
                    createdAt: broadcast.createdAt
                };
            })
        );

        return {
            broadcasts: broadcastsWithETA
        };
    }

    /**
     * Submit offer for broadcast
     */
    async submitOffer(technicianId, broadcastId, data) {
        const { bidAmount, message, estimatedArrival } = data;

        // Verify technician
        const technician = await prisma.user.findUnique({
            where: { id: technicianId },
            select: {
                id: true,
                role: true,
                status: true,
                profile: {
                    select: {
                        isAvailable: true,
                        currentLat: true,
                        currentLng: true
                    }
                }
            }
        });

        if (!technician || technician.role !== 'TECHNICIAN') {
            throw new AppError('Technician not found', 404, 'NOT_FOUND');
        }

        if (technician.status !== 'ACTIVE') {
            throw new AppError('Your account is not active', 403, 'FORBIDDEN');
        }

        if (!technician.profile.isAvailable) {
            throw new AppError('You must be available to submit offers', 400, 'UNAVAILABLE');
        }

        // Get broadcast
        const broadcast = await prisma.jobBroadcast.findUnique({
            where: { id: broadcastId },
            include: {
                booking: {
                    select: {
                        id: true,
                        customerId: true
                    }
                }
            }
        });

        if (!broadcast) {
            throw new AppError('Broadcast not found', 404, 'NOT_FOUND');
        }

        if (broadcast.status !== 'BROADCASTING') {
            throw new AppError('Broadcast is no longer active', 400, 'INVALID_STATUS');
        }

        if (new Date() > new Date(broadcast.expiresAt)) {
            throw new AppError('Broadcast has expired', 400, 'EXPIRED');
        }

        // Check if already submitted offer
        const existingOffer = await prisma.jobOffer.findFirst({
            where: {
                broadcastId,
                technicianId
            }
        });

        if (existingOffer) {
            throw new AppError('You have already submitted an offer', 400, 'DUPLICATE_OFFER');
        }

        // Create offer
        const offer = await prisma.jobOffer.create({
            data: {
                broadcastId,
                technicianId,
                bidAmount,
                message,
                estimatedArrival,
                status: 'PENDING'
            },
            include: {
                technician: {
                    include: {
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        });

        // TODO: Notify customer via Socket.io about new offer

        return {
            offer: {
                id: offer.id,
                broadcastId: offer.broadcastId,
                bidAmount: offer.bidAmount,
                message: offer.message,
                estimatedArrival: offer.estimatedArrival,
                status: offer.status,
                createdAt: offer.createdAt
            }
        };
    }

    /**
     * Get technician's assigned jobs
     */
    async getAssignedJobs(technicianId) {
        const jobs = await prisma.booking.findMany({
            where: {
                technicianId,
                status: {
                    in: [
                        'TECHNICIAN_ASSIGNED',
                        'TECHNICIAN_EN_ROUTE',
                        'TECHNICIAN_ARRIVED',
                        'IN_PROGRESS'
                    ]
                }
            },
            include: {
                customer: {
                    include: {
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                avatar: true,
                                phone: true
                            }
                        }
                    }
                },
                vehicle: true
            },
            orderBy: {
                acceptedAt: 'desc'
            }
        });

        return {
            jobs: jobs.map(job => ({
                id: job.id,
                bookingNumber: job.bookingNumber,
                status: job.status,
                customer: {
                    name: `${job.customer.profile.firstName} ${job.customer.profile.lastName}`,
                    phone: job.customer.phone,
                    avatar: job.customer.profile.avatar
                },
                vehicle: job.vehicle,
                pickupLocation: {
                    latitude: job.pickupLat,
                    longitude: job.pickupLng,
                    address: job.pickupAddress
                },
                destinationLocation: {
                    latitude: job.destinationLat,
                    longitude: job.destinationLng,
                    address: job.destinationAddress
                },
                agreedPrice: job.agreedPrice,
                acceptedAt: job.acceptedAt,
                scheduledDate: job.scheduledDate
            }))
        };
    }

    /**
     * Update job status
     */
    async updateJobStatus(technicianId, bookingId, newStatus) {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) {
            throw new AppError('Booking not found', 404, 'NOT_FOUND');
        }

        if (booking.technicianId !== technicianId) {
            throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
        }

        // Validate status transition
        const validTransitions = {
            'TECHNICIAN_ASSIGNED': ['TECHNICIAN_EN_ROUTE'],
            'TECHNICIAN_EN_ROUTE': ['TECHNICIAN_ARRIVED'],
            'TECHNICIAN_ARRIVED': ['IN_PROGRESS'],
            'IN_PROGRESS': ['COMPLETED']
        };

        if (!validTransitions[booking.status]?.includes(newStatus)) {
            throw new AppError(
                `Invalid status transition from ${booking.status} to ${newStatus}`,
                400,
                'INVALID_TRANSITION'
            );
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: newStatus,
                ...(newStatus === 'COMPLETED' && { completedAt: new Date() })
            }
        });

        // TODO: Notify customer via Socket.io

        return {
            booking: {
                id: updatedBooking.id,
                status: updatedBooking.status,
                completedAt: updatedBooking.completedAt
            }
        };
    }
}

module.exports = new TechnicianTowingService();
