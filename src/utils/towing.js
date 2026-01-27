const { getSystemSetting } = require('./systemSettings');
const osrmService = require('../services/osrm.service');

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate ETA (Estimated Time of Arrival) using OSRM for accurate routing
 * @param {number} technicianLat - Technician latitude
 * @param {number} technicianLng - Technician longitude
 * @param {number} pickupLat - Pickup location latitude
 * @param {number} pickupLng - Pickup location longitude
 * @returns {Promise<Object>} Object with distance, etaMinutes, and estimatedArrival
 */
async function calculateETA(technicianLat, technicianLng, pickupLat, pickupLng) {
    // Use OSRM for accurate road-based routing
    const route = await osrmService.calculateRouteWithFallback(
        technicianLat,
        technicianLng,
        pickupLat,
        pickupLng
    );

    return {
        distance: route.distance,
        etaMinutes: route.duration,
        estimatedArrival: new Date(Date.now() + route.duration * 60000),
        routingMethod: route.method, // 'OSRM' or 'Haversine'
        accurate: route.accurate // true if OSRM, false if fallback
    };
}

/**
 * Calculate towing service price
 * @param {number} distance - Distance in kilometers
 * @param {string} urgency - Urgency level ('NORMAL', 'HIGH')
 * @param {Date} requestTime - Time of request
 * @returns {Promise<Object>} Price breakdown
 */
async function calculateTowingPrice(distance, urgency = 'NORMAL', requestTime = new Date()) {
    // Get dynamic settings from admin dashboard
    const BASE_FEE = await getSystemSetting('TOWING_BASE_PRICE', 50);
    const PER_KM_RATE = await getSystemSetting('TOWING_PRICE_PER_KM', 5);
    const NIGHT_SURGE = await getSystemSetting('TOWING_NIGHT_SURGE', 1.3);
    const URGENT_SURGE = await getSystemSetting('TOWING_URGENT_SURGE', 1.2);

    let price = BASE_FEE + (distance * PER_KM_RATE);
    let surgeMultiplier = 1.0;
    let surgeReasons = [];

    // Apply night surge (10 PM - 6 AM)
    const hour = requestTime.getHours();
    const isNightTime = hour >= 22 || hour < 6;

    if (isNightTime) {
        surgeMultiplier *= NIGHT_SURGE;
        surgeReasons.push('Night time (10 PM - 6 AM)');
    }

    // Apply urgent surge
    if (urgency === 'HIGH') {
        surgeMultiplier *= URGENT_SURGE;
        surgeReasons.push('Urgent request');
    }

    const finalPrice = Math.round(price * surgeMultiplier);

    return {
        basePrice: Math.round(price),
        surgeMultiplier,
        surgeReasons,
        finalPrice,
        breakdown: {
            baseFee: BASE_FEE,
            distanceFee: distance * PER_KM_RATE,
            distance: Math.round(distance * 10) / 10
        }
    };
}

/**
 * Find nearby technicians who can provide towing service
 * @param {number} latitude - Pickup location latitude
 * @param {number} longitude - Pickup location longitude
 * @returns {Promise<Array>} Array of nearby technicians with ETA
 */
async function findNearbyTechnicians(latitude, longitude) {
    const prisma = require('./database/prisma');

    // Get search radius from admin settings
    const radiusKm = await getSystemSetting('TOWING_SEARCH_RADIUS', 10);

    // Get active technicians with towing service
    const technicians = await prisma.user.findMany({
        where: {
            role: 'TECHNICIAN',
            status: 'ACTIVE',
            profile: {
                isAvailable: true,
                currentLat: { not: null },
                currentLng: { not: null }
            }
        },
        include: {
            profile: {
                select: {
                    currentLat: true,
                    currentLng: true,
                    specializations: true
                }
            }
        }
    });

    // Filter by distance and calculate ETA for each
    const nearbyTechs = [];

    for (const tech of technicians) {
        const distance = calculateDistance(
            latitude,
            longitude,
            tech.profile.currentLat,
            tech.profile.currentLng
        );

        if (distance <= radiusKm) {
            // Calculate ETA
            const eta = await calculateETA(
                tech.profile.currentLat,
                tech.profile.currentLng,
                latitude,
                longitude
            );

            nearbyTechs.push({
                technicianId: tech.id,
                name: tech.profile?.firstName + ' ' + tech.profile?.lastName,
                distance: eta.distance,
                etaMinutes: eta.etaMinutes,
                estimatedArrival: eta.estimatedArrival
            });
        }
    }

    // Sort by distance (closest first)
    nearbyTechs.sort((a, b) => a.distance - b.distance);

    return nearbyTechs;
}

module.exports = {
    calculateDistance,
    calculateETA,
    calculateTowingPrice,
    findNearbyTechnicians
};
