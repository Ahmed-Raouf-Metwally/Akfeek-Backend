# Endpoints: اختبار الخدمات والحجز من Postman

الترتيب الكامل من تسجيل الدخول → عرض الخدمات → الحجز → عرض حجوزاتي.

**Base URL:** `http://localhost:3000/api` (أو السيرفر الذي تستخدمه)

---

## 1) تسجيل الدخول

| Method | Endpoint | الوصف |
|--------|----------|--------|
| POST | `/auth/login` | تسجيل دخول – ترجع `token` |

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "identifier": "your@email.com",
  "password": "YourPassword"
}
```

**من الرد انسخ:** `data.token`

**في كل الطلبات التالية أضف هيدر:**
```
Authorization: Bearer <الـ token>
```

---

## 2) الخدمات (لاختيار خدمة للحجز)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/services` | قائمة كل الخدمات |
| GET | `/services/{id}` | تفاصيل خدمة واحدة |
| GET | `/services/{id}/available-slots?date=YYYY-MM-DD` | أوقات متاحة للخدمة في يوم معين (اختياري) |

**أمثلة Query لـ GET /services:**
- `?category=MAINTENANCE`
- `?type=CATALOG`
- `?search=oil`

**ملاحظة:** كل مسارات الخدمات والحجز تحتاج توكن (مصادقة).

---

## 3) المركبات (مطلوبة للحجز)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/vehicles` | مركباتي |
| POST | `/vehicles` | إضافة مركبة (لو ما عندك مركبة) |

**لو تحتاج تضيف مركبة – لازم تأخذ `vehicleModelId` من الـ API (ليس النص "string"):**
1. GET `/api/vehicles/brands` → من الرد خذ `id` لأي ماركة (مثلاً Toyota).
2. GET `/api/vehicles/brands/{brandId}/models` → ضع `brandId` من الخطوة 1، من الرد خذ `id` لأي موديل (هذا هو **vehicleModelId**).

**Body – POST /api/vehicles (إضافة مركبة):**
```json
{
  "vehicleModelId": "<نسخ-id-الموديل-من-الخطوة-2>",
  "plateLettersAr": "ع س س",
  "plateLettersEn": "SEJ",
  "plateDigits": "7415",
  "plateRegion": "K",
  "plateNumber": "ع س س 7415",
  "color": "White",
  "isDefault": false
}
```
أو بشكل مختصر (الحد الأدنى: `vehicleModelId` + لوحة إما `plateNumber` أو `plateDigits` مع حروف):
```json
{
  "vehicleModelId": "<uuid-الموديل-من-GET-models>",
  "plateNumber": "ع س س 7415",
  "color": "White"
}
```

**إذا ظهر "Invalid vehicle model ID":** تأكد أن `vehicleModelId` قيمة **UUID حقيقية** من استدعاء `GET /api/vehicles/brands` ثم `GET /api/vehicles/brands/:brandId/models` وليس الكلمة `"string"` أو أي placeholder.

من الرد أو من GET `/api/vehicles` خذ **`id` المركبة** (vehicleId) لاستخدامها في الحجز.

---

## 4) إنشاء حجز (الحجز على خدمة)

**Endpoint:** `POST /api/bookings`  
**Headers:** `Authorization: Bearer <token>` و `Content-Type: application/json`

---

### JSON للحجز (انسخ واستبدل القيم)

**لا ترسل:** `customerId` (يُؤخذ من التوكن)، `products`، أو نصوص وهمية مثل `"string"` أو `"uuid-الورشة"`.

---

#### أ) حجز بدون ورشة (الأغلب – انسخ هذا كما هو وغيّر فقط vehicleId وتاريخك)

استبدل `vehicleId` بـ **id مركبة** من `GET /api/vehicles`. والباقي يمكنك تركه أو تعديل التاريخ والوقت.

```json
{
  "vehicleId": "d908561d-488b-4bb0-8222-4ab08329ebdd",
  "scheduledDate": "2026-03-20",
  "scheduledTime": "10:00",
  "serviceIds": ["d899a4dc-1692-4c28-b5bb-e5eb974db50a"],
  "notes": ""
}
```

---

#### ب) حجز عند ورشة معتمدة

خذ **workshopId** من `GET /api/workshops` (نسخ الـ `id` من أي ورشة في الرد). لا تستخدم النص `"uuid-الورشة"`.

```json
{
  "vehicleId": "d908561d-488b-4bb0-8222-4ab08329ebdd",
  "scheduledDate": "2026-03-20",
  "scheduledTime": "10:00",
  "serviceIds": ["d899a4dc-1692-4c28-b5bb-e5eb974db50a"],
  "workshopId": "<ضع-هنا-id-الورشة-من-GET-/api/workshops>",
  "deliveryMethod": "SELF_DELIVERY",
  "notes": ""
}
```
`deliveryMethod`: `SELF_DELIVERY` أو `FLATBED`.

---

### الحقول (مرجع سريع)

| الحقل | مطلوب؟ | من أين |
|--------|--------|--------|
| vehicleId | نعم | GET `/api/vehicles` |
| scheduledDate | نعم | تاريخ مثل `2026-03-20` |
| serviceIds | نعم | مصفوفة، من GET `/api/services` (مثلاً `["d899a4dc-..."]`) |
| scheduledTime | لا | مثل `10:00` |
| notes | لا | نص حر |
| workshopId | لا | فقط لو حاب تحجز عند ورشة – من GET `/api/workshops` |
| deliveryMethod | نعم إذا أرسلت workshopId | `SELF_DELIVERY` أو `FLATBED` |

**إذا ظهر "Workshop not found" أو "workshopId must be a real UUID":** إما احذف `workshopId` و `deliveryMethod` واستخدم JSON (أ)، أو ضع **id ورشة حقيقي** من `GET /api/workshops`.

---

## 5) بعد الحجز: عرض الحجوزات

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/bookings/my` | حجوزاتي |
| GET | `/bookings/{id}` | تفاصيل حجز واحد |

**Query لـ my:** `?page=1&limit=10&status=PENDING`

---

## ترتيب الاختبار من Postman (Services → Booking)

1. **POST** `/api/auth/login`  
   Body: `{ "identifier": "email@example.com", "password": "***" }`  
   → انسخ `data.token`

2. **تعيين التوكن:** في Postman: Tab Authorization → Type: Bearer Token → الصق التوكن (أو أضف هيدر `Authorization: Bearer <token>` يدوياً في كل طلب).

3. **GET** `/api/services`  
   → خذ `id` لخدمة أو أكثر (مثلاً أول عنصر في `data`).

4. **GET** `/api/vehicles`  
   → لو فاضي: **GET** `/api/vehicles/brands` ثم **GET** `/api/vehicles/brands/{brandId}/models` ثم **POST** `/api/vehicles` بجسم إضافة مركبة.  
   → خذ `id` مركبة (vehicleId).

5. **POST** `/api/bookings`  
   Body:
   ```json
   {
     "vehicleId": "<من الخطوة 4>",
     "scheduledDate": "2025-03-20",
     "scheduledTime": "09:00",
     "serviceIds": ["<من الخطوة 3>"]
   }
   ```

6. **GET** `/api/bookings/my`  
   → تتأكد أن الحجز ظهر في القائمة.

كل المسارات أعلاه تحت `/api` (مثلاً: `POST /api/auth/login`, `GET /api/services`, `POST /api/bookings`).
