const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');
const socketIo = require('../socket');

/**
 * Feedback Service
 * Handles business logic for complaints and suggestions
 * Follows Clean Architecture and Secure Design principles
 */
class FeedbackService {
    /**
     * Create new feedback
     * @param {string} userId - User ID (Customer)
     * @param {Object} data - Feedback data
     */
    async createFeedback(userId, data) {
        const { type, category, subject, message, orderId, isAnonymous } = data;

        // Validate order ownership if linked to an order
        if (orderId) {
            const order = await prisma.marketplaceOrder.findUnique({
                where: { id: orderId },
                select: { customerId: true }
            });

            if (!order) {
                throw new AppError('Order not found', 404, 'NOT_FOUND');
            }

            if (order.customerId !== userId) {
                throw new AppError('You do not have permission to link this order', 403, 'FORBIDDEN');
            }
        }

        const feedback = await prisma.feedback.create({
            data: {
                userId: isAnonymous ? null : userId,
                orderId,
                type,
                category,
                subject,
                message,
                isAnonymous: isAnonymous || false,
                status: 'OPEN',
                priority: 'MEDIUM'
            },
            select: {
                id: true,
                type: true,
                category: true,
                subject: true,
                status: true,
                createdAt: true
            }
        });

        logger.info(`New feedback created: ${feedback.id} by user: ${userId}`);
        return feedback;
    }

