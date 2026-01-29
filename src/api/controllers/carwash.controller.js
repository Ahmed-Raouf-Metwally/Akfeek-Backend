const carWashService = require('../../services/carwash.service');
const { success } = require('../../utils/response');

// Create a new car wash request
exports.requestWash = async (req, res, next) => {
    try {
        const { vehicleId, location, serviceType, notes, estimatedBudget } = req.body;

        const result = await carWashService.createWashRequest(req.user.id, {
            vehicleId,
            location,
            serviceType,
            notes,
            estimatedBudget
        });

        return success(res, result, 'Car wash request broadcasted successfully');
    } catch (error) {
        next(error);
    }
};

// Get offers for a specific broadcast
exports.getOffers = async (req, res, next) => {
    try {
        const { broadcastId } = req.params;
        const result = await carWashService.getOffers(broadcastId, req.user.id);
        return success(res, result, 'Offers retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Accept an offer
exports.acceptOffer = async (req, res, next) => {
    try {
        const { broadcastId, offerId } = req.params;
        const result = await carWashService.acceptOffer(broadcastId, offerId, req.user.id);
        return success(res, result, 'Offer accepted successfully');
    } catch (error) {
        next(error);
    }
};
