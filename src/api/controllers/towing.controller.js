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
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get towing quote (price + time) without creating booking
     * POST /api/bookings/towing/quote
     */
    async createQuote(req, res, next) {
        try {
            const customerId = req.user.id;
            const result = await towingService.createTowingQuote(customerId, req.body);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get my towing requests/services with status (active/completed/all)
     * GET /api/bookings/towing/my
     */
    async getMyTowingRequests(req, res, next) {
        try {
            const customerId = req.user.id;
            const { status } = req.query;
            const result = await towingService.getMyTowingRequests(customerId, status);
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get broadcast details (for customer who created the request)
     * GET /api/bookings/towing/:broadcastId
     */
    async getBroadcastDetails(req, res, next) {
        try {
            const { broadcastId } = req.params;
            const customerId = req.user.id;
            const result = await towingService.getBroadcastDetails(broadcastId, customerId);
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
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
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get socket/chat access details for paid towing booking
     * GET /api/bookings/towing/booking/:bookingId/socket-access
     */
    async getSocketAccess(req, res, next) {
        try {
            const { bookingId } = req.params;
            const userId = req.user.id;

            const result = await towingService.getSocketAccess(bookingId, userId);

            res.json({
                success: true,
                message: 'Socket access resolved successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TowingController();