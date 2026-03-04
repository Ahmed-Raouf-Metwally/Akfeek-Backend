# endpoints حجز الخدمات — للاختبار في Postman

الـ Base URL (عدّل حسب بيئتك):  
`http://localhost:3000/api` أو `{{baseUrl}}/api`

---

## 1. الورش المعتمدة (Certified Workshop)

**إنشاء حجز:** `POST /api/bookings`

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| POST   | `/api/bookings` | إنشاء حجز ورشة معتمدة (مع أو بدون ونش) |

**Headers:**  
`Authorization: Bearer <token>`  
`Content-Type: application/json`

**Body (JSON) — مثال:**
```json
{
  "vehicleId": "uuid-المركبة",
  "scheduledDate": "2026-03-15T00:00:00.000Z",
  "scheduledTime": "10:00",
  "workshopId": "uuid-الورشة-المعتمدة",
  "deliveryMethod": "SELF_DELIVERY",
  "serviceIds": ["uuid-خدمة-1", "uuid-خدمة-2"],
  "notes": "ملاحظات اختيارية"
}
```

- `workshopId`: معرف الورشة المعتمدة (مطلوب للورش المعتمدة).
- `deliveryMethod`: `"SELF_DELIVERY"` أو `"FLATBED"` (مطلوب عند وجود `workshopId`).
- `serviceIds`: مصفوفة معرفات الخدمات التابعة للورشة.

---

## 2. ورش الغسيل (Car Wash)

**إنشاء طلب بث ثم قبول عرض:**  
طلب الغسيل يعمل بنموذج «بث»: إنشاء طلب → استلام عروض → قبول عرض.

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| POST   | `/api/bookings/carwash/request` | إنشاء طلب غسيل وبثه للفنيين |
| GET    | `/api/bookings/carwash/:broadcastId/offers` | جلب عروض الفنيين |
| POST   | `/api/bookings/carwash/:broadcastId/offers/:offerId/accept` | قبول عرض فني |

**1) إنشاء الطلب — POST `/api/bookings/carwash/request`**

**Body (JSON):**
```json
{
  "vehicleId": "uuid-المركبة",
  "location": {
    "latitude": 24.7136,
    "longitude": 46.6753,
    "address": "الرياض، حي العليا"
  },
  "serviceType": "FULL",
  "notes": "غسيل كامل",
  "estimatedBudget": 150
}
```

- `serviceType`: `"INTERNAL"` | `"EXTERNAL"` | `"FULL"`

**2) جلب العروض — GET**  
`/api/bookings/carwash/{{broadcastId}}/offers`

**3) قبول عرض — POST**  
`/api/bookings/carwash/{{broadcastId}}/offers/{{offerId}}/accept`

---

## 3. العناية الشاملة (Comprehensive Care)

**إنشاء حجز:** نفس اند بوينت الورش المعتمدة لكن **بدون** `workshopId` وبدون `deliveryMethod`.

**إنشاء حجز:** `POST /api/bookings`

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| POST   | `/api/bookings` | إنشاء حجز عناية شاملة (خدمات الفيندور فقط) |

**Body (JSON) — مثال:**
```json
{
  "vehicleId": "uuid-المركبة",
  "scheduledDate": "2026-03-15T00:00:00.000Z",
  "scheduledTime": "14:00",
  "serviceIds": ["uuid-خدمة-عناية-1", "uuid-خدمة-عناية-2"],
  "addressId": "uuid-العنوان-اختياري",
  "notes": "ملاحظات"
}
```

- لا تُرسل `workshopId` ولا `deliveryMethod`.
- `serviceIds`: خدمات تابعة لفيندور عناية شاملة.

---

## 4. الوينشات / السحب (Winch / Towing)

نموذج «بث» مثل الغسيل: إنشاء طلب سحب → عروض → قبول عرض.

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| POST   | `/api/bookings/towing/request` | إنشاء طلب سحب (ونش) |
| GET    | `/api/bookings/towing/:broadcastId/offers` | جلب عروض الوينشات |
| POST   | `/api/bookings/towing/:broadcastId/offers/:offerId/accept` | قبول عرض ونش |

**1) إنشاء طلب السحب — POST `/api/bookings/towing/request`**

**Body (JSON):**
```json
{
  "vehicleId": "uuid-المركبة",
  "pickupLocation": {
    "latitude": 24.7136,
    "longitude": 46.6753,
    "address": "طريق الملك فهد، الرياض"
  },
  "destinationLocation": {
    "latitude": 24.7500,
    "longitude": 46.7000,
    "address": "الورشة، الرياض"
  },
  "vehicleCondition": "NOT_STARTING",
  "urgency": "HIGH",
  "notes": "السيارة لا تشتغل",
  "estimatedBudget": 200
}
```

- `vehicleCondition`: `NOT_STARTING` | `ACCIDENT` | `FLAT_TIRE` | `ENGINE_FAILURE` | `OTHER`
- `urgency`: `NORMAL` | `HIGH`

**2) جلب العروض — GET**  
`/api/bookings/towing/{{broadcastId}}/offers`

**3) قبول عرض — POST**  
`/api/bookings/towing/{{broadcastId}}/offers/{{offerId}}/accept`

---

## 5. الورش المتنقلة (Mobile Workshop)

**إنشاء حجز:** اند بوينت مخصص للصيانة المتنقلة.

| الطريقة | المسار | الوصف |
|--------|--------|--------|
| POST   | `/api/mobile-car-service/bookings` | إنشاء حجز ورشة متنقلة |
| GET    | `/api/mobile-car-service/bookings/:id` | جلب حجز بالمعرف |
| PATCH  | `/api/mobile-car-service/bookings/:id/status` | تحديث حالة الحجز (فني/أدمن) |

**إنشاء حجز — POST `/api/mobile-car-service/bookings`**

**Body (JSON):**
```json
{
  "subServiceId": "uuid-الخدمة-الفرعية",
  "vehicleId": "uuid-المركبة",
  "location": {
    "latitude": 24.7136,
    "longitude": 46.6753,
    "address": "عنوان الموقع"
  },
  "scheduledDate": "2026-03-15",
  "scheduledTime": "10:00",
  "spareParts": [],
  "notes": "ملاحظات"
}
```

- للحصول على الخدمات الفرعية: `GET /api/mobile-car-service/sub-services`
- `spareParts`: مصفوفة اختيارية لقطع الغيار المطلوبة.

---

## ملخص سريع للـ Postman

| النوع             | اند بوينت الحجز الرئيسي                          |
|------------------|--------------------------------------------------|
| الورش المعتمدة   | `POST /api/bookings` (مع `workshopId` + `deliveryMethod`) |
| ورش الغسيل       | `POST /api/bookings/carwash/request`             |
| العناية الشاملة  | `POST /api/bookings` (بدون workshopId)           |
| الوينشات         | `POST /api/bookings/towing/request`              |
| الورش المتنقلة   | `POST /api/mobile-car-service/bookings`         |

**ملاحظة:** كل الطلبات تحتاج مصادقة:  
`Authorization: Bearer <access_token>`

للحصول على التوكن: تسجيل الدخول عبر `POST /api/auth/login` أو المسار المستخدم في مشروعك.
