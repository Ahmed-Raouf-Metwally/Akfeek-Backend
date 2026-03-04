const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const controller = require('../controllers/mobileCarService.controller');

// Public: parent service and sub-services (no auth required for catalog)
router.get('/', controller.getParentService);
router.get('/sub-services', controller.getSubServices);
router.get('/compatible-parts', controller.getCompatibleSpareParts);
router.get('/recommended-parts', controller.getRecommendedSpareParts);

/**
 * @swagger
 * tags:
 *   name: 5. الورش المتنقلة (Mobile Workshop)
 *   description: CRUD الورش المتنقلة + حجز الصيانة المتنقلة.
 */

/**
 * @swagger
 * /api/mobile-car-service/bookings:
 *   post:
 *     summary: إنشاء حجز ورشة متنقلة — Create mobile workshop booking (حجز يظهر تحت قسم الورش المتنقلة)
 *     description: |
 *       إنشاء حجز لخدمة الورشة المتنقلة. يحتاج subServiceId من GET /api/mobile-car-service/sub-services و vehicleId و location.
 *       Create a mobile car service booking. Requires subServiceId (from sub-services), vehicleId, and location.
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subServiceId
 *               - vehicleId
 *               - location
 *             properties:
 *               subServiceId:
 *                 type: string
 *                 format: uuid
 *                 description: معرف الخدمة الفرعية (من sub-services). Sub-service ID.
 *               vehicleId:
 *                 type: string
 *                 format: uuid
 *                 description: معرف المركبة. Vehicle ID.
 *               location:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     example: 24.7136
 *                   longitude:
 *                     type: number
 *                     example: 46.6753
 *                   address:
 *                     type: string
 *                     description: العنوان (اختياري). Address (optional).
 *               scheduledDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-15"
 *               scheduledTime:
 *                 type: string
 *                 example: "10:00"
 *               spareParts:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: قطع غيار اختيارية. Optional spare parts.
 *               notes:
 *                 type: string
 *           example:
 *             subServiceId: "uuid-الخدمة-الفرعية"
 *             vehicleId: "uuid-المركبة"
 *             location:
 *               latitude: 24.7136
 *               longitude: 46.6753
 *               address: "عنوان الموقع"
 *             scheduledDate: "2026-03-15"
 *             scheduledTime: "10:00"
 *             notes: "ملاحظات"
 *     responses:
 *       201:
 *         description: تم إنشاء حجز الصيانة المتنقلة — Mobile car service booking created
 *       400:
 *         description: بيانات غير صالحة — Invalid input
 *       401:
 *         description: غير مصرح — Unauthorized
 */
// Protected: create booking (customer)
router.post('/bookings', authMiddleware, requireRole(['CUSTOMER']), controller.createBooking);

// Protected: get booking by ID (customer own, or admin)
router.get('/bookings/:id', authMiddleware, controller.getBookingById);

// Protected: update booking status (technician or admin)
router.patch('/bookings/:id/status', authMiddleware, requireRole(['TECHNICIAN', 'ADMIN']), controller.updateBookingStatus);

// Admin: link spare part to service; add vendor supply (does not affect existing vendor logic)
router.post('/admin/parts/:autoPartId/services', authMiddleware, requireRole(['ADMIN']), controller.linkPartToService);
router.post('/admin/parts/:autoPartId/vendors', authMiddleware, requireRole(['ADMIN']), controller.setPartVendorSupply);

module.exports = router;
