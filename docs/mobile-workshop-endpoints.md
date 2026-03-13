# Endpoints الورش المتنقلة — الحالة والاستخدام

## ملخص

| الحالة | المعنى |
|--------|--------|
| **مستخدم** | مستدعى من الداشبورد أو التست أو الفلو الرئيسي |
| **غير مستخدم** | موجود في الـ API لكن لا يُستدعى من الواجهة/التطبيق حالياً |
| **ناقص** | مطلوب للفلو لكن غير موجود — يُقترح إضافته |

---

## 1) فلو الطلب والعروض (Request → Offers → Select → Invoice → Pay)

هذا الفلو **مستخدم** في التست والمنطق الرئيسي للورش المتنقلة.

| Method | Endpoint | الحالة | ملاحظات |
|--------|----------|--------|---------|
| GET | `/api/mobile-workshop-types` | **مستخدم** | التست + الداشبورد (قائمة أنواع الورش) |
| GET | `/api/mobile-workshop-types/{id}` | غير مستخدم | مفيد لو شاشة تفاصيل نوع واحد |
| GET | `/api/mobile-workshop-types/{typeId}/services` | غير مستخدم | بديل لاستخراج الخدمات من الـ types في رد واحد |
| POST | `/api/mobile-workshop-requests` | **مستخدم** | التست — إنشاء طلب وإشعار الورش |
| GET | `/api/mobile-workshop-requests` | **مستخدم** | التست — طلباتي (عميل) |
| GET | `/api/mobile-workshop-requests/{id}` | **مستخدم** | التست — تفاصيل الطلب + العروض |
| POST | `/api/mobile-workshop-requests/{requestId}/select-offer` | **مستخدم** | التست — اختيار عرض → حجز + فاتورة |
| GET | `/api/mobile-workshops` | **مستخدم** | التست + الداشبورد (قائمة الورش) |
| GET | `/api/mobile-workshops/{id}` | **مستخدم** | تفاصيل ورشة واحدة |
| **GET** | **`/api/mobile-workshops/my`** | **مستخدم (فيندور)** | ورشتي المتنقلة — موجود في الباكند والداشبورد (vendor/mobile-workshop) |
| GET | `/api/mobile-workshops/my/requests` | **مستخدم** | التست + الداشبورد — طلبات ورشتي (بائع) |
| POST | `/api/mobile-workshops/{workshopId}/requests/{requestId}/offer` | **مستخدم** | التست — إرسال عرض (بائع) |

**ملاحظة:** بعد اختيار العرض والدفع يُستخدم:
- `GET /api/invoices/my/{id}` و `PATCH /api/invoices/my/{id}/pay` (مستخدم في التست).

---

## 2) CRUD الورش وأنواعها (أدمن)

| Method | Endpoint | الحالة | ملاحظات |
|--------|----------|--------|---------|
| POST | `/api/mobile-workshops` | غير مستخدم من واجهة | موجود — إضافة ورشة (أدمن) |
| PUT | `/api/mobile-workshops/{id}` | غير مستخدم من واجهة | تحديث ورشة (أدمن) |
| DELETE | `/api/mobile-workshops/{id}` | غير مستخدم من واجهة | حذف ورشة (أدمن) |
| POST | `/api/mobile-workshops/{id}/services` | غير مستخدم من واجهة | إضافة خدمة لورشة (أدمن) |
| PUT | `/api/mobile-workshops/{id}/services/{svcId}` | غير مستخدم من واجهة | تحديث خدمة ورشة (أدمن) |
| DELETE | `/api/mobile-workshops/{id}/services/{svcId}` | غير مستخدم من واجهة | حذف خدمة ورشة (أدمن) |
| POST | `/api/mobile-workshop-types` | غير مستخدم من واجهة | إضافة نوع ورشة (أدمن) |
| GET | `/api/mobile-workshop-types/{typeId}/services` | غير مستخدم | خدمات نوع الورشة |
| POST | `/api/mobile-workshop-types/{typeId}/services` | غير مستخدم من واجهة | إضافة خدمة لنوع (أدمن) |
| GET | `/api/mobile-workshop-types/{id}` | غير مستخدم | نوع ورشة بالمعرف |
| PUT | `/api/mobile-workshop-types/{id}` | غير مستخدم من واجهة | تحديث نوع (أدمن) |
| DELETE | `/api/mobile-workshop-types/{id}` | غير مستخدم من واجهة | حذف نوع (أدمن) |
| PUT | `/api/mobile-workshop-types/{typeId}/services/{serviceId}` | غير مستخدم من واجهة | تحديث خدمة نوع (أدمن) |
| DELETE | `/api/mobile-workshop-types/{typeId}/services/{serviceId}` | غير مستخدم من واجهة | حذف خدمة نوع (أدمن) |

