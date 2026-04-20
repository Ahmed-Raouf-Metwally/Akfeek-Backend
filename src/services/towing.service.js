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
const { emitNewTowingRequestToWinches, emitBookingReady, emitNotification } = require('../socket');
const { getPlatformCommissionPercent } = require('../utils/pricing');
const { getUrgencyLabels, getVehicleConditionLabels } = require('../utils/broadcastDisplayLabels');

/** Human-readable address from client; null/omit/blank OK (quote + optional booking fields). */
function normalizeOptionalAddress(addr) {
    if (addr === undefined || addr === null) return null;
    if (typeof addr !== 'string') return null;
    const t = addr.trim();
    return t.length ? t : null;
}

/** JobBroadcast.locationAddress is required (non-null String) — fallback to coordinates. */
function broadcastLocationLabel(addr, lat, lng) {
    const normalized = normalizeOptionalAddress(addr);
    if (normalized) return normalized;
    const la = Number(lat);
    const lo = Number(lng);
    if (Number.isFinite(la) && Number.isFinite(lo)) {
        return `Pick-up (${la.toFixed(5)}, ${lo.toFixed(5)})`;
    }
    return 'Towing pickup';
}

class TowingService {
    /**
     * Create towing request and broadcast to nearby technicians
     */
    /**
     * Quote-only: calculates price + estimated time without creating booking/broadcast.
     * POST /api/bookings/towing/quote
     */
    async createTowingQuote(customerId, data) {
        const {
            pickupLocation,
            destinationLocation
        } = data;

        // Validate pickup/destination (same as createTowingRequest)
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

        const tripDistance = await osrmService.calculateTripDistance(
            pickupLocation.latitude,
            pickupLocation.longitude,
            destinationLocation.latitude,
            destinationLocation.longitude
        );

        const pricing = await calculateTowingPrice(tripDistance.distance, 'NORMAL');

        // Total time = additionalMinutes + (distanceKm * minutesPerKm)
        const minutesPerKm = await getSystemSetting('TOWING_MINUTES_PER_KM', null);
        const additionalMinutes = await getSystemSetting('TOWING_ADDITIONAL_MINUTES', 0);
        const estimatedDurationMinutesFromDistanceRaw =
            minutesPerKm != null ? tripDistance.distance * minutesPerKm : tripDistance.duration; // fallback
        const estimatedDurationMinutesRaw = estimatedDurationMinutesFromDistanceRaw + additionalMinutes;
        const estimatedDurationMinutes = Math.max(1, Math.round(estimatedDurationMinutesRaw));

        // Quote response is intentionally minimal for the mobile flow
        // (client will show price/time and then call /request to create broadcast/booking).
        return {
            estimatedDurationMinutes,
            estimatedPrice: pricing.finalPrice
        };
    }

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

        const pickupAddressDb = normalizeOptionalAddress(pickupLocation.address);
        const destinationAddressDb = normalizeOptionalAddress(destinationLocation.address);
        const broadcastPickupLabel = broadcastLocationLabel(
            pickupLocation.address,
            pickupLocation.latitude,
            pickupLocation.longitude
        );

        // Validate vehicle ownership only when client sends vehicleId
        // Mobile towing flow may not include vehicleId.
        let resolvedVehicleId = null;
        if (vehicleId) {
            const vehicle = await prisma.userVehicle.findFirst({
                where: {
                    id: vehicleId,
                    userId: customerId
                }
            });

            if (!vehicle) {
                throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
            }
            resolvedVehicleId = vehicle.id;
        }

        // No need to require any `Service` row for the towing flow:
        // pricing is calculated from trip distance and winch bidding, then we broadcast offers.


        // Calculate distance using OSRM (accurate road distance)
        const tripDistance = await osrmService.calculateTripDistance(
            pickupLocation.latitude,
            pickupLocation.longitude,
            destinationLocation.latitude,
            destinationLocation.longitude
        );

        // Client-side ETA before offers: admin-configured timing knobs.
        // Total time = additionalMinutes + (distanceKm * minutesPerKm)
        // If the setting doesn't exist yet, we fallback to OSRM duration to avoid breaking the flow.
        const minutesPerKm = await getSystemSetting('TOWING_MINUTES_PER_KM', null);
        const additionalMinutes = await getSystemSetting('TOWING_ADDITIONAL_MINUTES', 0);
        const estimatedDurationMinutesFromDistanceRaw =
            minutesPerKm != null
                ? tripDistance.distance * minutesPerKm
                : (tripDistance.duration); // fallback to OSRM duration
        const estimatedDurationMinutesRaw = estimatedDurationMinutesFromDistanceRaw + additionalMinutes;
        const estimatedDurationMinutes = Math.max(1, Math.round(estimatedDurationMinutesRaw));

