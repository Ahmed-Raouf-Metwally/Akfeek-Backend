const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const ctrl = require('../controllers/mobileWorkshopRequest.controller');

router.use(auth);

/**
 * @swagger
 * /api/mobile-workshop-requests:
 *   post:
 *     summary: إنشاء طلب ورشة متنقلة (عميل) — Create mobile workshop request
 *     description: العميل يرسل طلباً؛ يُبث للورش المتنقلة المتطابقة (نوع الورشة + الخدمة).
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, workshopTypeId]
 *             properties:
 *               vehicleId: { type: string, format: uuid }
 *               workshopTypeId: { type: string, format: uuid }
 *               workshopTypeServiceId: { type: string, format: uuid }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               addressText: { type: string }
 *               city: { type: string }
 *               addressId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Request created; workshops notified
 */
router.post('/', role('CUSTOMER'), ctrl.createRequest);

/**
 * @swagger
 * /api/mobile-workshop-requests:
 *   get:
 *     summary: طلباتي (عميل) — Get my mobile workshop requests
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of my requests
 */
router.get('/', role('CUSTOMER'), ctrl.getMyRequests);

// يجب أن تأتي قبل /:id حتى لا يُفسَّر "select-offer" كـ id
/**
 * @swagger
 * /api/mobile-workshop-requests/{requestId}/select-offer:
 *   post:
 *     summary: اختيار عرض (عميل) — Select offer → creates booking & invoice
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [offerId]
 *             properties:
 *               offerId: { type: string, format: uuid }
 *               mobileWorkshopServiceId: { type: string, format: uuid, description: مطلوب إن كان العرض "موافقة فقط" — العميل يختار خدمة من قائمة خدمات الورشة }
 *     responses:
 *       200:
 *         description: Offer selected; booking and invoice created
 */
router.post('/:requestId/select-offer', role('CUSTOMER'), ctrl.selectOffer);

/**
 * @swagger
 * /api/mobile-workshop-requests/{id}:
 *   get:
 *     summary: تفاصيل الطلب مع العروض (عميل) — Get request by ID with offers
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Request details with offers
 */
router.get('/:id', role('CUSTOMER'), ctrl.getRequestById);

module.exports = router;
