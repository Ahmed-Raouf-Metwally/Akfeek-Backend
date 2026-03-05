const prisma = require('../utils/database/prisma');
const {
    calculateDistance,
    calculateETA,
    calculateTowingPrice,
    findNearbyWinches
} = require('../utils/towing');
const {
    getSystemSetting
} = require('../utils/systemSettings');
const {
    AppError
} = require('../api/middlewares/error.middleware');
const osrmService = require('./osrm.service');
const { emitNewTowingRequestToWinches } = require('../socket');
const { getPlatformCommissionPercent } = require('../utils/pricing');

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

        // التحقق من موقع الالتقاط والجهة (الوجهة) مع الإحداثيات — لازم للرد بالسعر لما الفيندور يوافق
        if (!pickupLocation || typeof pickupLocation.latitude !== 'number' || typeof pickupLocation.longitude !== 'number') {
            throw new AppError('Pickup location with latitude and longitude is required', 400, 'VALIDATION_ERROR');
        }
        if (!destinationLocation || typeof destinationLocation.latitude !== 'number' || typeof destinationLocation.longitude !== 'number') {
            throw new AppError('Destination location with latitude and longitude is required', 400, 'VALIDATION_ERROR');
        }
        const validLat = (v) => typeof v === 'number' && v >= -90 && v <= 90;
        const validLng = (v) => typeof v === 'number' && v >= -180 && v <= 180;
        if (!validLat(pickupLocation.latitude) || !validLng(pickupLocation.longitude)) {
            throw new AppError('Invalid pickup coordinates (lat -90..90, lng -180..180)', 400, 'VALIDATION_ERROR');
        }
        if (!validLat(destinationLocation.latitude) || !validLng(destinationLocation.longitude)) {
            throw new AppError('Invalid destination coordinates (lat -90..90, lng -180..180)', 400, 'VALIDATION_ERROR');
        }
        if (!pickupLocation.address || typeof pickupLocation.address !== 'string') {
            throw new AppError('Pickup address is required', 400, 'VALIDATION_ERROR');
        }
        if (!destinationLocation.address || typeof destinationLocation.address !== 'string') {
            throw new AppError('Destination address is required', 400, 'VALIDATION_ERROR');
        }

        // Validate vehicle ownership
        const vehicle = await prisma.userVehicle.findFirst({
            where: {
                id: vehicleId,
                userId: customerId
            }
        });

        if (!vehicle) {
            throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
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
                status: 'BROADCASTING',
                pickupLat: pickupLocation.latitude,
                pickupLng: pickupLocation.longitude,
                pickupAddress: pickupLocation.address,
                destinationLat: destinationLocation.latitude,
                destinationLng: destinationLocation.longitude,
                destinationAddress: destinationLocation.address,
                totalPrice: pricing.finalPrice,
                notes,
                metadata: {
                    urgency,
                    vehicleCondition,
                    estimatedBudget,
                    distance: tripDistance.distance,
                    estimatedDuration: tripDistance.duration,
                    routingMethod: tripDistance.method,
                    pricing
                }
            }
        });

        // Find nearby winches (Vendor + Winch) — البث للوينشات القريبة فقط
        const nearbyWinches = await findNearbyWinches(
            pickupLocation.latitude,
            pickupLocation.longitude
        );

        if (nearbyWinches.length === 0) {
            await prisma.booking.update({
                where: {
                    id: booking.id
                },
                data: {
                    status: 'PENDING'
                }
            });

            throw new AppError(
                'No winches available in your area',
                404,
                'NO_WINCHES'
            );
        }

        // Create broadcast
        const broadcastTimeout = await getSystemSetting('TOWING_BROADCAST_TIMEOUT', 15);
        const expiresAt = new Date(Date.now() + broadcastTimeout * 60000);

        const broadcast = await prisma.jobBroadcast.create({
            data: {
                bookingId: booking.id,
                customerId,
                latitude: pickupLocation.latitude,
                longitude: pickupLocation.longitude,
                locationAddress: pickupLocation.address,
                radiusKm: await getSystemSetting('TOWING_SEARCH_RADIUS', 10),
                broadcastUntil: expiresAt,
                description: `Towing Request: ${vehicleCondition}` + (notes ? ` - ${notes}` : ''),
                urgency,
                estimatedBudget,
                status: 'BROADCASTING',
                // Metadata isn't in JobBroadcast schema based on error, so we rely on Booking metadata
                // or if schema has it (which previous view didn't show clearly for metadata), 
                // checking schema again... schema has NO metadata on JobBroadcast!
                // We will skip metadata here as it's already on the booking.
            }
        });

        // Update booking status
        await prisma.booking.update({
            where: {
                id: booking.id
            },
            data: {
                status: 'BROADCASTING'
            }
        });

        // إرسال فوري (push) للوينشات القريبة عبر السوكت — حتى يظهر الطلب بدون polling
        try {
            const vendorUserIds = nearbyWinches
                .map((n) => n.winch?.vendor?.userId)
                .filter(Boolean);
            if (vendorUserIds.length > 0) {
                emitNewTowingRequestToWinches(vendorUserIds, {
                    broadcastId: broadcast.id,
                    bookingId: booking.id,
                    pickupLocation: {
                        latitude: pickupLocation.latitude,
                        longitude: pickupLocation.longitude,
                        address: pickupLocation.address
                    },
                    destinationLocation: {
                        latitude: destinationLocation.latitude,
                        longitude: destinationLocation.longitude,
                        address: destinationLocation.address
                    },
                    distanceKm: tripDistance.distance,
                    urgency: urgency || 'NORMAL',
                    vehicleCondition: vehicleCondition || null,
                    expiresAt: expiresAt.toISOString()
                });
            }
        } catch (_) { /* socket not ready */ }

        return {
            bookingId: booking.id,
            broadcastId: broadcast.id,
            status: 'BROADCASTING',
            estimatedDistanceKm: tripDistance.distance,
            estimatedDurationMinutes: tripDistance.duration,
            estimatedPrice: pricing.finalPrice,
            pricing: pricing,
            routingMethod: tripDistance.method,
            broadcastUntil: expiresAt,
            nearbyWinchesCount: nearbyWinches.length
        };
    }

    /**
     * Get offers for a broadcast — عروض الوينشات/الفنيين مع السعر للعميل
     */
    async getOffers(broadcastId, customerId) {
        const broadcast = await prisma.jobBroadcast.findUnique({
            where: { id: broadcastId },
            include: {
                booking: {
                    select: {
                        id: true,
                        customerId: true,
                        status: true,
                        pickupLat: true,
                        pickupLng: true,
                        pickupAddress: true,
                        destinationLat: true,
                        destinationLng: true,
                        destinationAddress: true
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
                        },
                        winch: {
                            include: {
                                vendor: {
                                    select: {
                                        businessName: true,
                                        businessNameAr: true,
                                        userId: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { bidAmount: 'asc' }
                }
            }
        });

        if (!broadcast) {
            throw new AppError('Broadcast not found', 404, 'BROADCAST_NOT_FOUND');
        }
        if (broadcast.booking.customerId !== customerId) {
            throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
        }

        const pickupLat = broadcast.latitude;
        const pickupLng = broadcast.longitude;
        const booking = broadcast.booking;

        const offersWithMeta = await Promise.all(
            broadcast.offers.map(async (offer) => {
                if (offer.winchId && offer.winch) {
                    return {
                        id: offer.id,
                        winch: {
                            id: offer.winch.id,
                            name: offer.winch.name,
                            nameAr: offer.winch.nameAr,
                            vendorName: offer.winch.vendor?.businessName,
                            vendorNameAr: offer.winch.vendor?.businessNameAr,
                            distance: offer.distanceKm ?? 0,
                            estimatedArrival: offer.estimatedArrival,
                            averageRating: offer.winch.averageRating,
                            totalTrips: offer.winch.totalTrips
                        },
                        bidAmount: Number(offer.bidAmount),
                        message: offer.message,
                        status: offer.status,
                        createdAt: offer.createdAt
                    };
                }
                if (offer.technicianId && offer.technician?.profile) {
                    const prof = offer.technician.profile;
                    let eta = { distance: offer.distanceKm ?? 0, etaMinutes: offer.estimatedArrival ?? 0 };
                    if (prof.currentLat != null && prof.currentLng != null) {
                        try {
                            eta = await calculateETA(prof.currentLat, prof.currentLng, pickupLat, pickupLng);
                        } catch (_) {}
                    }
                    return {
                        id: offer.id,
                        technician: {
                            id: offer.technicianId,
                            name: `${prof.firstName ?? ''} ${prof.lastName ?? ''}`.trim(),
                            avatar: prof.avatar,
                            rating: 4.5,
                            completedJobs: 0,
                            distance: eta.distance,
                            estimatedArrival: eta.etaMinutes
                        },
                        bidAmount: Number(offer.bidAmount),
                        message: offer.message,
                        status: offer.status,
                        createdAt: offer.createdAt
                    };
                }
                return {
                    id: offer.id,
                    bidAmount: Number(offer.bidAmount),
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
                    latitude: pickupLat,
                    longitude: pickupLng,
                    address: broadcast.locationAddress
                },
                destinationLocation: {
                    latitude: booking.destinationLat ?? null,
                    longitude: booking.destinationLng ?? null,
                    address: booking.destinationAddress ?? null
                },
                expiresAt: broadcast.broadcastUntil
            },
            offers: offersWithMeta
        };
    }

    /**
     * Accept an offer
     */
    async acceptOffer(broadcastId, offerId, customerId) {
        // Get broadcast with booking
        const broadcast = await prisma.jobBroadcast.findUnique({
            where: {
                id: broadcastId
            },
            include: {
                booking: true
            }
        });

        if (!broadcast) {
            throw new AppError('Broadcast not found', 404, 'BROADCAST_NOT_FOUND');
        }

        if (broadcast.booking.customerId !== customerId) {
            throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
        }

        if (broadcast.status !== 'BROADCASTING') {
            throw new AppError('Broadcast is not active', 400, 'INVALID_STATUS');
        }

        // Get offer (من ونش أو فني)
        const offer = await prisma.jobOffer.findFirst({
            where: { id: offerId, broadcastId },
            include: {
                technician: { include: { profile: true } },
                winch: {
                    include: {
                        vendor: { select: { userId: true, businessName: true, businessNameAr: true, commissionPercent: true } }
                    }
                }
            }
        });

        if (!offer) {
            throw new AppError('Offer not found', 404, 'OFFER_NOT_FOUND');
        }
        if (offer.status !== 'PENDING') {
            throw new AppError('Offer is no longer available', 400, 'INVALID_STATUS');
        }

        const driverUserId = offer.winchId && offer.winch?.vendor
            ? offer.winch.vendor.userId
            : offer.technicianId;
        if (!driverUserId) {
            throw new AppError('Offer has no assigned driver', 400, 'INVALID_OFFER');
        }

        // تسجيل نسبة عمولة المنصة وقت الحجز حتى لا تتأثر الحجوزات القديمة بتغيير النسبة
        const defaultCommission = await getPlatformCommissionPercent();
        const commissionPercentAtBooking = (offer.winch?.vendor?.commissionPercent != null)
            ? Number(offer.winch.vendor.commissionPercent)
            : defaultCommission;

        const agreedAmount = Number(offer.bidAmount);
        const result = await prisma.$transaction(async (tx) => {
            await tx.jobOffer.update({
                where: { id: offerId },
                data: { status: 'ACCEPTED', isSelected: true }
            });
            await tx.jobOffer.updateMany({
                where: { broadcastId, id: { not: offerId } },
                data: { status: 'REJECTED' }
            });
            await tx.jobBroadcast.update({
                where: { id: broadcastId },
                data: { status: 'TECHNICIAN_SELECTED' }
            });

            // ربط الحجز بفيندور الوينش (يُخزَّن في technicianId للتوافق مع السوكت/التتبع — الفيندور هو من ينفذ المهمة)
            const updateData = {
                status: 'TECHNICIAN_ASSIGNED',
                totalPrice: offer.bidAmount,
                subtotal: offer.bidAmount,
                platformCommissionPercent: commissionPercentAtBooking
            };
            if (driverUserId) {
                updateData.technician = { connect: { id: driverUserId } };
            }
            const updatedBooking = await tx.booking.update({
                where: { id: broadcast.booking.id },
                data: updateData,
                include: {
                    technician: { include: { profile: true } }
                }
            });

            // إنشاء فاتورة للحجز حتى يدفع العميل — بعد الدفع يتفتح السوكت
            const existingInv = await tx.invoice.findUnique({ where: { bookingId: updatedBooking.id } });
            if (!existingInv) {
                const invNum = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                const invoice = await tx.invoice.create({
                    data: {
                        invoiceNumber: invNum,
                        bookingId: updatedBooking.id,
                        customerId: updatedBooking.customerId,
                        subtotal: agreedAmount,
                        tax: 0,
                        discount: 0,
                        totalAmount: agreedAmount,
                        paidAmount: 0,
                        status: 'PENDING'
                    }
                });
                await tx.invoiceLineItem.create({
                    data: {
                        invoiceId: invoice.id,
                        description: 'Towing / Winch service',
                        descriptionAr: 'خدمة السحب / الوينش',
                        itemType: 'SERVICE',
                        quantity: 1,
                        unitPrice: agreedAmount,
                        totalPrice: agreedAmount
                    }
                });
            }

            return updatedBooking;
        });

        // العميل يدفع الفاتورة ثم يتفتح السوكت — انظر markInvoicePaid
        const invoice = await prisma.invoice.findUnique({
            where: { bookingId: result.id },
            select: { id: true, invoiceNumber: true, totalAmount: true, status: true }
        });

        return {
            booking: {
                id: result.id,
                bookingNumber: result.bookingNumber,
                status: result.status,
                technician: result.technician ? {
                    id: result.technician.id,
                    name: `${result.technician.profile?.firstName ?? ''} ${result.technician.profile?.lastName ?? ''}`.trim(),
                    phone: result.technician.phone,
                    avatar: result.technician.profile?.avatar
                } : null,
                winch: offer.winch ? {
                    id: offer.winch.id,
                    name: offer.winch.name,
                    vendorName: offer.winch.vendor?.businessName,
                    vendorNameAr: offer.winch.vendor?.businessNameAr
                } : null,
                agreedPrice: agreedAmount
            },
            invoice: invoice ? {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                totalAmount: Number(invoice.totalAmount),
                status: invoice.status,
                message: 'Pay this invoice to open tracking and chat with the winch driver.',
                messageAr: 'ادفع الفاتورة لفتح التتبع والمحادثة مع السائق.'
            } : null
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