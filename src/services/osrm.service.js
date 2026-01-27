const axios = require('axios');

/**
 * OSRM Routing Service
 * Uses Open Source Routing Machine for accurate road-based distance and time calculations
 */

const OSRM_BASE_URL = 'https://router.project-osrm.org';

class OSRMService {
    /**
     * Get route information between two points
     * @param {number} startLng - Starting longitude
     * @param {number} startLat - Starting latitude
     * @param {number} endLng - Ending longitude
     * @param {number} endLat - Ending latitude
     * @returns {Promise<Object>} Route information with distance and duration
     */
    async getRoute(startLng, startLat, endLng, endLat) {
        try {
            // OSRM format: longitude,latitude (NOT latitude,longitude!)
            const url = `${OSRM_BASE_URL}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}`;

            const params = {
                overview: false, // We don't need the full geometry
                alternatives: false, // Just the best route
                steps: false // No turn-by-turn instructions
            };

            const response = await axios.get(url, {
                params,
                timeout: 5000 // 5 second timeout
            });

            if (response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
                throw new Error('No route found');
            }

            const route = response.data.routes[0];

            return {
                distance: route.distance / 1000, // Convert meters to kilometers
                duration: route.duration / 60, // Convert seconds to minutes
                success: true
            };
        } catch (error) {
            console.error('OSRM routing error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate distance and ETA between technician and pickup location
     * Uses OSRM for accuracy, falls back to Haversine if OSRM fails
     */
    async calculateRouteWithFallback(techLat, techLng, pickupLat, pickupLng) {
        // Try OSRM first
        const osrmResult = await this.getRoute(techLng, techLat, pickupLng, pickupLat);

        if (osrmResult.success) {
            return {
                distance: Math.round(osrmResult.distance * 10) / 10, // Round to 1 decimal
                duration: Math.round(osrmResult.duration), // Round to whole minutes
                method: 'OSRM',
                accurate: true
            };
        }

        // Fallback to Haversine formula
        console.log('OSRM failed, using Haversine fallback');
        const distance = this.calculateHaversineDistance(techLat, techLng, pickupLat, pickupLng);

        // Estimate duration based on average speed
        const avgSpeed = 40; // km/h - can be made configurable
        const baseDuration = (distance / avgSpeed) * 60; // Convert to minutes

        // Apply traffic factor based on time of day
        const trafficFactor = this.getTrafficFactor();
        const duration = Math.round(baseDuration * trafficFactor);

        return {
            distance: Math.round(distance * 10) / 10,
            duration,
            method: 'Haversine',
            accurate: false
        };
    }

    /**
     * Calculate straight-line distance using Haversine formula (fallback)
     */
    calculateHaversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance;
    }

    /**
     * Convert degrees to radians
     */
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get traffic factor based on current time
     */
    getTrafficFactor() {
        const hour = new Date().getHours();

        // Traffic patterns for Saudi Arabia
        if (hour >= 7 && hour <= 9) return 1.5;   // Morning rush
        if (hour >= 12 && hour <= 14) return 1.3; // Lunch time
        if (hour >= 16 && hour <= 19) return 1.6; // Evening rush
        if (hour >= 0 && hour <= 5) return 0.8;   // Late night (faster)

        return 1.0; // Normal traffic
    }

    /**
     * Calculate route distance (for pricing)
     * Gets the actual road distance between pickup and destination
     */
    async calculateTripDistance(pickupLat, pickupLng, destLat, destLng) {
        const result = await this.getRoute(pickupLng, pickupLat, destLng, destLat);

        if (result.success) {
            return {
                distance: Math.round(result.distance * 10) / 10,
                duration: Math.round(result.duration),
                method: 'OSRM'
            };
        }

        // Fallback to Haversine
        const distance = this.calculateHaversineDistance(pickupLat, pickupLng, destLat, destLng);
        const avgSpeed = 40;
        const duration = Math.round((distance / avgSpeed) * 60);

        return {
            distance: Math.round(distance * 10) / 10,
            duration,
            method: 'Haversine'
        };
    }
}

module.exports = new OSRMService();
