# اختبار فلو الوينش (Winch Flow Test)

## المتطلبات

1. **قاعدة البيانات** تعمل (MySQL على المنفذ المحدد في `.env` أو `localhost:3306`).
2. **البيانات الأساسية (Demo Seed)**: تشغيل seed الديمو مرة واحدة على الأقل:
   ```bash
   npm run prisma:seed:demo
   ```
   (يُنشئ عملاء مثل `user1@akfeek.com` + فيندور ونش `vendor2@akfeek.com` + ونش فعلي + إعدادات السحب.)
4. **السيرفر يعمل**:
   ```bash
   npm run dev
   ```

## تشغيل الاختبار

من مجلد المشروع:

```bash
npm run test:winch-flow
```

أو مع متغيرات بيئة:

```bash
API_BASE_URL=http://localhost:3000 node scripts/test-winch-flow.js
```

## ماذا يتحقق الاختبار؟

**فيندور الوينش هو المتحكم بالكامل** (لا دور للفني في هذا الفلو):

1. **عميل**: تسجيل دخول → جلب المركبات → إنشاء طلب سحب (من/إلى موقع في الرياض).
2. **فيندور الوينش**: تسجيل دخول → جلب الطلبات القريبة → إرسال عرض (السعر يُحسب من pricePerKm).
3. **عميل**: جلب العروض → قبول عرض → الحصول على بيانات الحجز والفاتورة.
4. **أدمن**: تحديد الفاتورة كمدفوعة (إيداع حصة الفيندور في محفظته وخصم عمولة المنصة، وفتح السوكت للتتبع).
5. **فيندور الوينش**: GET /api/winches/my/jobs (مهامه فقط) ثم PATCH /api/winches/my/jobs/{jobId}/status: TECHNICIAN_EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED.

## استكشاف الأخطاء

| الرسالة | الحل |
|--------|------|
| Customer login failed | شغّل `npm run prisma:seed:demo` (user1@akfeek.com / password123). |
| Vendor login failed | شغّل `npm run prisma:seed:demo` (vendor2@akfeek.com / password123). |
| Admin login failed | شغّل `npm run prisma:seed` (admin@akfeek.com / admin123). |
| No vehicles | تأكد أن العميل له مركبات (الـ seed الرئيسي يضيف مركبات لأول عملاء). |
| Can't reach database server | شغّل MySQL واتصل بالمنفذ الصحيح في `.env`. |

## متغيرات البيئة (اختيارية)

- `API_BASE_URL` أو `TEST_API_URL`: عنوان الـ API (افتراضي: `http://localhost:3000`).
- `TEST_CUSTOMER_EMAIL`, `TEST_CUSTOMER_PASSWORD`: عميل (افتراضي: user1@akfeek.com / password123).
- `TEST_WINCH_VENDOR_EMAIL`, `TEST_WINCH_VENDOR_PASSWORD`: فيندور الوينش (افتراضي: vendor2@akfeek.com / password123).
- `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`: أدمن (افتراضي: admin@akfeek.com / admin123).
