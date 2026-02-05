/**
 * Google Maps URL Parser Utility
 * Extracts latitude and longitude from different Google Maps URL formats
 */

/**
 * Extract coordinates from Google Maps URL
 * Supports various formats:
 * - https://maps.google.com/?q=24.7136,46.6753
 * - https://www.google.com/maps/place/.../@24.7136,46.6753,17z
 * - https://www.google.com/maps/@24.7136,46.6753,15z
 * - https://maps.app.goo.gl/... (requires redirect resolution, returns null)
 * - https://goo.gl/maps/... (requires redirect resolution, returns null)
 * 
 * @param {string} url - Google Maps URL
 * @returns {{latitude: number, longitude: number} | null} Coordinates or null if invalid
 */
const axios = require('axios');

/**
 * Extract coordinates from Google Maps URL
 * Supports various formats including short links (goo.gl, maps.app.goo.gl)
 * 
 * @param {string} url - Google Maps URL
 * @returns {Promise<{latitude: number, longitude: number} | null>} Coordinates object or null
 */
async function parseGoogleMapsUrl(url) {
    if (!url) return null;

    try {
        let finalUrl = url;

        // Handle short URLs by following redirects
        if (url.includes('goo.gl') || url.includes('maps.app.goo.gl') || url.includes('bit.ly')) {
            try {
                const response = await axios.head(url, {
                    maxRedirects: 5,
                    validateStatus: (status) => status >= 200 && status < 400,
                });
                // Axios follows redirects by default, so response.request.res.responseUrl is the final URL
                finalUrl = response.request.res.responseUrl || url;
                console.log('📍 Expanded URL:', finalUrl);
            } catch (error) {
                console.warn('⚠️ Failed to expand short URL:', error.message);
                // Continue trying to parse the original URL just in case
            }
        }

        // Pattern 1: ?q=lat,lng
        const queryPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
        const queryMatch = finalUrl.match(queryPattern);

        if (queryMatch) {
            return {
                latitude: parseFloat(queryMatch[1]),
                longitude: parseFloat(queryMatch[2]),
            };
        }

        // Pattern 2: /@lat,lng,zoom
        const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,\d+\.?\d*)?z?/;
        const atMatch = finalUrl.match(atPattern);
        if (atMatch) {
            return {
                latitude: parseFloat(atMatch[1]),
                longitude: parseFloat(atMatch[2]),
            };
        }

        // Pattern 3: /place/NAME/@lat,lng
        const placePattern = /\/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
        const placeMatch = finalUrl.match(placePattern);
        if (placeMatch) {
            return {
                latitude: parseFloat(placeMatch[1]),
                longitude: parseFloat(placeMatch[2]),
            };
        }

        // Pattern 4: ll=lat,lng (alternative query parameter)
        const llPattern = /[&?]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
        const llMatch = finalUrl.match(llPattern);
        if (llMatch) {
            return {
                latitude: parseFloat(llMatch[1]),
                longitude: parseFloat(llMatch[2]),
            };
        }

        // Pattern 5: !3dlat!4dlng (embedded map format)
        const embedPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
        const embedMatch = finalUrl.match(embedPattern);

        if (embedMatch) {
            console.log('📍latitude:', parseFloat(embedMatch[1]));
            console.log('📍longitude:', parseFloat(embedMatch[2]));
            return {
                latitude: parseFloat(embedMatch[1]),
                longitude: parseFloat(embedMatch[2]),
            };
        }

        return null;
    } catch (error) {
        console.error('Error parsing Google Maps URL:', error);
        return null;
    }
}

/**
 * Validate coordinates
 * @param {number} latitude
 * @param {number} longitude
 * @returns {boolean}
 */
function isValidCoordinates(latitude, longitude) {
    return (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        !isNaN(latitude) &&
        !isNaN(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

module.exports = {
    parseGoogleMapsUrl,
    isValidCoordinates,
};
