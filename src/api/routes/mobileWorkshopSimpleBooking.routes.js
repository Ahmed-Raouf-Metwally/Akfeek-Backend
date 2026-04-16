const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const ctrl = require('../controllers/mobileWorkshopSimpleBooking.controller');
const catalogHierarchyCtrl = require('../controllers/mobileWorkshopCatalogHierarchy.controller');

/**
 * @swagger
 * /api/mobile-workshop/catalog:
 *   get:
 *     summary: كاتالوج الورش المتنقلة (ثابت حسب التصميم)
 *     description: |
 *       قائمة ثابتة مطابقة لتصميم تطبيق العميل: 7 عناصر فقط مع نطاق السعر 100–150 (عدا "مشكلة أخرى" حسب الفحص).
 *       Static catalog matching the mobile app UI exactly.
 *     tags: [5. الورشة المتنقلة للمستخدم (Mobile Workshop User)]
 *     security: []
 *     responses:
 *       200:
 *         description: Catalog items in UI order
 */
router.get('/catalog', ctrl.getCatalog);

/**
 * @swagger
 * /api/mobile-workshop/catalogs:
 *   get:
 *     summary: Mobile workshop catalogs (hierarchical)
 *     description: Returns active catalogs with categories and services (including images).
 *     tags: [5. الورشة المتنقلة للمستخدم (Mobile Workshop User)]
 *     security: []
 *     responses:
 *       200:
 *         description: Active catalogs
 */
router.get('/catalogs', catalogHierarchyCtrl.getActiveCatalogs);

/**
 * @swagger
 * /api/mobile-workshop/catalogs/{catalogId}/categories:
 *   get:
 *     summary: Mobile workshop categories by catalog (hierarchical)
 *     description: Returns active categories for a given catalog (including images).
 *     tags: [5. الورشة المتنقلة للمستخدم (Mobile Workshop User)]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: catalogId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Active categories
 */
router.get('/catalogs/:catalogId/categories', catalogHierarchyCtrl.getActiveCategoriesByCatalogId);

/**
 * @swagger
 * /api/mobile-workshop/categories/{categoryId}/services:
 *   get:
 *     summary: Mobile workshop services by category (hierarchical)
 *     description: Returns active services for a given category (including images and pricing).
 *     tags: [5. الورشة المتنقلة للمستخدم (Mobile Workshop User)]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Active services
 */
router.get('/categories/:categoryId/services', catalogHierarchyCtrl.getActiveServicesByCategoryId);

/**
 * @swagger
 * /api/mobile-workshop/bookings:
 *   post:
 *     summary: إنشاء حجز ورشة متنقلة بسيط (تعيين تلقائي لأقرب ورشة)
 *     description: |
 *       التدفق للمستخدم: اختيار خدمة (serviceId) → إرسال الإحداثيات والعنوان → تأكيد.
 *       عند الإنشاء: النظام يعثر على أقرب ورشة متاحة حسب الموقع ويعيّنها تلقائياً.
 *     tags: [5. الورشة المتنقلة للمستخدم (Mobile Workshop User)]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceId, latitude, longitude, addressText, scheduledDate, scheduledTime]
 *             properties:
 *               serviceId:
 *                 type: string
 *                 format: uuid
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               addressText:
 *                 type: string
  *               scheduledDate:
  *                 type: string
  *                 format: date
  *                 example: "2026-04-15"
  *               scheduledTime:
  *                 type: string
  *                 example: "14:30"
 *     responses:
 *       201:
 *         description: Booking created and assigned
 *       404:
 *         description: No available workshop
 */
router.post('/bookings', auth, role('CUSTOMER'), ctrl.createBooking);

/**
 * @swagger
 * /api/mobile-workshop/bookings/{id}:
 *   get:
 *     summary: تفاصيل حجز الورشة المتنقلة (عميل)
 *     tags: [5. الورشة المتنقلة للمستخدم (Mobile Workshop User)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking details
 */
router.get('/bookings/:id', auth, role('CUSTOMER'), ctrl.getBookingById);

module.exports = router;

