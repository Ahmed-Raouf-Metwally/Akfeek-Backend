const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brand.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: Get all vehicle brands
 *     description: Retrieve a list of all vehicle brands (Toyota, BMW, etc.) with optional filters - احصل على قائمة بجميع ماركات المركبات
 *     tags: [Vehicle Brands]
 *     parameters:
 *       - in: query
 *         name: includeModels
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include models for each brand - تضمين موديلات كل ماركة
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Only return active brands - عرض الماركات النشطة فقط
 *     responses:
 *       200:
 *         description: Successfully retrieved brands - تم جلب الماركات بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "uuid-here"
 *                       name:
 *                         type: string
 *                         example: "Toyota"
 *                       nameAr:
 *                         type: string
 *                         example: "تويوتا"
 *                       logo:
 *                         type: string
 *                         nullable: true
 *                         example: "https://example.com/toyota-logo.png"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       _count:
 *                         type: object
 *                         properties:
 *                           models:
 *                             type: integer
 *                             example: 5
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 10
 */
router.get('/', brandController.getAllBrands);

/**
 * @swagger
 * /api/brands/{id}:
 *   get:
 *     summary: Get brand by ID
 *     description: Retrieve a specific brand with all its models - احصل على ماركة محددة مع جميع موديلاتها
 *     tags: [Vehicle Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID - معرف الماركة
 *     responses:
 *       200:
 *         description: Brand found - تم العثور على الماركة
 *       404:
 *         description: Brand not found - الماركة غير موجودة
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Brand not found"
 *                 errorAr:
 *                   type: string
 *                   example: "الماركة غير موجودة"
 *                 code:
 *                   type: string
 *                   example: "BRAND_NOT_FOUND"
 */
router.get('/:id', brandController.getBrandById);

// Protected routes - require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/brands:
 *   post:
 *     summary: Create new brand (Admin only)
 *     description: Create a new vehicle brand - إنشاء ماركة مركبة جديدة
 *     tags: [Vehicle Brands]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Tesla"
 *                 description: Brand name - اسم الماركة
 *               nameAr:
 *                 type: string
 *                 example: "تسلا"
 *                 description: Arabic brand name - اسم الماركة بالعربية
 *               logo:
 *                 type: string
 *                 nullable: true
 *                 example: "https://example.com/tesla-logo.png"
 *                 description: Brand logo URL - رابط شعار الماركة
 *     responses:
 *       201:
 *         description: Brand created successfully - تم إنشاء الماركة بنجاح
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
 *                 message:
 *                   type: string
 *                   example: "Brand created successfully"
 *                 messageAr:
 *                   type: string
 *                   example: "تم إنشاء الماركة بنجاح"
 *       400:
 *         description: Validation error - خطأ في التحقق
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Brand already exists - الماركة موجودة بالفعل
 */
router.post('/',
    roleMiddleware(['ADMIN']),
    brandController.createBrand
);

/**
 * @swagger
 * /api/brands/{id}:
 *   patch:
 *     summary: Update brand (Admin only)
 *     description: Update an existing brand - تحديث ماركة موجودة
 *     tags: [Vehicle Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID - معرف الماركة
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               logo:
 *                 type: string
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Brand updated successfully - تم تحديث الماركة بنجاح
 *       404:
 *         description: Brand not found - الماركة غير موجودة
 *       409:
 *         description: Brand name already exists - اسم الماركة موجود بالفعل
 */
router.patch('/:id',
    roleMiddleware(['ADMIN']),
    brandController.updateBrand
);

/**
 * @swagger
 * /api/brands/{id}:
 *   delete:
 *     summary: Delete brand (Admin only)
 *     description: Delete a brand (soft delete by default) - حذف ماركة (حفظ افتراضي)
 *     tags: [Vehicle Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID - معرف الماركة
 *       - in: query
 *         name: hardDelete
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Permanently delete brand and all models - حذف نهائي للماركة وجميع الموديلات
 *     responses:
 *       200:
 *         description: Brand deleted/deactivated - تم حذف/تعطيل الماركة
 *       404:
 *         description: Brand not found - الماركة غير موجودة
 */
router.delete('/:id',
    roleMiddleware(['ADMIN']),
    brandController.deleteBrand
);

module.exports = router;
