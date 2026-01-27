const towingService = require('../../services/towing.service');

class TowingController {
    /**
     * Create towing request
     * POST /api/bookings/towing/request
     */
    async createRequest(req, res, next) {
        try {
            const customerId = req.user.id;
            const result = await towingService.createTowingRequest(customerId, req.body);

            res.status(201).json({
                success: true,
                message: 'Towing request created successfully',
                messageAr: 'تم إنشاء طلب السحب بنجاح',
                data: result
            });
        } catch (error) {
            console.error('Towing request error:', error);
            next(error);
        }
    }

    /**
     * Get offers for broadcast
     * GET /api/bookings/towing/:broadcastId/offers
     */
    async getOffers(req, res, next) {
        try {
            const {
                broadcastId
            } = req.params;
            const customerId = req.user.id;

            const result = await towingService.getOffers(broadcastId, customerId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Accept offer
     * POST /api/bookings/towing/:broadcastId/offers/:offerId/accept
     */
    async acceptOffer(req, res, next) {
        try {
            const {
                broadcastId,
                offerId
            } = req.params;
            const customerId = req.user.id;

            const result = await towingService.acceptOffer(broadcastId, offerId, customerId);

            res.json({
                success: true,
                message: 'Offer accepted successfully',
                messageAr: 'تم قبول العرض بنجاح',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TowingController();