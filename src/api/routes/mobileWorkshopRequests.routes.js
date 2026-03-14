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
 *     description: |
 *       الفلو: العميل يرسل طلباً (مركبة + نوع ورشة + خدمة + موقع اختياري + searchRadiusKm).
 *       يُبث للورش المتنقلة المتطابقة. الفيندور يوافق فقط → يظهر للعميل سعر الخدمة المطلوبة من الورشة → العميل يوافق على العرض (offerId فقط).
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
 *               vehicleId: { type: string, format: uuid, description: "معرف المركبة" }
 *               workshopTypeId: { type: string, format: uuid, description: "نوع الورشة المتنقلة" }
 *               workshopTypeServiceId: { type: string, format: uuid, description: "الخدمة المطلوبة (من نوع الورشة) — في الفلو الجديد عند الموافقة يظهر سعرها للعميل" }
 *               latitude: { type: number, description: "خط العرض (اختياري، للورش القريبة)" }
 *               longitude: { type: number, description: "خط الطول (اختياري)" }
 *               addressText: { type: string, description: "عنوان الموقع" }
 *               city: { type: string, description: "المدينة" }
 *               addressId: { type: string, format: uuid, description: "معرف عنوان محفوظ (اختياري)" }
 *               searchRadiusKm: { type: number, minimum: 5, maximum: 100, description: "نصف قطر البحث بالكم، يحدده المستخدم (افتراضي 25)" }
 *           example:
 *             vehicleId: "1d2921d0-943c-4dbb-af5a-405ab846c15c"
 *             workshopTypeId: "fccab2a5-615d-4859-98db-bd4d4743d1c8"
 *             workshopTypeServiceId: "a849cd24-e2e1-414d-be61-4f80e9ef9b36"
 *             latitude: 24.7136
 *             longitude: 46.6753
 *             addressText: "طريق الملك فهد، الرياض"
 *             city: "الرياض"
 *             searchRadiusKm: 25
 *     responses:
 *       201:
 *         description: Request created; workshops notified (request, workshopsNotified, nearbyOnly, searchRadiusKm)
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
 *     description: |
 *       الفلو الجديد: الفيندور يوافق فقط فيظهر سعر الخدمة المطلوبة في العرض — العميل يرسل offerId فقط.
 *       إن كان العرض قديماً (بدون سعر/بدون خدمة) يلزم إرسال mobileWorkshopServiceId.
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
 *               offerId: { type: string, format: uuid, description: "معرف العرض المختار" }
 *               mobileWorkshopServiceId: { type: string, format: uuid, description: "اختياري — للعروض القديمة فقط عندما لا يكون السعر في العرض" }
 *           example:
 *             offerId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: Offer selected; booking and invoice created (booking, invoice)
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
