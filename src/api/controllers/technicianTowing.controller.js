const technicianTowingService = require('../../services/technicianTowing.service');

class TechnicianTowingController {
    /**
     * Get active broadcasts
     * GET /api/technician/towing/broadcasts
     */
    async getBroadcasts(req, res, next) {
        try {
            const technicianId = req.user.id;
            const result = await technicianTowingService.getActiveBroadcasts(technicianId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Submit offer
     * POST /api/technician/towing/broadcasts/:broadcastId/offer
     */
    async submitOffer(req, res, next) {
        try {
            const technicianId = req.user.id;
            const { broadcastId } = req.params;

            const result = await technicianTowingService.submitOffer(
                technicianId,
                broadcastId,
                req.body
            );

            res.status(201).json({
                success: true,
                message: 'Offer submitted successfully',
                messageAr: 'تم إرسال العرض بنجاح',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get assigned jobs
     * GET /api/technician/towing/jobs
     */
    async getJobs(req, res, next) {
        try {
            const technicianId = req.user.id;
            const result = await technicianTowingService.getAssignedJobs(technicianId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update job status
     * PATCH /api/technician/towing/jobs/:jobId/status
     */
    async updateJobStatus(req, res, next) {
        try {
            const technicianId = req.user.id;
            const { jobId } = req.params;
            const { status } = req.body;

            const result = await technicianTowingService.updateJobStatus(
                technicianId,
                jobId,
                status
            );

            res.json({
                success: true,
                message: 'Job status updated successfully',
                messageAr: 'تم تحديث حالة المهمة بنجاح',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TechnicianTowingController();
