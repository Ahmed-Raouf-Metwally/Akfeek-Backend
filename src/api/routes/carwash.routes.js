const express = require('express');
const router = express.Router();
const carWashController = require('../controllers/carwash.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

// Protect all routes
router.use(authMiddleware);
router.use(requireRole(['CUSTOMER']));

/**
 * @swagger
 * /api/bookings/carwash/request:
 *   post:
 *     summary: Create a car wash request
 *     description: |
 *       Create a new car wash request and broadcast it to nearby technicians.
 *       The request will be broadcasted to available car wash service providers in the area.
 *       
 *       إنشاء طلب غسيل سيارة جديد وإرساله إلى الفنيين القريبين
 *     tags: [📱 Customer | Car Wash]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - location
 *               - serviceType
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 description: ID of the vehicle to be washed - معرف المركبة المراد غسلها
 *                 example: "clm1a2b3c4d5e6f7g8h9i0j1"
 *               location:
 *                 type: object
 *                 required:
 *                   - latitude
 *                   - longitude
 *                   - address
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     description: Location latitude - خط العرض
 *                     example: 24.7136
 *                   longitude:
 *                     type: number
 *                     description: Location longitude - خط الطول
 *                     example: 46.6753
 *                   address:
 *                     type: string
 *                     description: Full address - العنوان الكامل
 *                     example: "Riyadh, Al Olaya District"
 *               serviceType:
 *                 type: string
 *                 enum: [INTERNAL, EXTERNAL, FULL]
 *                 description: |
 *                   Type of car wash service:
 *                   - INTERNAL: Interior cleaning only
 *                   - EXTERNAL: Exterior washing only
 *                   - FULL: Complete car wash (interior + exterior)
 *                   
 *                   نوع خدمة غسيل السيارة
 *                 example: "FULL"
 *               notes:
 *                 type: string
 *                 description: Additional notes or special requests - ملاحظات إضافية
 *                 example: "Please use waterless wash products"
 *               estimatedBudget:
 *                 type: number
 *                 description: Customer's estimated budget in SAR - الميزانية المقدرة بالريال السعودي
 *                 example: 150
 *     responses:
 *       200:
 *         description: Car wash request broadcasted successfully - تم إرسال طلب غسيل السيارة بنجاح
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
 *                   example: "Car wash request broadcasted successfully"
 *                 messageAr:
 *                   type: string
 *                   example: "تم إرسال طلب غسيل السيارة بنجاح"
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId:
 *                       type: string
 *                       example: "clm1a2b3c4d5e6f7g8h9i0j1"
 *                     broadcastId:
 *                       type: string
 *                       example: "clm2b3c4d5e6f7g8h9i0j1k2"
 *                     status:
 *                       type: string
 *                       example: "BROADCASTING"
 *                     broadcastUntil:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-29T20:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Vehicle not found - المركبة غير موجودة
 */
router.post('/request', carWashController.requestWash);

/**
 * @swagger
 * /api/bookings/carwash/{broadcastId}/offers:
 *   get:
 *     summary: Get offers for a car wash broadcast
 *     description: |
 *       Retrieve all offers submitted by technicians for a specific car wash broadcast.
 *       Each offer includes technician details, bid amount, and estimated arrival time.
 *       
 *       الحصول على جميع العروض المقدمة من الفنيين لطلب غسيل السيارة
 *     tags: [📱 Customer | Car Wash]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: broadcastId
 *         required: true
 *         schema:
 *           type: string
 *         description: Broadcast ID - معرف البث
 *         example: "clm2b3c4d5e6f7g8h9i0j1k2"
 *     responses:
 *       200:
 *         description: Offers retrieved successfully - تم استرجاع العروض بنجاح
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
 *                   example: "Offers retrieved successfully"
 *                 messageAr:
 *                   type: string
 *                   example: "تم استرجاع العروض بنجاح"
 *                 data:
 *                   type: object
 *                   properties:
 *                     broadcast:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "clm2b3c4d5e6f7g8h9i0j1k2"
 *                         status:
 *                           type: string
 *                           example: "BROADCASTING"
 *                         location:
 *                           type: object
 *                           properties:
 *                             latitude:
 *                               type: number
 *                               example: 24.7136
 *                             longitude:
 *                               type: number
 *                               example: 46.6753
 *                             address:
 *                               type: string
 *                               example: "Riyadh, Al Olaya District"
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-29T20:00:00.000Z"
 *                     offers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "clm3c4d5e6f7g8h9i0j1k2l3"
 *                           technician:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "clm4d5e6f7g8h9i0j1k2l3m4"
 *                               name:
 *                                 type: string
 *                                 example: "Ahmed Al-Rashid"
 *                               avatar:
 *                                 type: string
 *                                 example: "https://example.com/avatar.jpg"
 *                               rating:
 *                                 type: number
 *                                 example: 4.8
 *                               distance:
 *                                 type: number
 *                                 description: Distance in kilometers
 *                                 example: 3.5
 *                               estimatedArrival:
 *                                 type: number
 *                                 description: Estimated arrival time in minutes
 *                                 example: 15
 *                           bidAmount:
 *                             type: number
 *                             description: Offer price in SAR
 *                             example: 120
 *                           message:
 *                             type: string
 *                             example: "I can wash your car in 30 minutes"
 *                           status:
 *                             type: string
 *                             enum: [PENDING, ACCEPTED]
 *                             example: "PENDING"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-29T19:30:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:broadcastId/offers', carWashController.getOffers);

/**
 * @swagger
 * /api/bookings/carwash/{broadcastId}/offers/{offerId}/accept:
 *   post:
 *     summary: Accept a car wash offer
 *     description: |
 *       Accept a specific offer from a technician for the car wash service.
 *       This will assign the technician to the booking and close the broadcast.
 *       
 *       قبول عرض محدد من فني لخدمة غسيل السيارة
 *     tags: [📱 Customer | Car Wash]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: broadcastId
 *         required: true
 *         schema:
 *           type: string
 *         description: Broadcast ID - معرف البث
 *         example: "clm2b3c4d5e6f7g8h9i0j1k2"
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Offer ID - معرف العرض
 *         example: "clm3c4d5e6f7g8h9i0j1k2l3"
 *     responses:
 *       200:
 *         description: Offer accepted successfully - تم قبول العرض بنجاح
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
 *                   example: "Offer accepted successfully"
 *                 messageAr:
 *                   type: string
 *                   example: "تم قبول العرض بنجاح"
 *                 data:
 *                   type: object
 *                   properties:
 *                     booking:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "clm1a2b3c4d5e6f7g8h9i0j1"
 *                         bookingNumber:
 *                           type: string
 *                           example: "WASH-20240129-001"
 *                         status:
 *                           type: string
 *                           example: "TECHNICIAN_ASSIGNED"
 *                         technician:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               example: "clm4d5e6f7g8h9i0j1k2l3m4"
 *                             name:
 *                               type: string
 *                               example: "Ahmed Al-Rashid"
 *                             phone:
 *                               type: string
 *                               example: "+966501234567"
 *                             avatar:
 *                               type: string
 *                               example: "https://example.com/avatar.jpg"
 *                         agreedPrice:
 *                           type: number
 *                           description: Agreed service price in SAR
 *                           example: 120
 *       400:
 *         description: Invalid request - الطلب غير صالح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: "Broadcast is not active"
 *               errorAr: "البث غير نشط"
 *               code: "INVALID_STATUS"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:broadcastId/offers/:offerId/accept', carWashController.acceptOffer);

module.exports = router;
