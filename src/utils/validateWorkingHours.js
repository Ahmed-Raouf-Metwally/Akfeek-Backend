/**
 * Working Hours Validation Utility
 * Validates workshop working hours format and logic
 */

/**
 * Validate working hours object
 * Expected format: { "sunday": { "open": "08:00", "close": "18:00" }, ... }
 * 
 * @param {Object} workingHours - Working hours object
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
function validateWorkingHours(workingHours) {
    const errors = [];

    // Check if workingHours is provided and is an object
    if (!workingHours || typeof workingHours !== 'object') {
        return {
            isValid: false,
            errors: ['Working hours must be a valid object']
        };
    }

    const validDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm format (00:00 - 23:59)

    // Validate each day
    Object.keys(workingHours).forEach(day => {
        const dayLower = day.toLowerCase();

        // Check if day is valid
        if (!validDays.includes(dayLower)) {
            errors.push(`Invalid day: ${day}. Must be one of: ${validDays.join(', ')}`);
            return;
        }

        const hours = workingHours[day];

        // Check if day has hours object
        if (!hours || typeof hours !== 'object') {
            errors.push(`${day}: Hours must be an object with 'open' and 'close' times`);
            return;
        }

        // Check for closed day (null or { closed: true })
        if (hours === null || hours.closed === true) {
            return; // Closed day is valid
        }

        // Validate open time
        if (!hours.open) {
            errors.push(`${day}: Missing 'open' time`);
        } else if (!timeRegex.test(hours.open)) {
            errors.push(`${day}: Invalid 'open' time format. Use HH:mm (e.g., 08:00)`);
        }

        // Validate close time
        if (!hours.close) {
            errors.push(`${day}: Missing 'close' time`);
        } else if (!timeRegex.test(hours.close)) {
            errors.push(`${day}: Invalid 'close' time format. Use HH:mm (e.g., 18:00)`);
        }

        // Validate open < close
        if (hours.open && hours.close && timeRegex.test(hours.open) && timeRegex.test(hours.close)) {
            const openMinutes = timeToMinutes(hours.open);
            const closeMinutes = timeToMinutes(hours.close);

            if (openMinutes >= closeMinutes) {
                errors.push(`${day}: Opening time (${hours.open}) must be before closing time (${hours.close})`);
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Convert time string to minutes since midnight
 * @param {string} time - Time in HH:mm format
 * @returns {number} Minutes since midnight
 */
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Check if workshop is open at a specific time
 * @param {Object} workingHours - Working hours object
 * @param {Date} dateTime - Date and time to check
 * @returns {boolean} True if workshop is open
 */
function isWorkshopOpen(workingHours, dateTime = new Date()) {
    if (!workingHours) return false;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dateTime.getDay()];

    const dayHours = workingHours[dayName];

    // Check if closed
    if (!dayHours || dayHours.closed === true) {
        return false;
    }

    // Get current time in HH:mm format
    const currentTime = dateTime.toTimeString().slice(0, 5);
    const currentMinutes = timeToMinutes(currentTime);
    const openMinutes = timeToMinutes(dayHours.open);
    const closeMinutes = timeToMinutes(dayHours.close);

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Get default working hours template
 * @returns {Object} Default working hours (9 AM - 6 PM, Sunday-Thursday)
 */
function getDefaultWorkingHours() {
    return {
        sunday: { open: '09:00', close: '18:00' },
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { closed: true },
        saturday: { closed: true }
    };
}

module.exports = {
    validateWorkingHours,
    isWorkshopOpen,
    timeToMinutes,
    getDefaultWorkingHours
};
