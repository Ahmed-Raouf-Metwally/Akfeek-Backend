const Joi = require('joi');

const createFeedbackSchema = Joi.object({
    type: Joi.string().valid('COMPLAINT', 'SUGGESTION').required(),
    category: Joi.string().valid('DELIVERY', 'PAYMENT', 'PRODUCT', 'UI_UX', 'OTHER').required(),
    subject: Joi.string().min(5).max(100).required(),
    message: Joi.string().min(10).max(2000).required(),
    orderId: Joi.string().uuid().optional(),
    isAnonymous: Joi.boolean().default(false)
});

const updateStatusSchema = Joi.object({
    status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED').required(),
    notes: Joi.string().max(500).optional()
});

const replySchema = Joi.object({
    message: Joi.string().min(1).max(1000).required()
});

const listFiltersSchema = Joi.object({
    type: Joi.string().valid('COMPLAINT', 'SUGGESTION').optional(),
    status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED').optional(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
    category: Joi.string().valid('DELIVERY', 'PAYMENT', 'PRODUCT', 'UI_UX', 'OTHER').optional(),
    search: Joi.string().optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
});

const updatePrioritySchema = Joi.object({
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').required()
});

module.exports = {
    createFeedbackSchema,
    updateStatusSchema,
    updatePrioritySchema,
    replySchema,
    listFiltersSchema
};
