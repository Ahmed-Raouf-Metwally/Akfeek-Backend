const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');

/**
 * Workshop Review Service
 * Business logic for workshop reviews and ratings
 */
class WorkshopReviewService {
    /**
     * Create a new review for a workshop
     * @param {Object} data - Review data
     * @returns {Promise<Object>} Created review
     */
    async createReview(data) {
        const { workshopId, userId, bookingId, rating, comment, commentAr } = data;

        // Validate rating (1-5)
        if (rating < 1 || rating > 5) {
            throw new AppError('Rating must be between 1 and 5', 400, 'VALIDATION_ERROR');
        }

        // Check if workshop exists
        const workshop = await prisma.certifiedWorkshop.findUnique({
            where: { id: workshopId }
        });

        if (!workshop) {
            throw new AppError('Workshop not found', 404, 'NOT_FOUND');
        }

        // If bookingId provided, verify it exists and belongs to user
        let isVerified = false;
        if (bookingId) {
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: { workshopReview: true }
            });

            if (!booking) {
                throw new AppError('Booking not found', 404, 'NOT_FOUND');
            }

            if (booking.customerId !== userId) {
                throw new AppError('Booking does not belong to user', 403, 'FORBIDDEN');
            }

            if (booking.workshopId !== workshopId) {
                throw new AppError('Booking is not for this workshop', 400, 'VALIDATION_ERROR');
            }

            if (booking.status !== 'COMPLETED') {
                throw new AppError('Can only review completed bookings', 400, 'VALIDATION_ERROR');
            }

            if (booking.workshopReview) {
                throw new AppError('Booking already has a review', 400, 'ALREADY_EXISTS');
            }

            isVerified = true;
        }

        // Check if user already reviewed this workshop (without booking)
        if (!bookingId) {
            const existingReview = await prisma.workshopReview.findFirst({
                where: {
                    workshopId,
                    userId,
                    bookingId: null
                }
            });

            if (existingReview) {
                throw new AppError('You have already reviewed this workshop', 400, 'ALREADY_EXISTS');
            }
        }

        // Create review
        const review = await prisma.workshopReview.create({
            data: {
                workshopId,
                userId,
                bookingId,
                rating,
                comment,
                commentAr,
                isVerified,
                isApproved: true // Auto-approve by default, admin can hide later
            },
            include: {
                user: {
                    select: {
                        id: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        });

        // Update workshop average rating
        await this.updateWorkshopRating(workshopId);

        return review;
    }

    /**
     * Get all reviews for a workshop
     * @param {string} workshopId - Workshop ID
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} List of reviews
     */
    async getWorkshopReviews(workshopId, filters = {}) {
        const { page = 1, limit = 10, rating, isVerified } = filters;
        const skip = (page - 1) * limit;

        const where = {
            workshopId,
            isApproved: true // Only show approved reviews to public
        };

        if (rating) {
            where.rating = parseInt(rating);
        }

        if (isVerified !== undefined) {
            where.isVerified = isVerified === 'true';
        }

        const [reviews, total] = await Promise.all([
            prisma.workshopReview.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            profile: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    avatar: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.workshopReview.count({ where })
        ]);

        return {
            reviews,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get all reviews for admin (including unapproved)
     * @param {string} workshopId - Workshop ID
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Reviews with pagination
     */
    async getWorkshopReviewsAdmin(workshopId, filters = {}) {
        const { page = 1, limit = 10, isApproved } = filters;
        const skip = (page - 1) * limit;

        const where = { workshopId };

        if (isApproved !== undefined) {
            where.isApproved = isApproved === 'true';
        }

        const [reviews, total] = await Promise.all([
            prisma.workshopReview.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    firstName: true,
                                    lastName: true
                                }
                            }
                        }
                    },
                    booking: {
                        select: {
                            id: true,
                            bookingNumber: true,
                            status: true
                        }
                    }
                }
            }),
            prisma.workshopReview.count({ where })
        ]);

        return {
            reviews,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Update review approval status (Admin only)
     * @param {string} reviewId - Review ID
     * @param {boolean} isApproved - Approval status
     * @returns {Promise<Object>} Updated review
     */
    async updateReviewApproval(reviewId, isApproved) {
        const review = await prisma.workshopReview.findUnique({
            where: { id: reviewId }
        });

        if (!review) {
            throw new AppError('Review not found', 404, 'NOT_FOUND');
        }

        const updated = await prisma.workshopReview.update({
            where: { id: reviewId },
            data: { isApproved }
        });

        // Recalculate workshop rating
        await this.updateWorkshopRating(review.workshopId);

        return updated;
    }

    /**
     * Delete a review (Admin only)
     * @param {string} reviewId - Review ID
     */
    async deleteReview(reviewId) {
        const review = await prisma.workshopReview.findUnique({
            where: { id: reviewId }
        });

        if (!review) {
            throw new AppError('Review not found', 404, 'NOT_FOUND');
        }

        await prisma.workshopReview.delete({
            where: { id: reviewId }
        });

        // Recalculate workshop rating
        await this.updateWorkshopRating(review.workshopId);
    }

    /**
     * Add workshop response to review (Admin/Workshop owner)
     * @param {string} reviewId - Review ID
     * @param {Object} data - Response data
     * @returns {Promise<Object>} Updated review
     */
    async addWorkshopResponse(reviewId, data) {
        const { response, responseAr } = data;

        const review = await prisma.workshopReview.findUnique({
            where: { id: reviewId }
        });

        if (!review) {
            throw new AppError('Review not found', 404, 'NOT_FOUND');
        }

        const updated = await prisma.workshopReview.update({
            where: { id: reviewId },
            data: {
                response,
                responseAr,
                respondedAt: new Date()
            }
        });

        return updated;
    }

    /**
     * Update workshop average rating based on approved reviews
     * @param {string} workshopId - Workshop ID
     */
    async updateWorkshopRating(workshopId) {
        const reviews = await prisma.workshopReview.findMany({
            where: {
                workshopId,
                isApproved: true
            },
            select: {
                rating: true
            }
        });

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0;

        await prisma.certifiedWorkshop.update({
            where: { id: workshopId },
            data: {
                averageRating: parseFloat(averageRating.toFixed(2)),
                totalReviews
            }
        });
    }

    /**
     * Get review statistics for a workshop
     * @param {string} workshopId - Workshop ID
     * @returns {Promise<Object>} Review statistics
     */
    async getReviewStats(workshopId) {
        const reviews = await prisma.workshopReview.findMany({
            where: {
                workshopId,
                isApproved: true
            },
            select: {
                rating: true
            }
        });

        const totalReviews = reviews.length;
        const ratingDistribution = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0
        };

        reviews.forEach(review => {
            ratingDistribution[review.rating]++;
        });

        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0;

        return {
            totalReviews,
            averageRating: parseFloat(averageRating.toFixed(2)),
            ratingDistribution
        };
    }
}

module.exports = new WorkshopReviewService();
