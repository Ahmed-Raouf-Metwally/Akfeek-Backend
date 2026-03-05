# Endpoints: فلوه الورش المعتمدة (Certified Workshops) للتيست

الترتيب الكامل من تسجيل الدخول → عرض الورش → الحجز عند ورشة → عرض حجوزاتي.

**Base URL:** `http://localhost:3000/api`

---

## 1) تسجيل الدخول

| Method | Endpoint | الوصف |
|--------|----------|--------|
| POST | `/auth/login` | تسجيل دخول – ترجع `token` للاستخدام في الهيدر |

**Body:**
```json
{
  "identifier": "your@email.com",
  "password": "YourPassword"
}
```

**الهيدر لكل الطلبات التالية:**
```
Authorization: Bearer <token>
```

---

## 2) بيانات مطلوبة قبل الحجز (مركبة + خدمات)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/vehicles` | مركباتي (لاختيار vehicleId في الحجز) |
| GET | `/services` | قائمة الخدمات (لاختيار serviceIds في الحجز) |

**ملاحظة:** لو ما عندك مركبة، أضف واحدة أولاً: POST `/vehicles` مع (vehicleModelId, plateNumber, ...).

---

## 3) عرض الورش المعتمدة

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/workshops` | قائمة الورش النشطة والمعتمدة |
| GET | `/workshops/{id}` | تفاصيل ورشة واحدة |

**أمثلة Query لـ GET /workshops:**
- `?city=الرياض`
- `?search=السلام`
- `?isActive=true&isVerified=true`

---

## 4) إنشاء حجز عند ورشة معتمدة

| Method | Endpoint | الوصف |
|--------|----------|--------|
| POST | `/bookings` | إنشاء حجز (مع أو بدون workshopId) |

**Body عند الحجز عند ورشة:**
```json
{
  "vehicleId": "uuid-المركبة",
  "scheduledDate": "2025-02-20",
  "scheduledTime": "10:00",
  "serviceIds": ["uuid-خدمة-1", "uuid-خدمة-2"],
  "workshopId": "uuid-الورشة",
  "deliveryMethod": "SELF_DELIVERY",
  "notes": "ملاحظة اختيارية"
}
```

- **workshopId** – اختياري؛ لو حاطه يكون الحجز عند هذه الورشة.
- **deliveryMethod** – مطلوب لو حاطت workshopId:
  - `SELF_DELIVERY` – إيصال ذاتي
  - `FLATBED` – سحب (يضاف رسم flatbed)
- **serviceIds** – مصفوفة IDs الخدمات (خدمة واحدة على الأقل مطلوبة).

---

## 5) بعد الحجز: عرض الحجوزات

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/bookings/my` | حجوزاتي (مع pagination) |
| GET | `/bookings/{id}` | تفاصيل حجز واحد |

**Query لـ my:** `?page=1&limit=10&status=PENDING`

---

## 6) التقييمات (اختياري)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/workshops/{id}/reviews` | تقييمات الورشة |
| GET | `/workshops/{id}/reviews/stats` | إحصائيات التقييم |
| POST | `/workshops/{id}/reviews` | إضافة تقييم (بعد الحجز) |

---

## فلوه الفيندور (صاحب الورشة)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| POST | `/workshops/profile/me` | **إضافة ورشتي** (الفيندور يضيف ورشته بنفسه؛ الورشة تُنشأ غير معتمدة حتى يتحقق منها الأدمن) |
| GET | `/workshops/profile/me` | بيانات ورشتي (يحتاج دور VENDOR + CERTIFIED_WORKSHOP) |
| PUT | `/workshops/profile/me` | تحديث بيانات ورشتي |
| GET | `/workshops/profile/me/bookings` | حجوزات ورشتي |

---

## ملخص ترتيب التيست (عميل)

1. **دخول:** POST `/auth/login` → استخدم الـ token.
2. **تحضير:** GET `/vehicles`، GET `/services` (وتسجيل مركبة لو محتاج).
3. **الورش:** GET `/workshops` → GET `/workshops/{id}`.
4. **الحجز:** POST `/bookings` مع `vehicleId`, `scheduledDate`, `scheduledTime`, `serviceIds`, `workshopId`, `deliveryMethod`.
5. **المتابعة:** GET `/bookings/my`، GET `/bookings/{id}`.
6. **اختياري:** GET `/workshops/{id}/reviews`، POST `/workshops/{id}/reviews`.

كل المسارات أعلاه تحت `/api` (مثلاً: `POST /api/auth/login`, `GET /api/workshops`, `POST /api/bookings`).
