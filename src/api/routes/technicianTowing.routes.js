const express = require('express');
const router = express.Router();
const technicianTowingController = require('../controllers/technicianTowing.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Technician Towing
 *   description: "للفنيين فقط (TECHNICIAN). سائق الوينش = فيندور الوينش يستخدم /api/winches/my/jobs و /api/winches/my/jobs/:jobId/status."
 */

/**
 * @swagger
 * /api/technician/towing/broadcasts:
 *   get:
 *     summary: Get active towing broadcasts (for technicians)
 *     description: قائمة طلبات السحب النشطة التي يمكن للفني المزايدة عليها. ملاحظة - فيندور الوينش يستخدم GET /api/winches/my/broadcasts.
 *     tags: [Technician Towing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active broadcasts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     broadcasts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           customer:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                           vehicle:
 *                             type: object
 *                           pickupLocation:
 *                             type: object
 *                           destinationLocation:
 *                             type: object
 *                           distance:
 *                             type: number
 *                             example: 5.2
 *                           estimatedArrival:
 *                             type: number
 *                             example: 15
 *                           estimatedPrice:
 *                             type: number
 *                             example: 75
 *                           urgency:
 *                             type: string
 *                             example: "HIGH"
 *                           vehicleCondition:
 *                             type: string
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                           myOffer:
 *                             type: object
 *                             nullable: true
 */
router.get('/broadcasts', authMiddleware, technicianTowingController.getBroadcasts);

/**
 * @swagger
 * /api/technician/towing/broadcasts/{broadcastId}/offer:
 *   post:
 *     summary: Submit offer for towing request
 *     tags: [Technician Towing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: broadcastId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bidAmount
 *             properties:
 *               bidAmount:
 *                 type: number
 *                 example: 180
 *                 description: Your bid amount in SAR
 *               message:
 *                 type: string
 *                 example: "I'm nearby, can arrive in 8 minutes"
 *               estimatedArrival:
 *                 type: number
 *                 example: 8
 *                 description: Estimated arrival time in minutes
 *     responses:
 *       201:
 *         description: Offer submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Offer submitted successfully"
 *                 messageAr:
 *                   type: string
 *                   example: "تم إرسال العرض بنجاح"
 *                 data:
 *                   type: object
 *                   properties:
 *                     offer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         broadcastId:
 *                           type: string
 *                         bidAmount:
 *                           type: number
 *                         message:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: "PENDING"
 */
router.post('/broadcasts/:broadcastId/offer', authMiddleware, technicianTowingController.submitOffer);

/**
 * @swagger
 * /api/technician/towing/jobs:
 *   get:
 *     summary: "6. قائمة مهام السائق — Get assigned towing jobs"
 *     description: |
 *       المهام المحددة للسائق (فني أو فيندور ونش) بعد قبول العميل للعرض. يعرض الحجوزات بحالة TECHNICIAN_ASSIGNED أو EN_ROUTE أو ARRIVED أو IN_PROGRESS.
 *       بعد الدفع يتفتح السوكت بين العميل والسائق للتتبع والمحادثة.
 *     tags: [Technician Towing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: قائمة المهام مع العميل والموقع والسعر
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           bookingNumber: { type: string }
 *                           status: { type: string }
 *                           customer: { type: object }
 *                           vehicle: { type: object }
 *                           pickupLocation: { type: object }
 *                           destinationLocation: { type: object }
 *                           agreedPrice: { type: number }
 *                           scheduledDate: { type: string }
 */
router.get('/jobs', authMiddleware, technicianTowingController.getJobs);

/**
 * @swagger
 * /api/technician/towing/jobs/{jobId}/status:
 *   patch:
 *     summary: "6. تحديث حالة المهمة حتى إتمام النقل — Update job status"
 *     description: |
 *       السائق يحدّث الحالة أثناء تنفيذ المهمة. التسلسل: TECHNICIAN_ASSIGNED -> TECHNICIAN_EN_ROUTE -> TECHNICIAN_ARRIVED -> IN_PROGRESS -> COMPLETED.
 *       عند COMPLETED تُسجّل completedAt. العميل يستقبل التحديثات عبر Socket (booking:status_changed) إن كان متصلاً.
 *     tags: [Technician Towing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Booking ID (معرف الحجز)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - TECHNICIAN_EN_ROUTE
 *                   - TECHNICIAN_ARRIVED
 *                   - IN_PROGRESS
 *                   - COMPLETED
 *                 example: "TECHNICIAN_EN_ROUTE"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status transition
 */
router.patch('/jobs/:jobId/status', authMiddleware, technicianTowingController.updateJobStatus);

module.exports = router;
