const workshopReviewService = require('../../services/workshopReview.service');

/**
 * Workshop Review Controller
 * Handles HTTP requests for workshop reviews
 */
class WorkshopReviewController {
    /**
     * Create a new review
     * POST /api/workshops/:id/reviews
     */
    async createReview(req, res, next) {
        try {
            const { id: workshopId } = req.params;
            const userId = req.user.id;
            const { bookingId, rating, comment, commentAr } = req.body;

            const review = await workshopReviewService.createReview({
                workshopId,
                userId,
                bookingId,
                rating,
                comment,
                commentAr
            });

            res.status(201).json({
                success: true,
                message: 'Review created successfully',
                messageAr: 'تم إنشاء التقييم بنجاح',
                data: review
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get workshop reviews (public)
     * GET /api/workshops/:id/reviews
     */
    async getWorkshopReviews(req, res, next) {
        try {
            const { id: workshopId } = req.params;
            const { page, limit, rating, isVerified } = req.query;

            const result = await workshopReviewService.getWorkshopReviews(workshopId, {
                page,
                limit,
                rating,
                isVerified
            });

            res.json({
                success: true,
                data: result.reviews,
                pagination: result.pagination
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get workshop reviews (admin)
     * GET /api/workshops/admin/:id/reviews
     */
    async getWorkshopReviewsAdmin(req, res, next) {
        try {
            const { id: workshopId } = req.params;
            const { page, limit, isApproved } = req.query;

            const result = await workshopReviewService.getWorkshopReviewsAdmin(workshopId, {
                page,
                limit,
                isApproved
            });

            res.json({
                success: true,
                data: result.reviews,
                pagination: result.pagination
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update review approval status
     * PATCH /api/workshops/admin/reviews/:id/approve
     */
    async updateReviewApproval(req, res, next) {
        try {
            const { id: reviewId } = req.params;
            const { isApproved } = req.body;

            const review = await workshopReviewService.updateReviewApproval(reviewId, isApproved);

            res.json({
                success: true,
                message: isApproved ? 'Review approved' : 'Review hidden',
                messageAr: isApproved ? 'تم الموافقة على التقييم' : 'تم إخفاء التقييم',
                data: review
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a review
     * DELETE /api/workshops/admin/reviews/:id
     */
    async deleteReview(req, res, next) {
        try {
            const { id: reviewId } = req.params;

            await workshopReviewService.deleteReview(reviewId);

            res.json({
                success: true,
                message: 'Review deleted successfully',
                messageAr: 'تم حذف التقييم بنجاح'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Add workshop response to review
     * POST /api/workshops/admin/reviews/:id/response
     */
    async addWorkshopResponse(req, res, next) {
        try {
            const { id: reviewId } = req.params;
            const { response, responseAr } = req.body;

            const review = await workshopReviewService.addWorkshopResponse(reviewId, {
                response,
                responseAr
            });

            res.json({
                success: true,
                message: 'Response added successfully',
                messageAr: 'تم إضافة الرد بنجاح',
                data: review
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get review statistics
     * GET /api/workshops/:id/reviews/stats
     */
    async getReviewStats(req, res, next) {
        try {
            const { id: workshopId } = req.params;

            const stats = await workshopReviewService.getReviewStats(workshopId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new WorkshopReviewController();
