# Mobile Car Service – ربط المتطلبات بالجداول والعلاقات

هذا الملف يربط كل بند في المتطلبات الأصلية بجداول قاعدة البيانات والعلاقات والـ Backend.

---

## 1️⃣ General Concept (المفهوم العام)

| المتطلب | الجدول/العلاقة | الوصف |
|--------|-----------------|--------|
| خدمة أم تحتوي على خدمات فرعية | **Service** | `type = MOBILE_CAR_SERVICE`, `parentServiceId = null` = الخدمة الأم |
| خدمات فرعية (تغيير زيت، صيانة دورية، إطارات، بطارية، كهرباء، ميكانيك) | **Service** | نفس الجدول مع `parentServiceId = id` الخدمة الأم |
| كل خدمة فرعية لها خصائص خاصة | **Service** | حقل `customAttributes Json?` (خصائص غير مشتركة) |
| تسعير خاص بكل خدمة فرعية | **ServicePricing** | علاقة `Service` ← `ServicePricing` (حسب نوع المركبة) |
| قطع غيار اختيارية حسب الخدمة | **AutoPartService** | ربط قطع الغيار بالخدمة الفرعية (واحد لكثير) |

**العلاقات في الـ Schema:**
- `Service.parentServiceId` → `Service.id` (الخدمة الأم)
- `Service.subServices` → قائمة الخدمات الفرعية
- `Service.autoPartServices` → قائمة ربط قطع الغيار بالخدمات (جدول **AutoPartService**)

---

## 2️⃣ Car & Vehicle Relations (السيارة والمركبة)

| المتطلب | الجدول/العلاقة | الوصف |
|--------|-----------------|--------|
| اختيار ماركة السيارة | **VehicleBrand** | جدول ماركات (Toyota, BMW, ...) – مستخدم في كل النظام |
| اختيار موديل السيارة | **VehicleModel** | جدول موديلات مرتبط بـ `brandId` – مستخدم في كل النظام |
| سنة السيارة (اختياري) | **VehicleModel** | حقل `year` في نفس الجدول – لا تكرار للسيارات |
| قطع غيار متوافقة مع السيارة فقط | **AutoPartCompatibility** | ربط **AutoPart** ↔ **VehicleModel** (ماركة + موديل + سنة ضمن الموديل) |
| تصفية القطع حسب ماركة + موديل + نوع الخدمة | **AutoPartService** + **AutoPartCompatibility** | القطعة يجب أن تكون مربوطة بالخدمة (AutoPartService) وبالموديل (AutoPartCompatibility) |

**العلاقات في الـ Schema:**
- `VehicleBrand` ← `VehicleModel` (brandId)
- `VehicleModel` يحتوي على: name, year, type, brandId
- `UserVehicle` → `VehicleModel` (مركبة المستخدم تشير لموديل واحد = ماركة + موديل + سنة)
- `AutoPartCompatibility`: partId ↔ vehicleModelId

**في الطلب (Order/Booking):**
- `Booking.vehicleId` → **UserVehicle** → **VehicleModel** → **VehicleBrand**  
  = تفاصيل السيارة (ماركة، موديل، سنة) مخزنة بدون تكرار.

---

## 3️⃣ Spare Parts Logic (منطق قطع الغيار)

| المتطلب | الجدول/العلاقة | الوصف |
|--------|-----------------|--------|
| قطع غيار مرتبطة بموديلات سيارات (واحد أو أكثر) | **AutoPartCompatibility** | partId ↔ vehicleModelId |
| قطع غيار مرتبطة بأنواع خدمات (واحد أو أكثر) | **AutoPartService** | partId ↔ serviceId (الخدمة الفرعية) |
| سعر وتوفر ومرجع مورد | **AutoPart** (price, stock) + **AutoPartVendor** | سعر وتوفر حسب المورد |
| اختيار تلقائي (موصى به) أو يدوي | **AutoPartService** | حقل `isRecommended Boolean` + قواعد في الـ Backend |

**العلاقات في الـ Schema:**
- **AutoPart** ← **AutoPartService** → **Service**
- **AutoPart** ← **AutoPartCompatibility** → **VehicleModel**
- **AutoPart** ← **AutoPartVendor** → **VendorProfile** (unitPrice, stockQuantity, isAvailable)

**الـ Backend:**
- `getCompatibleSpareParts(serviceId, vehicleModelId)`: قطع مرتبطة بالخدمة **و** بالموديل.
- `getRecommendedSpareParts(serviceId, vehicleModelId?)`: قطع موصى بها للخدمة (واختياريًا للموديل).

---

## 4️⃣ Vendor (Supplier) Relations (الموردون)

| المتطلب | الجدول/العلاقة | الوصف |
|--------|-----------------|--------|
| كل قطعة مرتبطة بواحد أو أكثر من الموردين | **AutoPartVendor** | partId ↔ vendorId |
| سعر وتوفر من المورد | **AutoPartVendor** | unitPrice, stockQuantity, isAvailable, leadTimeDays |
| الموردون لا يتأثرون بالمنطق القديم | **VendorProfile** | لا تغيير على الجدول الأصلي؛ الإضافة فقط في **AutoPartVendor** |

