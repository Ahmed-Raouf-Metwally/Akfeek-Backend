# مسار إنشاء الورشة (Workshop Create Flow)

## ربط الفرونت بالباكند (ملفات المشروع)

| المرحلة | الفرونتند (Frontend) | الباكند (Backend) |
|--------|------------------------|-------------------|
| **نموذج + إرسال الطلب** | `Akfeek-Dashboard-Frontend/src/pages/WorkshopsPage.jsx` — `handleFormSubmit` يبني الـ payload و `createMutation.mutate(payload)` | — |
| **استدعاء الـ API** | `Akfeek-Dashboard-Frontend/src/services/workshopService.js` — `createWorkshop(payload)` → `POST /api/workshops/admin/workshops` | — |
| **استقبال الطلب** | — | `Akfeek-Backend/src/api/routes/workshops.routes.js` — `POST /admin/workshops` → `workshopController.createWorkshop` |
| **معالجة الموقع (locationUrl → lat/lng)** | — | `Akfeek-Backend/src/api/controllers/workshop.controller.js` — `createWorkshop` + `parseGoogleMapsUrl` (من `utils/mapsParser`) |
| **التحقق والحفظ في DB** | — | `Akfeek-Backend/src/services/workshop.service.js` — `createWorkshop(data)` → `prisma.certifiedWorkshop.create()` |
| **تعريف الجدول** | — | `Akfeek-Backend/prisma/schema.prisma` — موديل `CertifiedWorkshop` |

**الرابط بين الفرونت والـ API:**  
الفرونت يستخدم الـ base URL من `Akfeek-Dashboard-Frontend/.env` (مثلاً `VITE_API_URL=http://localhost:3000/api`)؛ فـ `workshopService.createWorkshop` بيبعت لـ `POST ${VITE_API_URL}/workshops/admin/workshops`.


---

## ١ – البيانات اللي الواجهة **بتبعتّها** (Frontend → API)

عند ضغط "إنشاء ورشة" الواجهة بتعمل `POST /api/workshops/admin/workshops` بالـ body التالي:

| الحقل | المطلوب؟ | مثال / ملاحظات |
|-------|----------|-----------------|
| `name` | ✅ نعم | اسم الورشة (إنجليزي) |
| `nameAr` | لا | اسم عربي |
| `description` | لا | وصف |
| `descriptionAr` | لا | وصف عربي |
| `address` | ✅ نعم | العنوان |
| `addressAr` | لا | العنوان عربي |
| `city` | ✅ نعم | المدينة |
| `cityAr` | لا | المدينة عربي |
| `locationUrl` | ✅ نعم (عند الإنشاء فقط) | رابط مشاركة Google Maps (يُستخرج منه latitude & longitude) |
| `phone` | ✅ نعم | رقم الهاتف |
| `email` | لا | البريد |
| `services` | ✅ نعم | نص (مثلاً JSON array كسلسلة: `["Engine Repair", "Oil Change"]`) |
| `workingHours` | لا | كائن: `{ "sunday": { "open": "09:00", "close": "18:00" }, "friday": { "closed": true }, ... }` |
| `isActive` | لا (افتراضي true) | true / false |
| `isVerified` | لا (افتراضي false) | true / false |

**ملاحظة:** الواجهة **لا** تبعت `latitude` ولا `longitude`؛ الباكند بيستخرجهما من `locationUrl`.

**في الفرونت:** الـ payload بيتجمّع في `WorkshopsPage.jsx` داخل `handleFormSubmit`؛ الـ request بيتبعت عبر `workshopService.createWorkshop(payload)` في `workshopService.js`.


---

## ٢ – اللي الـ Controller **بيعمله** (قبل الـ Service)

1. ياخد `req.body` كامل.
2. لو في `locationUrl`:
   - يستدعي `parseGoogleMapsUrl(locationUrl)` ويستخرج `latitude` و `longitude`.
   - يضيفهم للـ payload ويشيل `locationUrl` (مش موجود في الـ schema).
3. لو مفيش `latitude` أو `longitude` بعد كده يرمي خطأ: "Location is required. Please provide a valid Google Maps URL."
4. يمرر الـ payload للـ `workshopService.createWorkshop(payload)`.

**يعني اللي بيوصل للـ Service:** نفس الحقول اللي فوق، لكن بدل `locationUrl` هتلاقي `latitude` و `longitude` (أرقام).

**في الباكند:** `workshop.controller.js` — الدالة `createWorkshop` (حوالي سطر 76).


