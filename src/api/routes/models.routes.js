const express = require('express');
const router = express.Router();
const modelController = require('../controllers/model.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

/**
 * @swagger
 * /models:
 *   get:
 *     summary: Get all vehicle models
 *     description: Retrieve vehicle models with optional filters - احصل على موديلات المركبات مع فلاتر اختيارية
 *     tags: [Vehicle Models]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: string
 *         description: Filter by brand ID - تصفية حسب معرف الماركة
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year - تصفية حسب السنة
 *         example: 2023
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *           enum: [SMALL, MEDIUM, LARGE, EXTRA_LARGE]
 *         description: Filter by size - تصفية حسب الحجم
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Only active models - الموديلات النشطة فقط
 *     responses:
 *       200:
 *         description: Successfully retrieved models - تم جلب الموديلات بنجاح
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
 *                       brandId:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: "Camry"
 *                       nameAr:
 *                         type: string
 *                         example: "كامري"
 *                       year:
 *                         type: integer
 *                         example: 2023
 *                       size:
 *                         type: string
 *                         enum: [SMALL, MEDIUM, LARGE, EXTRA_LARGE]
 *                         example: "MEDIUM"
 *                       imageUrl:
 *                         type: string
 *                         nullable: true
 *                       brand:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                             example: "Toyota"
 *                           nameAr:
 *                             type: string
 *                             example: "تويوتا"
 *                       _count:
 *                         type: object
 *                         properties:
 *                           userVehicles:
 *                             type: integer
 *                             example: 5
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     filters:
 *                       type: object
 */
router.get('/', modelController.getAllModels);

/**
 * @swagger
 * /models/{id}:
 *   get:
 *     summary: Get model by ID
 *     description: Retrieve a specific vehicle model - احصل على موديل محدد
 *     tags: [Vehicle Models]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Model ID - معرف الموديل
 *     responses:
 *       200:
 *         description: Model found - تم العثور على الموديل
 *       404:
 *         description: Model not found - الموديل غير موجود
 */
router.get('/:id', modelController.getModelById);

// Protected routes - require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /models:
 *   post:
 *     summary: Create new model (Admin only)
 *     description: Create a new vehicle model - إنشاء موديل مركبة جديد
 *     tags: [Vehicle Models]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brandId
 *               - name
 *               - year
 *               - size
 *             properties:
 *               brandId:
 *                 type: string
 *                 description: Brand ID - معرف الماركة
 *               name:
 *                 type: string
 *                 example: "Camry"
 *                 description: Model name - اسم الموديل
 *               nameAr:
 *                 type: string
 *                 example: "كامري"
 *                 description: Arabic model name - اسم الموديل بالعربية
 *               year:
 *                 type: integer
 *                 example: 2023
 *                 description: Model year - سنة الموديل
 *               size:
 *                 type: string
 *                 enum: [SMALL, MEDIUM, LARGE, EXTRA_LARGE]
 *                 example: "MEDIUM"
 *                 description: Vehicle size - حجم المركبة
 *               imageUrl:
 *                 type: string
 *                 nullable: true
 *                 description: Model image URL - رابط صورة الموديل
 *     responses:
 *       201:
 *         description: Model created successfully - تم إنشاء الموديل بنجاح
 *       400:
 *         description: Validation error - خطأ في التحقق
 *       404:
 *         description: Brand not found - الماركة غير موجودة
 *       409:
 *         description: Model already exists - الموديل موجود بالفعل
 */
router.post('/',
    roleMiddleware(['ADMIN']),
    modelController.createModel
);

/**
 * @swagger
 * /models/{id}:
 *   patch:
 *     summary: Update model (Admin only)
 *     description: Update an existing model - تحديث موديل موجود
 *     tags: [Vehicle Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Model ID - معرف الموديل
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brandId:
 *                 type: string
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               year:
 *                 type: integer
 *               size:
 *                 type: string
 *                 enum: [SMALL, MEDIUM, LARGE, EXTRA_LARGE]
 *               imageUrl:
 *                 type: string
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Model updated successfully - تم تحديث الموديل بنجاح
 *       404:
 *         description: Model not found - الموديل غير موجود
 *       409:
 *         description: Model with these details already exists - الموديل بهذه التفاصيل موجود بالفعل
 */
router.patch('/:id',
    roleMiddleware(['ADMIN']),
    modelController.updateModel
);

/**
 * @swagger
 * /models/{id}:
 *   delete:
 *     summary: Delete model (Admin only)
 *     description: Delete a model (soft delete by default) - حذف موديل (حفظ افتراضي)
 *     tags: [Vehicle Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Model ID - معرف الموديل
 *       - in: query
 *         name: hardDelete
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Permanently delete model - حذف نهائي للموديل
 *     responses:
 *       200:
 *         description: Model deleted/deactivated - تم حذف/تعطيل الموديل
 *       404:
 *         description: Model not found - الموديل غير موجود
 */
router.delete('/:id',
    roleMiddleware(['ADMIN']),
    modelController.deleteModel
);

module.exports = router;