هذه الـ CRUD **موجودة** وتُستخدم من Swagger/أدمن عند الحاجة؛ لو الداشبورد ما يعرض شاشات إدارية لها فهي "غير مستخدمة من واجهة" فقط.

---

## 3) فلو الحجز المباشر (Mobile Car Service) — بدون طلبات/عروض

فلو **مستقل**: حجز مباشر من كاتالوج الخدمات (subServiceId + vehicleId + location).  
**غير مستخدم** من الداشبورد حالياً (الرابط معطّل في السايدبار).

| Method | Endpoint | الحالة | ملاحظات |
|--------|----------|--------|---------|
| GET | `/api/mobile-car-service` | غير مستخدم | Parent service + sub-services |
| GET | `/api/mobile-car-service/sub-services` | غير مستخدم | قائمة الخدمات الفرعية |
| GET | `/api/mobile-car-service/compatible-parts` | غير مستخدم | قطع متوافقة مع الخدمة والمركبة |
| GET | `/api/mobile-car-service/recommended-parts` | غير مستخدم | قطع موصى بها |
| **POST** | **`/api/mobile-car-service/bookings`** | **غير مستخدم** | إنشاء حجز ورشة متنقلة (حجز مباشر بدون عروض) |
| GET | `/api/mobile-car-service/bookings/:id` | غير مستخدم | تفاصيل حجز |
| PATCH | `/api/mobile-car-service/bookings/:id/status` | غير مستخدم | تحديث حالة الحجز (فني/أدمن) |

**قرار:** إذا كنت تريد فلو "حجز مباشر" (بدون طلب وعروض)، شغّل واجهات هذا الفلو وربطها بهذه الـ endpoints. إذا كنت تعتمد فقط على فلو "طلب → عروض → اختيار → دفع"، يمكن ترك هذه أو إخفاؤها من القائمة المعتمدة.

---

## 4) endpoints قد تكون ناقصة (مقترحة)

| المطلوب | الاقتراح |
|---------|----------|
| إلغاء طلب عميل قبل اختيار عرض | `PATCH /api/mobile-workshop-requests/{id}/cancel` أو `POST .../cancel` |
| قائمة حجوزات العميل للورش المتنقلة فقط | استعمال `GET /api/bookings?...&serviceType=MOBILE_WORKSHOP` إن وُجد، أو إضافة فلتر في نفس الـ endpoint |
| إلغاء/رفض عرض من البائع | `PATCH /api/mobile-workshops/.../offers/{offerId}/withdraw` إن احتجت |
| قائمة عروض طلب (للعميل) بدون جلب الطلب كامل | موجودة داخل `GET /api/mobile-workshop-requests/{id}` (العروض مدمجة في التفاصيل) |

---

## 5) توصيات سريعة

1. **الاستخدام الحالي:** اعتمد على فلو **mobile-workshop-requests** + **mobile-workshops** + **mobile-workshop-types** + **invoices** (كما في التست).
2. **GET /api/mobile-workshops/my:** موجود ومفيد للفيندور — يمكن إضافته رسمياً في قائمة الـ endpoints المعتمدة للورش المتنقلة.
3. **POST /api/mobile-car-service/bookings:** إن أردت "حجز مباشر" بدون عروض، فعّل الواجهة وربطها به؛ وإلا اعتبره فلو بديل غير مستخدم حالياً.
4. **CRUD الأدمن:** كلها موجودة؛ إضافة شاشات إدارية في الداشبورد يجعلك "تستخدمها" رسمياً.

إذا حددت أي endpoints تريد تفعيلها أو أي فلو ناقص (مثلاً إلغاء طلب)، يمكن تنفيذها في الباكند والفرونت خطوة بخطوة.
