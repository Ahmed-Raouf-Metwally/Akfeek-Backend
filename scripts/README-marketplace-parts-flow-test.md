# اختبار فلو قطع الغيار (من الطلب حتى التوصيل)

## الهدف

التحقق من الفلو الكامل لبيع قطع الغيار: العميل يطلب قطعة ويدفع ثم الطلب يصل (حالة DELIVERED).

## المتطلبات

1. **السيرفر يعمل:** `npm run dev`
2. **قاعدة البيانات:** عميل (مثلاً `ahmed.ali@example.com` / `Admin123!`) وقطع غيار ذات مخزون (من الـ seed أو إدخال يدوي)
3. **أدمن:** `admin@akfeek.com` / `Admin123!`

إذا لم تكن قطع الغيار موجودة، شغّل الـ seed الذي يضيف أصناف قطع غيار وفيندور (إن وُجد، مثلاً seed لجذور الفئات وقطع غيار).

## تشغيل الاختبار

```bash
npm run test:marketplace-parts-flow
```

أو مع متغيرات:

```bash
API_BASE_URL=http://localhost:3000 TEST_CUSTOMER_EMAIL=ahmed.ali@example.com node scripts/test-marketplace-parts-flow.js
```

## الخطوات التي يغطيها الاختبار

1. **العميل:** تسجيل دخول → عرض قطع الغيار → إضافة قطعة للسلة → إتمام الطلب (checkout)
2. **أدمن:** تحديد الطلب كمدفوع (`paymentStatus: PAID`)
3. **أدمن:** تحديث حالة الطلب: `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`
4. **العميل:** عرض "طلباتي" والتحقق من أن الطلب بحالة `DELIVERED` و`paymentStatus: PAID`

## استكشاف الأخطاء

| الرسالة | الحل |
|--------|------|
| Customer login failed | شغّل seed يحتوي على عميل (مثلاً ahmed.ali@example.com) |
| No auto parts found | أضف قطع غيار في DB (من واجهة الأدمن أو seed) |
| No stock for first part | تأكد أن صنف قطع الغيار له stockQuantity > 0 |
| Admin login failed | استخدم حساب أدمن صحيح (مثلاً admin@akfeek.com) |

## متغيرات البيئة (اختيارية)

- `API_BASE_URL` أو `TEST_API_URL`: عنوان الـ API (افتراضي: http://localhost:3000)
- `TEST_CUSTOMER_EMAIL`, `TEST_CUSTOMER_PASSWORD`: حساب العميل
- `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`: حساب الأدمن
