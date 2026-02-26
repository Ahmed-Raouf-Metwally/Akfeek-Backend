const express = require('express');
const router = express.Router();
const technicalSupportController = require('../controllers/technicalSupport.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

router.use(authMiddleware);

// ---------- Customer endpoints ----------
/**
 * @swagger
 * /api/technical-support-requests:
 *   post:
 *     summary: Submit technical support request (طلب دعم فني)
 *     description: |
 *       المستخدم يقدم طلب دعم فني يتضمن:
 *       الرقم التسلسلي للسيارة، رقم اللوحة، هل يوجد تأمين واسم شركة التأمين،
 *       عنوان التسليم، اختياري إذن إصلاح/وثيقة نجم/تقرير مرور، أضرار الحادث، صور السيارة (اختياري).
 *     tags: [📱 Customer | Technical Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleSerialNumber
 *               - plateNumber
 *               - deliveryAddress
 *               - accidentDamages
 *             properties:
 *               vehicleSerialNumber: { type: string, description: الرقم التسلسلي للسيارة }
 *               plateNumber: { type: string, description: رقم اللوحة }
 *               hasInsurance: { type: boolean, default: false }
 *               insuranceCompany: { type: string, description: اسم شركة التأمين }
 *               deliveryAddress: { type: string, description: عنوان التسليم }
 *               repairAuthUrl: { type: string, description: رابط إذن إصلاح (اختياري) }
 *               najmDocUrl: { type: string, description: رابط وثيقة نجم (اختياري) }
 *               trafficReportUrl: { type: string, description: رابط تقرير مرور (اختياري) }
 *               accidentDamages: { type: string, description: أضرار الحادث }
 *               carImageUrls: { type: array, items: { type: string }, description: روابط صور السيارة (اختياري) }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Request created
 *       400:
 *         description: Validation error
 */
router.post('/', technicalSupportController.create);

/**
 * @swagger
 * /api/technical-support-requests/my:
 *   get:
 *     summary: Get my technical support requests
 *     tags: [📱 Customer | Technical Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED] }
 *     responses:
 *       200:
 *         description: List of my requests
 */
router.get('/my', technicalSupportController.getMyRequests);

// ---------- Admin endpoints (must be before GET /:id) ----------
/**
 * @swagger
 * /api/technical-support-requests/admin/list:
 *   get:
 *     summary: "[Admin] List all technical support requests"
 *     tags: [⚙️ Admin | Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED] }
 *     responses:
 *       200:
 *         description: List of requests
 */
router.get('/admin/list', requireRole('ADMIN'), technicalSupportController.adminList);

/**
 * @swagger
 * /api/technical-support-requests/admin/{id}/assign:
 *   post:
 *     summary: "[Admin] Assign technician to request"
 *     description: الأدمن يحدد الفني الذي سيراجع العميل
 *     tags: [⚙️ Admin | Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [technicianId]
 *             properties:
 *               technicianId: { type: string, format: uuid, description: ID الفني }
 *     responses:
 *       200:
 *         description: Technician assigned
 *       400:
 *         description: Invalid technician or request state
 *       404:
 *         description: Request not found
 */
router.post('/admin/:id/assign', requireRole('ADMIN'), technicalSupportController.assignTechnician);

/**
 * @swagger
 * /api/technical-support-requests/admin/{id}/status:
 *   patch:
 *     summary: "[Admin] Update request status"
 *     tags: [⚙️ Admin | Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED] }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/admin/:id/status', requireRole('ADMIN'), technicalSupportController.adminUpdateStatus);

/**
 * @swagger
 * /api/technical-support-requests/technicians:
 *   get:
 *     summary: "[Admin] List technicians for assign dropdown"
 *     tags: [⚙️ Admin | Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of technicians (id, email, profile.firstName, profile.lastName)
 */
router.get('/technicians', requireRole('ADMIN'), technicalSupportController.getTechnicians);

/**
 * @swagger
 * /api/technical-support-requests/{id}/track:
 *   get:
 *     summary: Get tracking info (technician location) for customer
 *     description: العميل يتابع موقع الفني. ثم يتصل بالسوكيت وغرفة tsr لاستقبال التحديثات اللحظية.
 *     tags: [📱 Customer | Technical Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: request, technician, currentLocation
 */
router.get('/:id/track', technicalSupportController.getTrack);

/**
 * @swagger
 * /api/technical-support-requests/{id}:
 *   get:
 *     summary: Get request by ID (owner or admin)
 *     tags: [📱 Customer | Technical Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Request details
 *       403:
 *         description: Not owner
 *       404:
 *         description: Not found
 */
router.get('/:id', technicalSupportController.getById);

module.exports = router;