**العلاقات في الـ Schema:**
- **AutoPart** ← **AutoPartVendor** → **VendorProfile**
- **BookingAutoPart** يمكن أن تحمل `vendorId` (أي مورد تم الشراء منه)

---

## 5️⃣ Order Flow (تدفق الطلب)

| المتطلب | الجدول/العلاقة | الوصف |
|--------|-----------------|--------|
| المستخدم يختار: خدمة متنقلة، خدمة فرعية، نوع السيارة، قطع غيار (إن وجدت) | **Booking** + **BookingService** + **BookingAutoPart** + **UserVehicle** | الطلب يجمع كل ذلك |
| الطلب يحتوي: تفاصيل الخدمة، السيارة، القطع، موقع المستخدم | **Booking** | services (BookingService), vehicleId, bookingAutoParts, pickupLat/Lng, pickupAddress |

**العلاقات في الـ Schema:**
- **Booking** → **BookingService** (serviceId = الخدمة الفرعية)
- **Booking** → **UserVehicle** (vehicleId = السيارة → VehicleModel → VehicleBrand)
- **Booking** → **BookingAutoPart** (قطع الغيار + vendorId اختياري)
- **Booking**: pickupLat, pickupLng, pickupAddress = موقع المستخدم

**الـ Backend:**
- `createBooking(customerId, { subServiceId, vehicleId, spareParts[], location })` ينشئ الطلب ويربط الخدمة والمركبة والقطع والموقع.

---

## 6️⃣ Tracking System (التتبع)

| المتطلب | الجدول/العلاقة | الوصف |
|--------|-----------------|--------|
| حالات: Assigned, On the way, Arrived, In service, Completed | **BookingStatus** | TECHNICIAN_ASSIGNED, ON_THE_WAY, ARRIVED, IN_SERVICE, COMPLETED |
| تمديد بدون كسر التتبع الحالي | **BookingStatusHistory** + **TechnicianLocation** | نفس الجداول المستخدمة للتتبع الحالي |

**العلاقات في الـ Schema:**
- **Booking.status** = أحد قيم الـ enum
- **BookingStatusHistory**: سجل تغيير الحالة
- **TechnicianLocation**: موقع الفني مع `bookingId` اختياري

---

## ملخص الجداول والعلاقات

```
Service (parent)  ←── parentServiceId ── Service (sub-services)
     │                      │
     └── AutoPartService ───┴── AutoPart
                                    │
                                    ├── AutoPartCompatibility ── VehicleModel ── VehicleBrand
                                    ├── AutoPartVendor ── VendorProfile
                                    └── BookingAutoPart ── Booking
                                                              │
Booking ── BookingService (sub-service)                       │
     ├── UserVehicle ── VehicleModel ── VehicleBrand          │
     ├── bookingAutoParts (spare parts + optional vendorId)   │
     ├── status, statusHistory, technicianLocations           │
     └── pickupLat, pickupLng, pickupAddress                  │
```

---

## الـ APIs المرتبطة

| الـ API | الغرض | الجداول المستخدمة |
|---------|--------|-------------------|
| GET /api/mobile-car-service | الخدمة الأم + الخدمات الفرعية | Service (parent + subServices) |
| GET /api/mobile-car-service/sub-services | قائمة الخدمات الفرعية | Service |
| GET /api/mobile-car-service/compatible-parts?serviceId=&vehicleModelId= | قطع متوافقة مع الخدمة والسيارة | AutoPart, AutoPartService, AutoPartCompatibility, AutoPartVendor |
| GET /api/mobile-car-service/recommended-parts?serviceId=&vehicleModelId= | قطع موصى بها | AutoPart, AutoPartService, AutoPartCompatibility, AutoPartVendor |
| POST /api/mobile-car-service/bookings | إنشاء طلب (خدمة + سيارة + قطع + موقع) | Booking, BookingService, BookingAutoPart, UserVehicle, VehicleModel, VehicleBrand |
| PATCH /api/mobile-car-service/bookings/:id/status | تحديث حالة التتبع | Booking, BookingStatusHistory |
| POST /api/mobile-car-service/admin/parts/:autoPartId/services | ربط قطعة بخدمة | AutoPartService |
| POST /api/mobile-car-service/admin/parts/:autoPartId/vendors | ربط قطعة بمورد (سعر وتوفر) | AutoPartVendor |

**اختيار السيارة (ماركة + موديل + سنة):**
- GET /api/brands → VehicleBrand
- GET /api/models?brandId= → VehicleModel (كل موديل له year)
- vehicleModelId = الموديل المختار يُستخدم في compatible-parts والطريقة الحالية لإنشاء الطلب عبر vehicleId (UserVehicle → vehicleModelId).
