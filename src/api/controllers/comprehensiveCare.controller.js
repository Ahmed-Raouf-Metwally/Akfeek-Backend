const vendorService = require('../../services/vendor.service');

/**
 * Comprehensive Care Controller
 */
class ComprehensiveCareController {
    /**
     * Get all comprehensive care providers (Merged)
     * GET /api/comprehensive-care/providers
     */
    async getProviders(req, res, next) {
        try {
            const { city, search } = req.query;
            const providers = await vendorService.getComprehensiveCareProviders({ city, search });

            res.json({
                success: true,
                data: providers
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ComprehensiveCareController();