---

## ٣ – اللي الـ Service **بيقبله ويحطه في الـ createData** (قبل قاعدة البيانات)

الـ Service بيقرأ من الـ payload ويبني `createData` اللي بيتحط في `prisma.certifiedWorkshop.create()`:

| من الـ payload | في createData | ملاحظات |
|----------------|---------------|---------|
| `name` | ✅ `name` (مطلوب) | يُتحول لـ string ويُقصّ الـ trim |
| `nameAr` | ✅ `nameAr` أو null | |
| `description` | ✅ أو null | |
| `descriptionAr` | ✅ أو null | |
| `address` | ✅ مطلوب | |
| `addressAr` | ✅ أو null | |
| `city` | ✅ مطلوب | |
| `cityAr` | ✅ أو null | |
| `latitude` | ✅ مطلوب | رقم (يُستخرج من locationUrl في الـ Controller) |
| `longitude` | ✅ مطلوب | رقم |
| `phone` | ✅ مطلوب | |
| `email` | ✅ أو null | لو فاضي بيتحط null |
| `services` | ✅ مطلوب | لو مصفوفة بتتسلسل لـ JSON string، وإلا string كما هي |
| `workingHours` | ✅ لو كائن مش فاضي | نفس الشكل: `{ "sunday": { "open", "close" }, ... }` |
| `isActive` | ✅ | افتراضي true لو مش مبعوت |
| `isVerified` | ✅ | true فقط لو مبعوت true |
| `logo` | ✅ لو مبعوتة | |
| `images` | ✅ لو مبعوت | |
| `vendorId` | ✅ لو مبعوت | لربط الورشة بفيندور (اختياري) |

التحقق في الـ Service:
- مفيش ورشة بدون: `name`, `city`, `address`, `phone`, `services`, `latitude`, `longitude`.
- `workingHours` لو موجودة تتتحقق بصيغة الـ validateWorkingHours.

**في الباكند:** `workshop.service.js` — الدالة `createWorkshop` (سطر ~235)؛ التحقق من ساعات العمل في `utils/validateWorkingHours.js`.


---

## ٤ – أعمدة الجدول في **قاعدة البيانات** (CertifiedWorkshop)

هذه كل الأعمدة الموجودة في الجدول؛ اللي بيتحط عند الإنشاء من الـ createData، واللي بيكون قيم افتراضية من الـ schema:

| العمود في DB | من الـ create؟ | القيمة الافتراضية / نوع |
|--------------|----------------|---------------------------|
| `id` | لا (تلقائي) | uuid |
| `name` | ✅ | - |
| `nameAr` | ✅ | NULL |
| `description` | ✅ | NULL |
| `descriptionAr` | ✅ | NULL |
| `address` | ✅ | - |
| `addressAr` | ✅ | NULL |
| `city` | ✅ | - |
| `cityAr` | ✅ | NULL |
| `latitude` | ✅ | - |
| `longitude` | ✅ | - |
| `phone` | ✅ | - |
| `email` | ✅ | NULL |
| `workingHours` | ✅ (لو مبعوت) | NULL (Json) |
| `services` | ✅ | نص (String/Text) |
| `averageRating` | لا | 0 |
| `totalReviews` | لا | 0 |
| `totalBookings` | لا | 0 |
| `maxDailyCapacity` | لا | NULL |
| `logo` | ✅ (لو مبعوت) | NULL |
| `images` | ✅ (لو مبعوت) | NULL (Json) |
| `isActive` | ✅ | true |
| `isVerified` | ✅ | false |
| `verifiedAt` | لا | NULL |
| `createdAt` | لا (تلقائي) | now() |
| `updatedAt` | لا (تلقائي) | now() |
| `vendorId` | ✅ (لو مبعوت) | NULL |

**في الباكند:** التعريف في `prisma/schema.prisma` — موديل `CertifiedWorkshop` (حوالي سطر 646). الجدول الفعلي في الـ DB اسمه `CertifiedWorkshop` (MySQL).


**ملخص:**  
- اللي **مفروض يتبعت** من الواجهة: الـ payload في القسم ١ (مع `locationUrl` للإنشاء).  
- اللي **فعلاً بيتبعت** للـ API: نفس الـ payload.  
- اللي **بيتحط في الداتابيز**: الحقول اللي في القسم ٣ بعد التحويل والتحقق، مع القيم الافتراضية للـ schema في القسم ٤.