        const pricing = await calculateTowingPrice(tripDistance.distance, urgency);

        // Find nearby winches first. If none are available, do NOT create a booking.
        const nearbyWinches = await findNearbyWinches(
            pickupLocation.latitude,
            pickupLocation.longitude
        );

        if (nearbyWinches.length === 0) {
            throw new AppError(
                'No winches available at the moment',
                404,
                'NO_WINCHES'
            );
        }

        // Create booking only after confirming nearby winch availability
        const booking = await prisma.booking.create({
            data: {
                bookingNumber: await this.generateBookingNumber(),
                customerId,
                vehicleId: resolvedVehicleId,
                status: 'BROADCASTING',
                pickupLat: pickupLocation.latitude,
                pickupLng: pickupLocation.longitude,
                pickupAddress: pickupAddressDb,
                destinationLat: destinationLocation.latitude,
                destinationLng: destinationLocation.longitude,
                destinationAddress: destinationAddressDb,
                totalPrice: pricing.finalPrice,
                notes,
                metadata: {
                    urgency,
                    vehicleCondition,
                    estimatedBudget,
                    distance: tripDistance.distance,
                    estimatedDuration: estimatedDurationMinutes,
                    routingMethod: tripDistance.method,
                    pricing
                }
            }
        });

        // DB Notification (Customer): towing request created/broadcasting
        try {
            await prisma.notification.create({
                data: {
                    userId: customerId,
                    type: 'BROADCAST_NEW',
                    title: 'Towing request created',
                    titleAr: 'تم إنشاء طلب سحب',
                    message: `Your towing request ${booking.bookingNumber} is being broadcast to all available winches.`,
                    messageAr: `تم إنشاء طلب السحب رقم ${booking.bookingNumber} وجاري إرساله لجميع الوينشات المتاحة.`,
                    bookingId: booking.id,
                    metadata: { bookingNumber: booking.bookingNumber, status: booking.status, urgency, vehicleCondition, estimatedBudget }
                }
            });
        } catch (_) { /* non-blocking */ }

        // Create broadcast
        // Broadcast timeout (minutes) - kept as default constant since we removed the admin knob.
        const broadcastTimeout = 15;
        const expiresAt = new Date(Date.now() + broadcastTimeout * 60000);

