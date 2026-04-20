const prisma = require('../utils/database/prisma');
const { BookingStatus } = require('@prisma/client');
const { calculateDistance, calculateETA } = require('../utils/towing');
const { getSystemSetting } = require('../utils/systemSettings');
const { AppError } = require('../api/middlewares/error.middleware');
const { getUrgencyLabels, getVehicleConditionLabels } = require('../utils/broadcastDisplayLabels');
const socketModule = require('../socket');

/**
 * Get winch for current vendor (userId = vendor.userId)
 */
async function getWinchByVendorUserId(userId) {
    const vendor = await prisma.vendorProfile.findFirst({
        where: { userId, vendorType: 'TOWING_SERVICE' },
        include: { winch: true }
    });
    if (!vendor?.winch) return null;
    return { ...vendor.winch, vendor: { userId: vendor.userId, businessName: vendor.businessName, businessNameAr: vendor.businessNameAr } };
}

/**
 * طلبات السحب (البثوط) القريبة من ونشي — للفيندور صاحب الوينش
 */
async function getActiveBroadcastsForWinch(vendorUserId) {
    const winch = await getWinchByVendorUserId(vendorUserId);
    if (!winch) {
        throw new AppError('No winch linked to your vendor account', 404, 'NO_WINCH');
    }
    if (!winch.isActive || !winch.isAvailable) {
        return { broadcasts: [], message: 'Your winch is not available. Enable it to receive requests.' };
    }
    if (winch.latitude == null || winch.longitude == null) {
        return { broadcasts: [], message: 'Update your winch location to receive requests.' };
    }

    // Search radius (kept as default constant; removed admin knob)
    const radiusKm = 10;

    const broadcasts = await prisma.jobBroadcast.findMany({
        where: {
            status: 'BROADCASTING',
            broadcastUntil: { gt: new Date() }
        },
        include: {
            booking: {
                select: {
                    id: true,
                    pickupLat: true,
                    pickupLng: true,
                    pickupAddress: true,
                    destinationLat: true,
                    destinationLng: true,
                    destinationAddress: true,
                    metadata: true,
                    vehicle: {
                        select: {
                            id: true,
                            plateDigits: true,
                            plateLettersEn: true,
                            vehicleModel: { select: { name: true, year: true, brand: { select: { name: true } } } }
                        }
                    },
                    customer: {
                        select: {
                            profile: { select: { firstName: true, lastName: true, avatar: true } }
                        }
                    }
                }
            },
            offers: {
                where: { winchId: winch.id },
                select: { id: true, bidAmount: true, status: true, createdAt: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const nearby = [];
    for (const b of broadcasts) {
        const dist = calculateDistance(winch.latitude, winch.longitude, b.latitude, b.longitude);
        if (dist > radiusKm) continue;
        let etaMinutes = 0;
        try {
            const eta = await calculateETA(winch.latitude, winch.longitude, b.latitude, b.longitude);
            etaMinutes = eta.etaMinutes;
        } catch (_) {
            etaMinutes = Math.round((dist / 50) * 60);
        }
        const booking = b.booking;
        const tripDistance = booking.metadata?.distance ?? 0;
        const myPrice = calculateWinchPrice(winch, tripDistance);

        const urgencyVal = b.urgency ?? 'NORMAL';
        const vehicleCond = booking.metadata?.vehicleCondition;
        nearby.push({
            id: b.id,
            customer: {
                name: `${booking.customer?.profile?.firstName ?? ''} ${booking.customer?.profile?.lastName ?? ''}`.trim(),
                avatar: booking.customer?.profile?.avatar
            },
            vehicle: booking.vehicle,
            pickupLocation: {
                latitude: b.latitude,
                longitude: b.longitude,
                address: b.locationAddress
            },
            destinationLocation: {
                latitude: booking.destinationLat,
                longitude: booking.destinationLng,
                address: booking.destinationAddress
            },
            distance: dist,
            tripDistanceKm: tripDistance,
            estimatedArrival: etaMinutes,
            yourPrice: myPrice,
            urgency: urgencyVal,
            ...getUrgencyLabels(urgencyVal),
            vehicleCondition: vehicleCond,
            ...getVehicleConditionLabels(vehicleCond),
            expiresAt: b.broadcastUntil,
            myOffer: b.offers[0] || null,
            createdAt: b.createdAt
        });
    }

    return { broadcasts: nearby };
}

/**
 * سعر الرحلة حسب basePrice + pricePerKm * distance (مع minPrice)
 */
function calculateWinchPrice(winch, distanceKm) {
    const base = Number(winch.basePrice) || 0;
    const perKm = Number(winch.pricePerKm) || 0;
    const min = Number(winch.minPrice) || 0;
    let price = base + distanceKm * perKm;
    if (min > 0 && price < min) price = min;
    return Math.round(price * 100) / 100;
}

/**
 * الوينش يوافق ويرسل عرض — السعر يُحسب من سعر الكم تلقائياً
 */
async function submitWinchOffer(vendorUserId, broadcastId, data) {
    const winch = await getWinchByVendorUserId(vendorUserId);
    if (!winch) throw new AppError('No winch linked to your vendor account', 404, 'NO_WINCH');
    if (!winch.isActive || !winch.isAvailable) {
        throw new AppError('Your winch must be active and available to submit offers', 400, 'WINCH_UNAVAILABLE');
    }

    const broadcast = await prisma.jobBroadcast.findUnique({
        where: { id: broadcastId },
        include: {
            booking: {
                select: {
                    id: true,
                    customerId: true,
                    metadata: true,
                    pickupLat: true,
                    pickupLng: true
                }
            }
        }
    });

    if (!broadcast) throw new AppError('Broadcast not found', 404, 'BROADCAST_NOT_FOUND');
    if (broadcast.status !== 'BROADCASTING') {
        throw new AppError('Broadcast is no longer active', 400, 'INVALID_STATUS');
    }
    if (new Date() > new Date(broadcast.broadcastUntil)) {
        throw new AppError('Broadcast has expired', 400, 'EXPIRED');
    }

    const existing = await prisma.jobOffer.findFirst({
        where: { broadcastId, winchId: winch.id }
    });
    if (existing) throw new AppError('You have already submitted an offer for this request', 400, 'DUPLICATE_OFFER');

    const distanceKm = broadcast.booking.metadata?.distance ?? 0;
    const bidAmount = calculateWinchPrice(winch, distanceKm);

    let etaMinutes = 0;
    if (winch.latitude != null && winch.longitude != null) {
        try {
            const eta = await calculateETA(winch.latitude, winch.longitude, broadcast.latitude, broadcast.longitude);
            etaMinutes = eta.etaMinutes;
        } catch (_) {}
    }

    const distToPickup = winch.latitude != null && winch.longitude != null
        ? calculateDistance(winch.latitude, winch.longitude, broadcast.latitude, broadcast.longitude)
        : 0;

    const driverUserId = winch.vendor?.userId ?? null;

    const offer = await prisma.jobOffer.create({
        data: {
            broadcastId,
            winchId: winch.id,
            technicianId: driverUserId,
            bidAmount,
            message: data.message ?? null,
            estimatedArrival: etaMinutes,
            status: 'PENDING',
            technicianLat: winch.latitude,
            technicianLng: winch.longitude,
            distanceKm: distToPickup
        },
        include: {
            winch: {
                select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    vendor: { select: { businessName: true, businessNameAr: true } }
                }
            }
        }
    });

    // DB Notification (Customer): offer received from winch/vendor
    try {
        await prisma.notification.create({
            data: {
                userId: broadcast.booking.customerId,
                type: 'OFFER_RECEIVED',
                title: 'New winch offer received',
                titleAr: 'تم استلام عرض ونش جديد',
                message: `A winch offered ${Number(bidAmount)} SAR.`,
                messageAr: `تم استلام عرض ونش بقيمة ${Number(bidAmount)} ر.س.`,
                bookingId: broadcast.booking.id,
                metadata: { broadcastId, offerId: offer.id, winchId: winch.id, bidAmount: Number(bidAmount) }
            }
        });
    } catch (_) { /* non-blocking */ }

    return {
        offer: {
            id: offer.id,
            broadcastId: offer.broadcastId,
            bidAmount: Number(offer.bidAmount),
            message: offer.message,
            estimatedArrival: offer.estimatedArrival,
            status: offer.status,
            createdAt: offer.createdAt
        }
    };
}

/**
 * مهام الوينش المحددة له — الفيندور فقط (مش الفني): الحجوزات اللي العميل اختار عرض هذا الوينش
 */
async function getAssignedJobsForWinch(vendorUserId) {
    const winch = await getWinchByVendorUserId(vendorUserId);
    if (!winch) {
        throw new AppError('No winch linked to your vendor account', 404, 'NO_WINCH');
    }
    const selectedOffers = await prisma.jobOffer.findMany({
        where: { winchId: winch.id, isSelected: true },
        select: { broadcastId: true }
    });
    const broadcastIds = selectedOffers.map((o) => o.broadcastId);
    if (broadcastIds.length === 0) {
        return { jobs: [] };
    }
    const broadcasts = await prisma.jobBroadcast.findMany({
        where: { id: { in: broadcastIds } },
        select: { bookingId: true }
    });
    const bookingIds = broadcasts.map((b) => b.bookingId);
    const jobs = await prisma.booking.findMany({
        where: {
            id: { in: bookingIds },
            status: {
                in: [
                    BookingStatus.TECHNICIAN_ASSIGNED,
                    BookingStatus.TECHNICIAN_EN_ROUTE,
                    BookingStatus.ARRIVED,
                    BookingStatus.IN_PROGRESS
                ]
            }
        },
        select: {
            id: true,
            bookingNumber: true,
            status: true,
            totalPrice: true,
            subtotal: true,
            pickupLat: true,
            pickupLng: true,
            pickupAddress: true,
            destinationLat: true,
            destinationLng: true,
            destinationAddress: true,
            createdAt: true,
            updatedAt: true,
            customer: {
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    profile: {
                        select: {
                            firstName: true,
                            lastName: true,
                            avatar: true
                        }
                    }
                },
            },
            vehicle: true
        },
        orderBy: { updatedAt: 'desc' }
    });
    return {
        jobs: jobs.map((b) => ({
            ...b,
            pickupLocation: {
                latitude: b.pickupLat ?? null,
                longitude: b.pickupLng ?? null,
                address: b.pickupAddress ?? null,
            },
            destinationLocation: {
                latitude: b.destinationLat ?? null,
                longitude: b.destinationLng ?? null,
                address: b.destinationAddress ?? null,
            },
        }))
    };
}

/**
 * تحديث حالة المهمة من طرف فيندور الوينش فقط (انطلاق → في الطريق → بدء العمل → مكتمل)
 */
async function updateWinchJobStatus(vendorUserId, bookingId, newStatus) {
    const winch = await getWinchByVendorUserId(vendorUserId);
    if (!winch) {
        throw new AppError('No winch linked to your vendor account', 404, 'NO_WINCH');
    }
    const broadcast = await prisma.jobBroadcast.findFirst({
        where: { bookingId },
        include: {
            offers: {
                where: { winchId: winch.id, isSelected: true },
                take: 1
            }
        }
    });
    if (!broadcast || !broadcast.offers?.length) {
        throw new AppError('Booking not assigned to your winch', 403, 'FORBIDDEN');
    }
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
    });
    if (!booking) {
        throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    }


    const validTransitions = {
        [BookingStatus.TECHNICIAN_ASSIGNED]: [BookingStatus.TECHNICIAN_EN_ROUTE],
        [BookingStatus.TECHNICIAN_EN_ROUTE]: [BookingStatus.ARRIVED],
        [BookingStatus.ARRIVED]: [BookingStatus.IN_PROGRESS],
        [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED]
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
            ...(newStatus === BookingStatus.COMPLETED && { completedAt: new Date() })
        }
    });

    // Socket: notify customer (and driver) of status change in real-time
    try {
        socketModule.emitBookingStatusChange(bookingId, {
            bookingId,
            status: newStatus,
            previousStatus: booking.status,
            source: 'winch'
        });
    } catch (_) { /* non-blocking */ }

    // DB Notification (Customer): status update from winch
    try {
        await prisma.notification.create({
            data: {
                userId: booking.customerId,
                type: 'STATUS_UPDATE',
                title: 'Status updated',
                titleAr: 'تم تحديث الحالة',
                message: `Your towing status is now ${newStatus}.`,
                messageAr: `تم تحديث حالة السحب إلى ${newStatus}.`,
                bookingId: booking.id,
                metadata: { fromStatus: booking.status, toStatus: newStatus, source: 'winch' }
            }
        });
    } catch (_) { /* non-blocking */ }
    return {
        booking: {
            id: updatedBooking.id,
            status: updatedBooking.status,
            completedAt: updatedBooking.completedAt
        }
    };
}

module.exports = {
    getWinchByVendorUserId,
    getActiveBroadcastsForWinch,
    submitWinchOffer,
    calculateWinchPrice,
    getAssignedJobsForWinch,
    updateWinchJobStatus
};
