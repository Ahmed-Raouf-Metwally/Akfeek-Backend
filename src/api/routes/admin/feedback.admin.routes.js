const express = require('express');
const router = express.Router();
const feedbackController = require('../../controllers/feedback.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

// All admin feedback routes require ADMIN role
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

/**
 * @swagger
 * /api/admin/feedback:
 *   get:
 *     summary: List all feedbacks (Admin)
 *     description: Advanced filtering, search, and pagination for admin dashboard.
 *     tags: [⚙️ Admin | Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *       - in: query
 *         name: type
 *       - in: query
 *         name: priority
 *       - in: query
 *         name: search
 *     responses:
 *       200:
 *         description: Paginated feedbacks
 */
router.get('/stats', feedbackController.getFeedbackStats);
router.get('/', feedbackController.getAllFeedbacksAdmin);
router.get('/:id', feedbackController.getFeedbackDetail);

/**
 * @swagger
 * /api/admin/feedback/{id}/status:
 *   patch:
 *     summary: Update feedback status
 *     description: Change status (e.g. to RESOLVED). Includes automatic HandledBy assignment.
 *     tags: [⚙️ Admin | Feedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id/status', feedbackController.updateStatus);
router.patch('/:id/priority', feedbackController.updatePriority);

/**
 * @swagger
 * /api/admin/feedback/{id}/reply:
 *   post:
 *     summary: Reply to a feedback
 *     description: Post a reply to the customer's complaint or suggestion.
 *     tags: [⚙️ Admin | Feedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Reply created
 */
router.post('/:id/reply', feedbackController.replyToFeedback);

/**
 * @swagger
 * /api/admin/feedback/{id}:
 *   delete:
 *     summary: Soft delete feedback
 *     description: Mark feedback as deleted without removing from database.
 *     tags: [⚙️ Admin | Feedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', feedbackController.softDeleteFeedback);

module.exports = router;
