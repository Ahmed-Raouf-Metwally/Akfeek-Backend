const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const ctrl = require('../controllers/mobileWorkshopType.controller');

/**
 * @swagger
 * /api/mobile-workshop-types:
 *   get:
 *     summary: قائمة أنواع الورش المتنقلة — List mobile workshop types (public)
 *     description: يعيد أنواع الورش المتنقلة مع خدمات كل نوع (لاختيار العميل نوع الورشة والخدمة قبل إنشاء الطلب).
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     responses:
 *       200:
 *         description: List of workshop types with their services
 */
router.get('/', ctrl.getAllTypes);

/**
 * @swagger
 * /api/mobile-workshop-types/{typeId}/services:
 *   get:
 *     summary: خدمات نوع الورشة — Get services for a workshop type
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of services for this workshop type
 */
router.get('/:typeId/services', ctrl.getTypeServices);

/**
 * @swagger
 * /api/mobile-workshop-types/{id}:
 *   get:
 *     summary: عرض نوع ورشة بالمعرف — Get workshop type by ID
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Workshop type details
 */
router.get('/:id', ctrl.getTypeById);

/**
 * @swagger
 * /api/mobile-workshop-types:
 *   post:
 *     summary: إضافة نوع ورشة (أدمن) — Create workshop type
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Workshop type created
 */
router.post('/', auth, role('ADMIN'), ctrl.createType);

/**
 * @swagger
 * /api/mobile-workshop-types/{id}:
 *   put:
 *     summary: تحديث نوع ورشة (أدمن) — Update workshop type
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
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
 *               name: { type: string }
 *               nameAr: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Workshop type updated
 */
router.put('/:id', auth, role('ADMIN'), ctrl.updateType);

/**
 * @swagger
 * /api/mobile-workshop-types/{id}:
 *   delete:
 *     summary: حذف نوع ورشة (أدمن) — Delete workshop type
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Workshop type deleted
 */
router.delete('/:id', auth, role('ADMIN'), ctrl.deleteType);

/**
 * @swagger
 * /api/mobile-workshop-types/{typeId}/services:
 *   post:
 *     summary: إضافة خدمة لنوع الورشة (أدمن) — Create type service
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Type service created
 */
router.post('/:typeId/services', auth, role('ADMIN'), ctrl.createTypeService);

/**
 * @swagger
 * /api/mobile-workshop-types/{typeId}/services/{serviceId}:
 *   put:
 *     summary: تحديث خدمة نوع الورشة (أدمن) — Update type service
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Type service updated
 */
router.put('/:typeId/services/:serviceId', auth, role('ADMIN'), ctrl.updateTypeService);

/**
 * @swagger
 * /api/mobile-workshop-types/{typeId}/services/{serviceId}:
 *   delete:
 *     summary: حذف خدمة من نوع الورشة (أدمن) — Delete type service
 *     tags: [5. الورش المتنقلة (Mobile Workshop)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: typeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Type service deleted
 */
router.delete('/:typeId/services/:serviceId', auth, role('ADMIN'), ctrl.deleteTypeService);

module.exports = router;
