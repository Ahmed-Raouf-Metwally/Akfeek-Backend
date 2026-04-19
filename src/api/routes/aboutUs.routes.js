const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/aboutUs.controller');

/**
 * @swagger
 * /api/about-us:
 *   get:
 *     summary: Get About Us page (من نحن)
 *     description: |
 *       **عام — بدون توكن.** يعيد كل بيانات شاشة «من نحن» للتطبيق: اسم العلامة (عربي/إنجليزي)، رابط الشعار،
 *       عنوان وفقرة المقدمة، عنوان قسم القيم، وقائمة **البطاقات النشطة فقط** (`isActive: true`).
 *
 *       حقول `logoUrl` و `iconUrl` تُعاد كروابط مطلقة (تتضمن نطاق الـ API) عند التعيين.
 *       الحقل `iconKey` قيم محددة (`check_badge`, `sparkles`, `shield`, `star`) لربطها بأصول ثابتة في الموبايل؛
 *       ويمكن استخدام `iconUrl` عند رفع أيقونة مخصصة من الداشبورد.
 *     tags: [About Us]
 *     security: []
 *     responses:
 *       200:
 *         description: OK — full About Us page in the JSON property `data` (and `success` is true).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AboutUsPublicResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "00000000-0000-0000-0000-000000000001"
 *                 brandNameEn: "Akfeek"
 *                 brandNameAr: "أكفيك"
 *                 logoUrl: "https://example.com/uploads/about-us/logo-1.png"
 *                 introHeadingAr: "نقدم صيانة و قطع غيار بثقة و سهولة"
 *                 introHeadingEn: "Maintenance and spare parts with trust and ease"
 *                 introBodyAr: "نص المقدمة بالعربية…"
 *                 introBodyEn: "Intro body in English…"
 *                 valuesSectionTitleAr: "القيم الأساسية"
 *                 valuesSectionTitleEn: "Core values"
 *                 createdAt: "2026-01-01T00:00:00.000Z"
 *                 updatedAt: "2026-01-01T00:00:00.000Z"
 *                 coreValues:
 *                   - id: "00000000-0000-0000-0000-000000000002"
 *                     sortOrder: 0
 *                     titleAr: "الثقة و الشفافية"
 *                     titleEn: "Trust and transparency"
 *                     descriptionAr: "وصف القيمة…"
 *                     descriptionEn: "Value description…"
 *                     iconKey: "check_badge"
 *                     iconUrl: null
 *       500:
 *         description: خطأ خادم
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', ctrl.getPublic);

module.exports = router;
