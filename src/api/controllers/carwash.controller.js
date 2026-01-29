const catchAsync = require('../middlewares/async.middleware');
const carWashService = require('../../services/carwash.service');
const { success } = require('../../utils/response');

// Create a new car wash request
exports.requestWash = catchAsync(async (req, res) => {
    const { vehicleId, location, serviceType, notes, estimatedBudget } = req.body;

    const result = await carWashService.createWashRequest(req.user.id, {
        vehicleId,
        location,
        serviceType,
        notes,
        estimatedBudget
    });

    return success(res, result, 'Car wash request broadcasted successfully');
});

// Get offers for a specific broadcast
exports.getOffers = catchAsync(async (req, res) => {
    const { broadcastId } = req.params;
    const result = await carWashService.getOffers(broadcastId, req.user.id);
    return success(res, result, 'Offers retrieved successfully');
});

// Accept an offer
exports.acceptOffer = catchAsync(async (req, res) => {
    const { broadcastId, offerId } = req.params;
    const result = await carWashService.acceptOffer(broadcastId, offerId, req.user.id);
    return success(res, result, 'Offer accepted successfully');
});
