# API Endpoints الخاصة بالعميل فقط

جميع المسارات تحت البادئة: **`/api`**  
المصادقة: `Authorization: Bearer <token>` (ما لم يُذكر "عام").

---

## مصادقة وحساب المستخدم

| Method | Endpoint | وصف |
|--------|----------|-----|
| POST | `/auth/register` | تسجيل عميل جديد |
| POST | `/auth/login` | تسجيل الدخول |
| GET | `/auth/me` | المستخدم الحالي (اختياري المصادقة) |
| POST | `/auth/send-otp` | إرسال OTP للهاتف |
| POST | `/auth/verify-otp` | التحقق من OTP |

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/users/profile` | الملف الشخصي |
| PUT | `/users/profile` | تحديث الملف الشخصي |
| PUT | `/users/language` | تحديث لغة التفضيل |

---

## عام (بدون مصادقة)

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/role-labels` | تسميات الأدوار (عرض في الواجهة) |
| GET | `/brands` | قائمة ماركات المركبات |
| GET | `/brands/:id` | ماركة حسب المعرّف |
| GET | `/models` | قائمة موديلات المركبات |
| GET | `/models/:id` | موديل حسب المعرّف |
| GET | `/mobile-workshop-types` | أنواع الورش المتنقلة |
| GET | `/mobile-workshop-types/:typeId/services` | خدمات نوع الورشة |
| GET | `/mobile-workshop-types/:id` | نوع ورشة حسب المعرّف |

---

## المركبات

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/vehicles/brands` | ماركات المركبات (كتالوج) |
| GET | `/vehicles/brands/:brandId/models` | موديلات ماركة |
| GET | `/vehicles` | مركباتي |
| POST | `/vehicles` | إضافة مركبة |
| GET | `/vehicles/:id` | تفاصيل مركبة |
| PUT | `/vehicles/:id` | تحديث مركبة |
| DELETE | `/vehicles/:id` | حذف مركبة |
| PATCH | `/vehicles/:id/primary` | تعيين المركبة الأساسية |

---

## العناوين

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/addresses` | عناويني |
| GET | `/addresses/:id` | عنوان حسب المعرّف |
| POST | `/addresses` | إضافة عنوان |
| PUT | `/addresses/:id` | تحديث عنوان |
| DELETE | `/addresses/:id` | حذف عنوان |

---

## الخدمات والكتالوج

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/services` | قائمة الخدمات (مع فلاتر: category, vendorId...) |
| GET | `/services/:id/available-slots` | الأوقات المتاحة لخدمة |
| GET | `/services/:id` | تفاصيل خدمة |

---

## الورش المعتمدة (Certified Workshops)

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/workshops` | قائمة الورش المعتمدة |
| GET | `/workshops/:id` | تفاصيل ورشة |
| GET | `/workshops/:id/services` | خدمات الورشة |
| POST | `/workshops/:id/reviews` | إضافة تقييم للورشة |
| GET | `/workshops/:id/reviews` | تقييمات الورشة |
| GET | `/workshops/:id/reviews/stats` | إحصائيات التقييمات |

---

## الحجوزات (Bookings)

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/bookings/my` | حجوزاتي |
| GET | `/bookings/:id` | تفاصيل حجز |
| POST | `/bookings` | إنشاء حجز (عناية شاملة / غسيل / ورشة معتمدة) |
| GET | `/bookings/:bookingId/chat/messages` | رسائل الشات |
| POST | `/bookings/:bookingId/chat/messages` | إرسال رسالة |
| GET | `/bookings/:bookingId/track` | تتبع الحجز |
| GET | `/bookings/:bookingId/location-history` | سجل الموقع |

---

## طلب السحب (السطحة) — Towing

| Method | Endpoint | وصف |
|--------|----------|-----|
| POST | `/bookings/towing/request` | إنشاء طلب سحب |
| GET | `/bookings/towing/:broadcastId/offers` | عروض الطلب |
| POST | `/bookings/towing/:broadcastId/offers/:offerId/accept` | قبول عرض |

---

## غسيل السيارات (Car Wash) — بالبث

| Method | Endpoint | وصف |
|--------|----------|-----|
| POST | `/bookings/carwash/request` | طلب غسيل |
| GET | `/bookings/carwash/:broadcastId/offers` | عروض الطلب |
| POST | `/bookings/carwash/:broadcastId/offers/:offerId/accept` | قبول عرض |

---

## الورش المتنقلة (Mobile Workshop)

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/mobile-workshops` | قائمة الورش المتنقلة |
| GET | `/mobile-workshops/:id` | تفاصيل ورشة متنقلة |
| POST | `/mobile-workshop-requests` | إنشاء طلب ورشة متنقلة |
| GET | `/mobile-workshop-requests` | طلباتي (الورش المتنقلة) |
| GET | `/mobile-workshop-requests/:id` | تفاصيل طلب + العروض |
| POST | `/mobile-workshop-requests/:requestId/select-offer` | اختيار عرض (ينشئ الحجز والفاتورة) |

