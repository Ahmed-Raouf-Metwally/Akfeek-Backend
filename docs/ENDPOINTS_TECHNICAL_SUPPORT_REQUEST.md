# طلب دعم فني (Technical Support Request)

المستخدم يقدم طلب دعم فني يتضمن بيانات السيارة والحادث؛ الأدمن يعين الفني الذي سيراجع العميل.

---

## الحقول في الطلب (من المستخدم)

| الحقل | مطلوب | الوصف |
|--------|--------|--------|
| vehicleSerialNumber | نعم | الرقم التسلسلي للسيارة (VIN / رقم الهيكل) |
| plateNumber | نعم | رقم لوحة السيارة |
| hasInsurance | لا (افتراضي false) | هل يوجد تأمين على السيارة |
| insuranceCompany | لا | اسم شركة التأمين (يُفضّل إدخاله إذا hasInsurance = true) |
| deliveryAddress | نعم | عنوان التسليم |
| repairAuthUrl | لا | رابط إذن إصلاح (اختياري) |
| najmDocUrl | لا | رابط وثيقة نجم (اختياري) |
| trafficReportUrl | لا | رابط تقرير مرور (اختياري) |
| accidentDamages | نعم | وصف أضرار الحادث |
| carImageUrls | لا | مصفوفة روابط صور السيارة (اختياري) |
| notes | لا | ملاحظات إضافية |

---

## Endpoints

**Base:** `/api/technical-support-requests`  
كل المسارات تحتاج مصادقة: `Authorization: Bearer <token>`.

### عميل (Customer)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| POST | `/` | تقديم طلب دعم فني جديد |
| GET | `/my` | طلباتي (query: page, limit, status) |
| GET | `/:id` | تفاصيل طلب (للمالك فقط) |

### أدمن (Admin)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/admin/list` | قائمة كل الطلبات (query: page, limit, status) |
| GET | `/:id` | تفاصيل أي طلب |
| POST | `/admin/:id/assign` | تعيين فني للطلب. Body: `{ "technicianId": "uuid" }` |
| PATCH | `/admin/:id/status` | تحديث حالة الطلب. Body: `{ "status": "ASSIGNED" \| "IN_PROGRESS" \| "COMPLETED" \| "CANCELLED", "notes": "..." }` |

### حالات الطلب (status)

- `PENDING` — مقدم، بانتظار تعيين فني
- `ASSIGNED` — تم تعيين فني
- `IN_PROGRESS` — الفني في الطريق / جاري التنفيذ
- `COMPLETED` — مكتمل
- `CANCELLED` — ملغي

---

## مثال Body لإنشاء طلب (POST /api/technical-support-requests)

```json
{
  "vehicleSerialNumber": "WBADT43452G123456",
  "plateNumber": "أ ب س 1234",
  "hasInsurance": true,
  "insuranceCompany": "شركة التأمين الأهلية",
  "deliveryAddress": "الرياض، حي النخيل، شارع الملك فهد",
  "repairAuthUrl": "https://example.com/docs/repair-auth.pdf",
  "najmDocUrl": "https://example.com/docs/najm.pdf",
  "trafficReportUrl": null,
  "accidentDamages": "ضرر في الواجهة الأمامية والجناح الأيمن",
  "carImageUrls": [
    "https://example.com/photos/car1.jpg",
    "https://example.com/photos/car2.jpg"
  ],
  "notes": ""
}
```

---

## تسلسل التدفق (Flow)

1. العميل: **POST** `/api/technical-support-requests` مع البيانات أعلاه.
2. الأدمن: **GET** `/api/technical-support-requests/admin/list` لعرض الطلبات (مثلاً status=PENDING).
3. الأدمن: **POST** `/api/technical-support-requests/admin/:id/assign` مع `{ "technicianId": "uuid-الفني" }`. (الفني من المستخدمين بدور TECHNICIAN.)
4. العميل/الأدمن: **GET** `/api/technical-support-requests/:id` لمتابعة تفاصيل الطلب والفني المعيّن.
5. الأدمن (اختياري): **PATCH** `/api/technical-support-requests/admin/:id/status` لتحديث الحالة (مثلاً COMPLETED).
