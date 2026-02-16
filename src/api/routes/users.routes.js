const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     description: |
 *       Get authenticated user's profile information
 *       
 *       الحصول على معلومات الملف الشخصي للمستخدم
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved - تم استرجاع الملف الشخصي
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/profile', userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     description: |
 *       Update current user's profile information
 *       
 *       تحديث معلومات الملف الشخصي
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Ahmed
 *               lastName:
 *                 type: string
 *                 example: Al-Mutairi
 *               bio:
 *                 type: string
 *                 example: Professional car technician
 *               bioAr:
 *                 type: string
 *                 example: فني سيارات محترف
 *               avatar:
 *                 type: string
 *                 example: https://example.com/avatar.jpg
 *     responses:
 *       200:
 *         description: Profile updated - تم تحديث الملف الشخصي
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/profile', userController.updateProfile);

/**
 * @swagger
 * /api/users/technician-profile:
 *   put:
 *     summary: Update technician profile
 *     description: |
 *       Update technician-specific profile fields
 *       
 *       تحديث بيانات الفني
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               licenseNumber:
 *                 type: string
 *               yearsExperience:
 *                 type: integer
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Technician profile updated
 *       403:
 *         description: User is not a technician
 */
router.put('/technician-profile', userController.updateTechnicianProfile);

/**
 * @swagger
 * /api/users/supplier-profile:
 *   put:
 *     summary: Update supplier profile
 *     description: |
 *       Update supplier-specific profile fields
 *       
 *       تحديث بيانات المورد
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               businessNameAr:
 *                 type: string
 *               businessLicense:
 *                 type: string
 *     responses:
 *       200:
 *         description: Supplier profile updated
 */
router.put('/supplier-profile', userController.updateSupplierProfile);

/**
 * @swagger
 * /api/users/language:
 *   put:
 *     summary: Update language preference
 *     description: |
 *       Update user's preferred language
 *       
 *       تحديث اللغة المفضلة
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - language
 *             properties:
 *               language:
 *                 type: string
 *                 enum: [AR, EN]
 *                 example: AR
 *     responses:
 *       200:
 *         description: Language updated
 */
router.put('/language', userController.updateLanguage);

// Admin-only routes
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: |
 *       Get paginated list of all users with filters
 *       
 *       الحصول على قائمة المستخدمين (للمشرف فقط)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [CUSTOMER, TECHNICIAN, SUPPLIER, ADMIN]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Users list retrieved
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/', requireRole('ADMIN'), userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', requireRole('ADMIN'), userController.getUserById);

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: Update user status (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, PENDING_VERIFICATION, SUSPENDED, BANNED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', requireRole('ADMIN'), userController.updateUserStatus);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               bio:
 *                 type: string
 *               bioAr:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id', requireRole('ADMIN'), userController.updateUserByAdmin);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/:id', requireRole('ADMIN'), userController.deleteUser);

module.exports = router;