---

## خدمة الصيانة المتنقلة (Mobile Car Service)

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/mobile-car-service` | الخدمة الأم |
| GET | `/mobile-car-service/sub-services` | الخدمات الفرعية |
| GET | `/mobile-car-service/compatible-parts` | قطع الغيار المتوافقة |
| GET | `/mobile-car-service/recommended-parts` | قطع الغيار الموصى بها |
| POST | `/mobile-car-service/bookings` | إنشاء حجز (عميل) |
| GET | `/mobile-car-service/bookings/:id` | تفاصيل حجز |

---

## الوينشات (استعراض فقط)

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/winches` | قائمة السطحات |
| GET | `/winches/:id` | تفاصيل سطحه |

---

## الفواتير والدفع

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/invoices/my/:id` | فاتورتي |
| PATCH | `/invoices/my/:id/pay` | دفع الفاتورة (CARD / WALLET) |
| GET | `/payments` | قائمة مدفوعاتي |
| GET | `/payments/:id` | تفاصيل دفعة |
| GET | `/wallets` | محفظتي |

---

## سوق قطع الغيار (Marketplace)

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/vendors/:id` | تفاصيل مورد |
| GET | `/vendors/:id/stats` | إحصائيات المورد |
| GET | `/vendors/:id/reviews` | تقييمات المورد |
| POST | `/vendors/:id/reviews` | إضافة تقييم للمورد |
| GET | `/auto-part-categories` | فئات قطع الغيار |
| GET | `/auto-part-categories/tree` | شجرة الفئات |
| GET | `/auto-part-categories/:id` | فئة حسب المعرّف |
| GET | `/auto-parts` | قائمة قطع الغيار |
| GET | `/auto-parts/vendor/:vendorId` | قطع غيار مورد |
| GET | `/auto-parts/vehicle/:vehicleModelId` | قطع غيار لموديل مركبة |
| GET | `/auto-parts/:id` | تفاصيل قطعة غيار |
| GET | `/cart` | سلتي |
| POST | `/cart/items` | إضافة صنف للسلة |
| PATCH | `/cart/items/:id` | تحديث صنف |
| DELETE | `/cart/items/:id` | حذف صنف |
| POST | `/cart/checkout` | إتمام الطلب |
| POST | `/marketplace-orders` | إنشاء طلب متجر |
| GET | `/marketplace-orders/my-orders` | طلباتي من المتجر |
| GET | `/marketplace-orders/:id` | تفاصيل طلب |

---

## الإشعارات والتقييم والملاحظات

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/notifications` | إشعاراتي |
| PATCH | `/notifications/read-all` | تعليم الكل كمقروءة |
| GET | `/notifications/:id` | تفاصيل إشعار |
| PATCH | `/notifications/:id/read` | تعليم كمقروء |
| POST | `/feedback` | إرسال ملاحظة/شكوى |
| GET | `/feedback/my` | ملاحظاتي |
| GET | `/feedback/:id` | تفاصيل ملاحظة |
| POST | `/feedback/:id/reply` | الرد على ملاحظة |

---

## النشاط (Activity)

| Method | Endpoint | وصف |
|--------|----------|-----|
| GET | `/activity` | سجلات النشاط (حسب الصلاحيات) |
| POST | `/activity` | تسجيل حدث نشاط |

---

تم استبعاد: مسارات الأدمن (`/admin/*`)، مسارات الفيندور (مثل `/winches/my/*`, `/mobile-workshops/my/requests`, `/bookings/:id/complete`)، ومسارات الفني (`/technician/*`).