    /**
     * Get user's own feedbacks
     */
    async getMyFeedbacks(userId, pagination = {}) {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;

        const where = {
            userId,
            deletedAt: null
        };

        const [feedbacks, total] = await Promise.all([
            prisma.feedback.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    type: true,
                    category: true,
                    status: true,
                    subject: true,
                    priority: true,
                    createdAt: true
                }
            }),
            prisma.feedback.count({ where })
        ]);

        return {
            feedbacks,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get feedback detail with replies and audit logs
     * Optimized with select/include
     */
    async getFeedbackDetail(feedbackId, userId, role) {
        const feedback = await prisma.feedback.findUnique({
            where: { id: feedbackId },
            include: {
                user: {
                    select: {
                        email: true,
                        profile: { select: { firstName: true, lastName: true } }
                    }
                },
                order: {
                    select: { id: true, orderNumber: true, totalAmount: true, createdAt: true }
                },
                replies: {
                    select: {
                        id: true,
                        senderType: true,
                        message: true,
                        createdAt: true,
                        sender: {
                            select: {
                                role: true,
                                profile: { select: { firstName: true, lastName: true, avatar: true } }
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                auditLogs: {
                    select: {
                        id: true,
                        oldStatus: true,
                        newStatus: true,
                        notes: true,
                        createdAt: true,
                        changer: {
                            select: { profile: { select: { firstName: true, lastName: true } } }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!feedback || feedback.deletedAt) {
            throw new AppError('Feedback not found', 404, 'NOT_FOUND');
        }

        // Role-based access control
        if (role !== 'ADMIN' && feedback.userId !== userId) {
            throw new AppError('Access denied', 403, 'FORBIDDEN');
        }

        return feedback;
    }

    /**
     * Admin: Get feedback statistics
     */
    async getFeedbackStats() {
        const [urgentCount, pendingCount] = await Promise.all([
            prisma.feedback.count({
                where: {
                    priority: 'URGENT',
                    deletedAt: null,
                    status: { notIn: ['RESOLVED', 'REJECTED', 'CLOSED'] }
                }
            }),
            prisma.feedback.count({
                where: {
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                    deletedAt: null
                }
            })
        ]);

        return {
            urgentCount,
            pendingCount
        };
    }

    /**
     * Admin: List all feedbacks with advanced filtering and search
     */
    async getAllFeedbacksAdmin(filters = {}, pagination = {}) {
        const { status, type, priority, category, search, dateFrom, dateTo } = filters;
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;

        const where = {
            deletedAt: null,
            ...(status && { status }),
            ...(type && { type }),
            ...(priority && { priority }),
            ...(category && { category }),
            ...(dateFrom && dateTo && {
                createdAt: {
                    gte: new Date(dateFrom),
                    lte: new Date(dateTo)
                }
            }),
            ...(search && {
                OR: [
                    { subject: { contains: search } },
                    { order: { orderNumber: { contains: search } } },
                    { user: { email: { contains: search } } }
                ]
            })
        };

        const [feedbacks, total] = await Promise.all([
            prisma.feedback.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
                select: {
                    id: true,
                    type: true,
                    category: true,
                    status: true,
                    priority: true,
                    subject: true,
                    createdAt: true,
                    user: {
                        select: { email: true }
                    },
                    order: {
                        select: { orderNumber: true }
                    }
                }
            }),
            prisma.feedback.count({ where })
        ]);

        return {
            feedbacks,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Admin: Update feedback status with Transaction and Audit Log
     */
    async updateStatus(feedbackId, adminId, newStatus, notes) {
        const feedback = await prisma.feedback.findUnique({
            where: { id: feedbackId },
            select: { status: true }
        });

        if (!feedback) {
            throw new AppError('Feedback not found', 404, 'NOT_FOUND');
        }

        return await prisma.$transaction(async (tx) => {
            const updatedFeedback = await tx.feedback.update({
                where: { id: feedbackId },
                data: {
                    status: newStatus,
                    ...(newStatus === 'RESOLVED' && {
                        resolvedAt: new Date(),
                        handledBy: adminId
                    })
                }
            });

            // Audit Log for status change
            await tx.feedbackAuditLog.create({
                data: {
                    feedbackId,
                    oldStatus: feedback.status,
                    newStatus,
                    changedBy: adminId,
                    notes: notes || `Status changed from ${feedback.status} to ${newStatus}`
                }
            });

            logger.info(`Feedback ${feedbackId} status updated to ${newStatus} by admin ${adminId}`);
            return updatedFeedback;
        });
    }

    /**
     * Admin: Update feedback priority
     */
    async updatePriority(feedbackId, adminId, newPriority) {
        const feedback = await prisma.feedback.findUnique({
            where: { id: feedbackId },
            select: { priority: true }
        });

        if (!feedback) {
            throw new AppError('Feedback not found', 404, 'NOT_FOUND');
        }

        const updatedFeedback = await prisma.feedback.update({
            where: { id: feedbackId },
            data: { priority: newPriority }
        });

        logger.info(`Feedback ${feedbackId} priority updated to ${newPriority} by admin ${adminId}`);
        return updatedFeedback;
    }

    /**
     * Reply to user feedback (Admin or User)
     * @param {string} feedbackId - Feedback ID
     * @param {string} senderId - User ID of the sender
     * @param {string} message - Reply message
     * @param {string} senderType - 'ADMIN' or 'USER'
     */
    async replyToFeedback(feedbackId, senderId, message, senderType = 'ADMIN') {
        const feedback = await prisma.feedback.findUnique({
            where: { id: feedbackId },
            select: { id: true, status: true, userId: true }
        });

        if (!feedback) throw new AppError('Feedback not found', 404, 'NOT_FOUND');

        // Prevent reply if closed
        if (feedback.status === 'CLOSED') {
            throw new AppError('Cannot reply to a closed feedback', 400, 'FEEDBACK_CLOSED');
        }

        // Enforce ownership for USER replies
        if (senderType === 'USER' && feedback.userId !== senderId) {
            throw new AppError('Access denied', 403, 'FORBIDDEN');
        }

        const reply = await prisma.feedbackReply.create({
            data: {
                feedbackId,
                senderType,
                senderId,
                message
            },
            include: {
                sender: {
                    select: {
                        role: true,
                        profile: { select: { firstName: true, lastName: true, avatar: true } }
                    }
                }
            }
        });

        // Business Logic: AUTOMATIC STATUS UPDATES
        if (senderType === 'ADMIN' && feedback.status === 'OPEN') {
            // Admin replies to new ticket -> move to IN_PROGRESS
            await this.updateStatus(feedbackId, senderId, 'IN_PROGRESS', 'Automatically moved to IN_PROGRESS after admin reply.');
        } else if (senderType === 'USER' && feedback.status === 'RESOLVED') {
            // User replies to a resolved ticket -> reopen it
            await this.updateStatus(feedbackId, senderId, 'IN_PROGRESS', 'Ticket reopened by user reply.');
        }

        // Emit real-time notification
        socketIo.emitFeedbackReply(feedbackId, reply);

        return reply;
    }

    /**
     * Admin: Soft Delete only
     */
    async softDeleteFeedback(feedbackId) {
        await prisma.feedback.update({
            where: { id: feedbackId },
            data: { deletedAt: new Date() }
        });
        logger.info(`Feedback ${feedbackId} soft deleted.`);
    }

    /**
     * SLA Monitoring: Auto-escalate complaints not resolved within 48 hours
     * This should be called by a cron job
     */
    async runSLAEscalation() {
        const threshold = new Date();
        threshold.setHours(threshold.getHours() - 48);

        const staleFeedbacks = await prisma.feedback.findMany({
            where: {
                type: 'COMPLAINT',
                status: { in: ['OPEN', 'IN_PROGRESS'] },
                createdAt: { lt: threshold },
                priority: { not: 'URGENT' },
                deletedAt: null
            },
            select: { id: true, status: true, priority: true }
        });

        if (staleFeedbacks.length === 0) return 0;

        // Use transaction to ensure consistency
        const updates = staleFeedbacks.map((f) => [
            prisma.feedback.update({
                where: { id: f.id },
                data: { priority: 'URGENT' }
            }),
            prisma.feedbackAuditLog.create({
                data: {
                    feedbackId: f.id,
                    oldStatus: f.status,
                    newStatus: f.status,
                    changedBy: '00000000-0000-0000-0000-000000000000', // System identifier (placeholder UUID)
                    notes: 'SLA Escalation: Unresolved for 48+ hours. Priority automatically raised to URGENT.'
                }
            })
        ]).flat();

        await prisma.$transaction(updates);
        logger.info(`SLA Escalation: Updated ${staleFeedbacks.length} complaints to URGENT priority.`);
        return staleFeedbacks.length;
    }
}

module.exports = new FeedbackService();
