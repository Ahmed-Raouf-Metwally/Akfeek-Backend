# دليل تيستات الفلو — أكفيك

كيف تشغّل تيستات كل الفلوات في الموقع (من طرف العميل/الفيندور/الأدمن حسب الفلو).

---

## تشغيل كل التيستات مرة واحدة

```bash
# 1) تشغيل السيرفر في طرفية
npm run dev

# 2) في طرفية ثانية: تشغيل كل الفلوات
npm run test:all-flows
```

السكربت `scripts/run-all-flow-tests.js` يشغّل بالترتيب كل تيستات الفلو الموجودة ويطبع ✅/❌ لكل واحد.

**تخطي فلوات معينة (مثلاً الوينش والاسترداد):**
```bash
SKIP_FLOWS=winch,refund npm run test:all-flows
```

---

## المتطلبات العامة

- **السيرفر:** يجب أن يكون `npm run dev` شغال على نفس الـ Base URL (افتراضي `http://localhost:3000`).
- **قاعدة البيانات:** يفضّل تشغيل الـ seed الكامل مرة واحدة:
  ```bash
  npm run prisma:db:sync
  ```
  أو على الأقل الـ seeds المطلوبة لكل فلو (انظر الجدول أدناه).

---

## الفلوات والتيستات المتوفرة

| الفلو | سكربت التيست | أمر التشغيل المنفرد | ملاحظات |
|-------|----------------|----------------------|---------|
| العناية الشاملة | `test-comprehensive-care-flow.js` | `npm run test:comprehensive-care-flow` | عميل: حجز خدمة → فاتورة → دفع. فيندور: إكمال الحجز. |
| الورش المعتمدة | `test-certified-workshop-flow.js` | `npm run test:certified-workshop-flow` | عميل: ورشة + خدمات → حجز. فيندور: إكمال. |
| غسيل السيارات | `test-carwash-flow.js` | `npm run test:carwash-flow` | طلب غسيل → عروض → قبول. |
| غسيل — جانب الفيندور | `test-carwash-flow-vendor.js` | `npm run test:carwash-flow-vendor` | نفس الفلو من طرف الفيندور. |
| الورش المتنقلة | `test-mobile-workshop-flow.js` | `npm run test:mobile-workshop-flow` | طلب → عروض ورش → اختيار عرض → فاتورة → دفع. |
| الوينش / السحب | `test-winch-flow.js` | `npm run test:winch-flow` | طلب سحب → عروض وينش → قبول → أدمن يحدد مدفوع → فيندور يكمّل. |
| الاستردادات | `test-refund-flow.js` | `npm run test:refund-flow` | عميل يدفع فاتورة → أدمن يسترد. |

---

## تشغيل تيست واحد فقط

```bash
npm run test:comprehensive-care-flow
npm run test:certified-workshop-flow
npm run test:carwash-flow
npm run test:mobile-workshop-flow
npm run test:winch-flow
npm run test:refund-flow
```

لتغيير الـ Base URL أو المستخدمين (من الـ seed):
```bash
API_BASE_URL=http://localhost:3000 TEST_CUSTOMER_EMAIL=user@example.com npm run test:comprehensive-care-flow
```

---

## التيستات المذكورة في package.json وغير موجودة حالياً

- `test:order-flow` → `scripts/test-order-flow.js` (غير موجود)
- `test:marketplace-parts-flow` → `scripts/test-marketplace-parts-flow.js` (غير موجود)

لتفادي خطأ "Missing script" لا تستخدم هذين الأمرين حتى يتم إنشاء السكربتات.  
`test:all-flows` يشغّل فقط الملفات الموجودة ولا يتضمن order/marketplace.

---

## إضافة تيست لفلو جديد

1. أنشئ ملفاً في `scripts/` مثل `test-<اسم-الفلو>-flow.js`.
2. استخدم نفس أسلوب التيستات الحالية: `axios` على `/api`, تسجيل دخول عميل/فيندور/أدمن حسب الحاجة، ثم استدعاء الـ endpoints بالترتيب.
3. أضف السكربت في `package.json`:
   ```json
   "test:<اسم>-flow": "node scripts/test-<اسم>-flow.js"
   ```
4. أضف عنصراً في مصفوفة `FLOW_TESTS` داخل `scripts/run-all-flow-tests.js` حتى يُشغّل مع `npm run test:all-flows`.
