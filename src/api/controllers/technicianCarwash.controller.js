const technicianCarWashService = require('../../services/technicianCarwash.service');
const { success } = require('../../utils/response');

// Get active car wash broadcasts
exports.getBroadcasts = async (req, res, next) => {
    try {
        const result = await technicianCarWashService.getActiveBroadcasts(req.user.id);
        return success(res, result, 'Active car wash broadcasts retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Submit an offer for a broadcast
exports.submitOffer = async (req, res, next) => {
    try {
        const { broadcastId } = req.params;
        const { bidAmount, message, estimatedArrival } = req.body;

        const result = await technicianCarWashService.submitOffer(req.user.id, broadcastId, {
            bidAmount,
            message,
            estimatedArrival
        });

        return success(res, result, 'Offer submitted successfully');
    } catch (error) {
        next(error);
    }
};
