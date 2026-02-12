const feedbackService = require('../../services/feedback.service');
const {
    createFeedbackSchema,
    updateStatusSchema,
    updatePrioritySchema,
    replySchema,
    listFiltersSchema
} = require('../validations/feedback.validation');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Feedback Controller
 * Handles HTTP request validation and response formatting
 */
class FeedbackController {
    // --- USER ENDPOINTS ---

    async createFeedback(req, res, next) {
        try {
            const { error, value } = createFeedbackSchema.validate(req.body);
            if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');

            const feedback = await feedbackService.createFeedback(req.user.id, value);

            res.status(201).json({
                success: true,
                message: 'Feedback submitted successfully',
                messageAr: 'تم إرسال ملاحظاتك بنجاح',
                data: feedback
            });
        } catch (error) {
            next(error);
        }
    }

    async getMyFeedbacks(req, res, next) {
        try {
            const { page, limit } = req.query;
            const result = await feedbackService.getMyFeedbacks(req.user.id, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10
            });

            res.json({
                success: true,
                data: result.feedbacks,
                pagination: result.pagination
            });
        } catch (error) {
            next(error);
        }
    }

    async getFeedbackDetail(req, res, next) {
        try {
            const { id } = req.params;
            const feedback = await feedbackService.getFeedbackDetail(id, req.user.id, req.user.role);

            res.json({
                success: true,
                data: feedback
            });
        } catch (error) {
            next(error);
        }
    }

    // --- ADMIN ENDPOINTS ---

    async getAllFeedbacksAdmin(req, res, next) {
        try {
            const { error, value } = listFiltersSchema.validate(req.query);
            if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');

            const { page, limit, ...filters } = value;
            const result = await feedbackService.getAllFeedbacksAdmin(filters, { page, limit });

            res.json({
                success: true,
                data: result.feedbacks,
                pagination: result.pagination
            });
        } catch (error) {
            next(error);
        }
    }

    async updateStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { error, value } = updateStatusSchema.validate(req.body);
            if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');

            const feedback = await feedbackService.updateStatus(id, req.user.id, value.status, value.notes);

            res.json({
                success: true,
                message: 'Feedback status updated',
                messageAr: 'تم تحديث حالة الملاحظات',
                data: feedback
            });
        } catch (error) {
            next(error);
        }
    }

    async updatePriority(req, res, next) {
        try {
            const { id } = req.params;
            const { error, value } = updatePrioritySchema.validate(req.body);
            if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');

            const feedback = await feedbackService.updatePriority(id, req.user.id, value.priority);

            res.json({
                success: true,
                message: 'Feedback priority updated',
                messageAr: 'تم تحديث أهمية الملاحظات',
                data: feedback
            });
        } catch (error) {
            next(error);
        }
    }

    async replyToFeedback(req, res, next) {
        try {
            const { id } = req.params;
            const { error, value } = replySchema.validate(req.body);
            if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');

            const reply = await feedbackService.replyToFeedback(id, req.user.id, value.message);

            res.status(201).json({
                success: true,
                message: 'Reply sent successfully',
                messageAr: 'تم إرسال الرد بنجاح',
                data: reply
            });
        } catch (error) {
            next(error);
        }
    }

    async softDeleteFeedback(req, res, next) {
        try {
            const { id } = req.params;
            await feedbackService.softDeleteFeedback(id);

            res.json({
                success: true,
                message: 'Feedback deleted successfully',
                messageAr: 'تم حذف الملاحظات بنجاح'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new FeedbackController();
