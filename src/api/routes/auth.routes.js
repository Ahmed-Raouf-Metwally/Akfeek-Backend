const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const {
    optionalAuth
} = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user
 *     description: |
 *       Create a new user account (Customer, Technician, or Supplier)
 *       
 *       إنشاء حساب مستخدم جديد (عميل، فني، أو مورد)
 *     tags: [🔓 Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ahmed@example.com
 *                 description: User email - البريد الإلكتروني
 *               phone:
 *                 type: string
 *                 example: '+966501234567'
 *                 description: Phone number with country code - رقم الهاتف مع رمز الدولة
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: StrongPass123!
 *                 description: Password (min 8 chars) - كلمة المرور (8 أحرف على الأقل)
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, TECHNICIAN, SUPPLIER]
 *                 example: CUSTOMER
 *                 description: User role - دور المستخدم
 *               firstName:
 *                 type: string
 *                 example: Ahmed
 *                 description: First name - الاسم الأول
 *               lastName:
 *                 type: string
 *                 example: Al-Mutairi
 *                 description: Last name - اسم العائلة
 *               preferredLanguage:
 *                 type: string
 *                 enum: [AR, EN]
 *                 default: AR
 *                 example: AR
 *                 description: Preferred language - اللغة المفضلة
 *     responses:
 *       201:
 *         description: User registered successfully - تم التسجيل بنجاح
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
 *                   example: Registration successful
 *                 messageAr:
 *                   type: string
 *                   example: تم التسجيل بنجاح
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         profile:
 *                           type: object
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email or phone already exists - البريد الإلكتروني أو الهاتف موجود بالفعل
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: |
 *       Authenticate user with email/phone and password, return JWT token
 *       
 *       مصادقة المستخدم بالبريد الإلكتروني/الهاتف وكلمة المرور، وإرجاع رمز JWT
 *     tags: [🔓 Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: ahmed@example.com
 *                 description: Email or phone number - البريد الإلكتروني أو رقم الهاتف
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass123!
 *     responses:
 *       200:
 *         description: Login successful - تم تسجيل الدخول بنجاح
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
 *                   properties:
 *                     user:
 *                       type: object
 *                     token:
 *                       type: string
 *       401:
 *         description: Invalid credentials - بيانات اعتماد غير صحيحة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to phone
 *     description: |
 *       Send OTP code to user's phone number for verification
 *       
 *       إرسال رمز OTP إلى رقم هاتف المستخدم للتحقق
 *     tags: [🔓 Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: '+966501234567'
 *     responses:
 *       200:
 *         description: OTP sent successfully - تم إرسال OTP بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/send-otp', authController.sendOTP);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP
 *     description: |
 *       Verify phone number with OTP code
 *       
 *       التحقق من رقم الهاتف برمز OTP
 *     tags: [🔓 Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *             properties:
 *               phone:
 *                 type: string
 *                 example: '+966501234567'
 *               code:
 *                 type: string
 *                 example: '123456'
 *     responses:
 *       200:
 *         description: OTP verified - تم التحقق من OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid OTP - رمز OTP غير صحيح
 */
router.post('/verify-otp', authController.verifyOTP);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     description: |
 *       Get authenticated user's profile information
 *       
 *       الحصول على معلومات ملف المستخدم المصادق عليه
 *     tags: [🔓 Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved - تم استرجاع ملف المستخدم
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/me', optionalAuth, authController.getCurrentUser);

module.exports = router;
