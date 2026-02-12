const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Feedback
 *   description: Customer Complaints and Suggestions management (نظام الشكاوى والمقترحات)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Feedback:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [COMPLAINT, SUGGESTION]
 *         category:
 *           type: string
 *           enum: [DELIVERY, PAYMENT, PRODUCT, UI_UX, OTHER]
 *         subject:
 *           type: string
 *         message:
 *           type: string
 *         orderId:
 *           type: string
 *           format: uuid
 *         isAnonymous:
 *           type: boolean
 */

// All feedback routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/feedback:
 *   post:
 *     summary: Submit new complaint or suggestion
 *     description: Submit feedback. If linked to an order, ownership is verified.
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Feedback'
 *     responses:
 *       201:
 *         description: Created
 *       403:
 *         description: Forbidden (Order doesn't belong to user)
 */
router.post('/', feedbackController.createFeedback);

/**
 * @swagger
 * /api/feedback/my:
 *   get:
 *     summary: Get my feedback history
 *     description: Retrieve list of feedbacks submitted by the current user.
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of feedbacks
 */
router.get('/my', feedbackController.getMyFeedbacks);

/**
 * @swagger
 * /api/feedback/{id}:
 *   get:
 *     summary: Get feedback details
 *     description: Get full details including replies and history.
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feedback detail
 */
router.get('/:id', feedbackController.getFeedbackDetail);

module.exports = router;