        const broadcast = await prisma.jobBroadcast.create({
            data: {
                bookingId: booking.id,
                customerId,
                latitude: pickupLocation.latitude,
                longitude: pickupLocation.longitude,
                locationAddress: broadcastPickupLabel,
                radiusKm: 99999,
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

        // booking status is already BROADCASTING on create

        // DB Notification (Vendors): new broadcast available
        try {
            const vendorUserIds = nearbyWinches
                .map((n) => n.winch?.vendor?.userId)
                .filter(Boolean);
            for (const uid of vendorUserIds) {
                await prisma.notification.create({
                    data: {
                        userId: uid,
                        type: 'BROADCAST_NEW',
                        title: 'New towing request',
                        titleAr: 'طلب سحب جديد',
                        message: `New towing request ${booking.bookingNumber} available.`,
                        messageAr: `طلب سحب جديد رقم ${booking.bookingNumber} متاح الآن.`,
                        bookingId: booking.id,
                        metadata: { broadcastId: broadcast.id, bookingId: booking.id }
                    }
                });
            }
        } catch (_) { /* non-blocking */ }

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
                        address: pickupAddressDb
                    },
                    destinationLocation: {
                        latitude: destinationLocation.latitude,
                        longitude: destinationLocation.longitude,
                        address: destinationAddressDb
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
            estimatedDurationMinutes,
            estimatedPrice: pricing.finalPrice,
            pricing: pricing,
            timeBreakdown: {
                minutesPerKm: minutesPerKm ?? null,
                additionalMinutes: additionalMinutes ?? 0,
                fromDistanceMinutes: Math.round(estimatedDurationMinutesFromDistanceRaw),
                estimatedDurationMinutes,
            },
            routingMethod: tripDistance.method,
            broadcastUntil: expiresAt,
            nearbyWinchesCount: nearbyWinches.length
        };
    }

    /**
     * Customer: list my towing requests/services with active/completed filter
     */
    async getMyTowingRequests(customerId, status = 'ALL') {
        const normalized = String(status || 'ALL').toUpperCase();
        const activeStatuses = [
            'BROADCASTING',
            'OFFERS_RECEIVED',
            'TECHNICIAN_ASSIGNED',
            'TECHNICIAN_EN_ROUTE',
            'ARRIVED',
            'IN_PROGRESS'
        ];

        const where = {
            customerId,
            jobBroadcast: {
                isNot: null
            }
        };

        if (normalized === 'ACTIVE') {
            where.status = { in: activeStatuses };
        } else if (normalized === 'COMPLETED') {
            where.status = 'COMPLETED';
        }

        const items = await prisma.booking.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            select: {
                id: true,
                bookingNumber: true,
                status: true,
                totalPrice: true,
                pickupLat: true,
                pickupLng: true,
                pickupAddress: true,
                destinationLat: true,
                destinationLng: true,
                destinationAddress: true,
                createdAt: true,
                completedAt: true,
                technician: {
                    select: {
                        id: true,
                        phone: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                avatar: true
                            }
                        },
                        vendorProfile: {
                            select: {
                                businessName: true,
                                businessNameAr: true,
                                logo: true,
                                contactPhone: true,
                                winch: {
                                    select: {
                                        id: true,
                                        name: true,
                                        nameAr: true,
                                        imageUrl: true,
                                        averageRating: true,
                                        totalTrips: true
                                    }
                                }
                            }
                        }
                    }
                },
                jobBroadcast: {
                    select: {
                        id: true,
                        status: true,
                        broadcastUntil: true,
                        createdAt: true
                    }
                }
            }
        });

        return {
            items: items.map((b) => {
                const tech = b.technician;
                const vendor = tech?.vendorProfile;
                const winch = vendor?.winch;

                let assignedDriver = null;
                if (tech) {
                    // اسم العارض: لو فيندور وينش → اسم النشاط، لو فني → الاسم الشخصي
                    const displayName = vendor
                        ? (vendor.businessNameAr || vendor.businessName)
                        : `${tech.profile?.firstName ?? ''} ${tech.profile?.lastName ?? ''}`.trim() || null;

                    // الصورة: أولوية → لوجو الفيندور → صورة الوينش → أفاتار الفني
                    const avatar = vendor?.logo ?? winch?.imageUrl ?? tech.profile?.avatar ?? null;

                    const phone = vendor?.contactPhone || tech.phone || null;

                    assignedDriver = {
                        id: tech.id,
                        name: displayName,
                        avatar,
                        phone,
                        ...(winch && {
                            winch: {
                                id: winch.id,
                                name: winch.nameAr || winch.name,
                                image: winch.imageUrl,
                                averageRating: winch.averageRating ? Number(winch.averageRating) : null,
                                totalTrips: winch.totalTrips ?? 0
                            }
                        })
                    };
                }

                return {
                    bookingId: b.id,
                    broadcastId: b.jobBroadcast?.id ?? null,
                    bookingNumber: b.bookingNumber,
                    status: b.status,
                    broadcastStatus: b.jobBroadcast?.status ?? null,
                    isCompleted: b.status === 'COMPLETED',
                    totalPrice: b.totalPrice != null ? Number(b.totalPrice) : null,
                    assignedDriver,
                    pickupLocation: {
                        latitude: b.pickupLat,
                        longitude: b.pickupLng,
                        address: b.pickupAddress
                    },
                    destinationLocation: {
                        latitude: b.destinationLat,
                        longitude: b.destinationLng,
                        address: b.destinationAddress
                    },
                    createdAt: b.createdAt,
                    completedAt: b.completedAt,
                    broadcastUntil: b.jobBroadcast?.broadcastUntil ?? null
                };
            })
        };
    }

    /**
     * Get broadcast details (for customer who created the request) — تفاصيل البث
     */
    async getBroadcastDetails(broadcastId, customerId) {
        const broadcast = await prisma.jobBroadcast.findUnique({
            where: { id: broadcastId },
            include: {
                booking: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        customerId: true,
                        status: true,
                        totalPrice: true,
                        pickupLat: true,
                        pickupLng: true,
                        pickupAddress: true,
                        destinationLat: true,
                        destinationLng: true,
                        destinationAddress: true,
                        metadata: true,
                        vehicleId: true,
                        vehicle: {
                            select: {
                                id: true,
                                plateDigits: true,
                                plateLettersAr: true,
                                plateLettersEn: true,
                                vehicleModel: { select: { name: true, nameAr: true, brand: { select: { name: true, nameAr: true } } } }
                            }
                            // plateNumber غالباً محسوب من plateDigits + plateLetters في الـ API
                        }
                    }
                },
                _count: { select: { offers: true } }
            }
            // offers: { select: { id: true, bidAmount: true, status: true } } — للعرض المختصر إن رغبت
        });

        if (!broadcast) {
            throw new AppError('Broadcast not found', 404, 'BROADCAST_NOT_FOUND');
        }
        if (broadcast.booking.customerId !== customerId) {
            throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
        }

        const meta = broadcast.booking.metadata && typeof broadcast.booking.metadata === 'object' ? broadcast.booking.metadata : {};
        const vehicle = broadcast.booking.vehicle;
        const plateNumber = vehicle ? [vehicle.plateLettersAr, vehicle.plateDigits].filter(Boolean).join(' ') || vehicle.plateDigits : null;
        const vehicleDisplay = vehicle?.vehicleModel
            ? { plateNumber: plateNumber || vehicle.plateDigits, model: vehicle.vehicleModel.name, modelAr: vehicle.vehicleModel.nameAr, brand: vehicle.vehicleModel.brand?.name, brandAr: vehicle.vehicleModel.brand?.nameAr }
            : (vehicle ? { plateNumber } : null);

        const urgencyVal = broadcast.urgency ?? 'NORMAL';
        const vehicleCond = meta.vehicleCondition ?? null;
        return {
            id: broadcast.id,
            status: broadcast.status,
            broadcastUntil: broadcast.broadcastUntil,
            createdAt: broadcast.createdAt,
            urgency: urgencyVal,
            ...getUrgencyLabels(urgencyVal),
            description: broadcast.description,
            booking: {
                id: broadcast.booking.id,
                bookingNumber: broadcast.booking.bookingNumber,
                status: broadcast.booking.status,
                totalPrice: broadcast.booking.totalPrice ? Number(broadcast.booking.totalPrice) : null,
                vehicle: vehicleDisplay
            },
            pickupLocation: {
                latitude: broadcast.latitude,
                longitude: broadcast.longitude,
                address: broadcast.locationAddress
            },
            destinationLocation: {
                latitude: broadcast.booking.destinationLat,
                longitude: broadcast.booking.destinationLng,
                address: broadcast.booking.destinationAddress
            },
            estimatedDistanceKm: meta.distance ?? null,
            estimatedDurationMinutes: meta.estimatedDuration ?? null,
            vehicleCondition: vehicleCond,
            ...getVehicleConditionLabels(vehicleCond),
            offersCount: broadcast._count?.offers ?? 0
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

        // Socket: notify both customer and winch driver that booking is assigned
        try {
            emitBookingReady(result.id, {
                customerId: result.customerId,
                driverId: driverUserId,
                status: 'TECHNICIAN_ASSIGNED'
            });
            // Notify the winch vendor via personal room too
            if (driverUserId) {
                emitNotification(driverUserId, {
                    type: 'BOOKING_ACCEPTED',
                    title: 'Your offer was accepted',
                    titleAr: 'تم قبول عرضك',
                    message: 'The customer accepted your towing offer.',
                    messageAr: 'قبل العميل عرضك لخدمة السحب.',
                    bookingId: result.id
                });
            }
        } catch (_) { /* non-blocking */ }

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
                message: 'Pay this invoice to open tracking and chat with the winch driver.'
            } : null
        };
    }

    /**
     * Resolve socket/chat access for a paid towing booking.
     * Creates the chat room lazily if it does not exist yet.
     */
    async getSocketAccess(bookingId, userId) {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                invoice: {
                    select: {
                        id: true,
                        status: true
                    }
                },
                chatRoom: {
                    select: {
                        id: true
                    }
                },
                customer: {
                    select: {
                        id: true,
                        phone: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                avatar: true
                            }
                        }
                    }
                },
                technician: {
                    select: {
                        id: true,
                        phone: true,
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

        if (!booking) {
            throw new AppError('Booking not found', 404, 'NOT_FOUND');
        }

        const isCustomer = booking.customerId === userId;
        const isDriver = booking.technicianId === userId;

        if (!isCustomer && !isDriver) {
            throw new AppError('Not authorized for this booking', 403, 'FORBIDDEN');
        }

        if (!booking.invoice || booking.invoice.status !== 'PAID') {
            throw new AppError(
                'Payment required before opening tracking and chat',
                403,
                'PAYMENT_REQUIRED'
            );
        }

        let roomId = booking.chatRoom?.id || null;
        if (!roomId) {
            const room = await prisma.chatRoom.create({
                data: { bookingId: booking.id },
                select: { id: true }
            });
            roomId = room.id;
        }

        const counterpart = isCustomer ? booking.technician : booking.customer;

        return {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            roomId,
            socketEnabled: true,
            trackingEnabled: true,
            chatEnabled: true,
            role: isCustomer ? 'customer' : 'driver',
            joinEvent: isCustomer ? 'customer:join_booking' : 'driver:join_booking',
            leaveEvent: isCustomer ? 'customer:leave_booking' : 'driver:leave_booking',
            messageEvent: 'booking:message',
            locationEvent: isCustomer ? 'winch:location_update' : 'driver:location',
            invoice: {
                id: booking.invoice.id,
                status: booking.invoice.status
            },
            counterpart: counterpart ? {
                id: counterpart.id,
                name: `${counterpart.profile?.firstName ?? ''} ${counterpart.profile?.lastName ?? ''}`.trim(),
                phone: counterpart.phone,
                avatar: counterpart.profile?.avatar || null
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