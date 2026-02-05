# Mobile Car Service (خدمة الزرَش / الصيانة المتنقلة)

Backend feature: parent service with sub-services, car compatibility, spare parts, vendors, and tracking. Implemented in an **extensible and backward-compatible** way; existing logic, APIs, and database relations are unchanged.

---

## 1. Database Schema

### New / Updated in `prisma/schema.prisma`

- **ServiceType enum**: Added `MOBILE_CAR_SERVICE`.
- **Service model**:
  - `parentServiceId` (optional) – parent for sub-services.
  - `parentService` / `subServices` – self-relation for parent/sub.
  - `customAttributes` (Json, optional) – per sub-service attributes.
  - `autoPartServices` – relation to spare parts.
- **BookingStatus enum**: Added `TECHNICIAN_EN_ROUTE`, `ON_THE_WAY`, `ARRIVED`, `IN_SERVICE` (tracking).
- **AutoPartService** (new): Many-to-many AutoPart ↔ Service; `isRecommended`, `sortOrder`.
- **AutoPartVendor** (new): AutoPart ↔ VendorProfile with `unitPrice`, `stockQuantity`, `isAvailable`, `leadTimeDays`.
- **BookingAutoPart** (new): Booking ↔ AutoPart (and optional Vendor) with `quantity`, `unitPrice`, `totalPrice`.
- **Booking**: New relation `bookingAutoParts`.
- **AutoPart**: New relations `autoPartServices`, `autoPartVendors`, `bookingAutoParts`.
- **VendorProfile**: New relations `autoPartVendors`, `bookingAutoParts`.

### Migration

With DB running:

```bash
npx prisma migrate dev --name add_mobile_car_service
```

Or only generate SQL (no apply):

```bash
npx prisma migrate dev --name add_mobile_car_service --create-only
```

---

## 2. API Endpoints

Base path: **`/api/mobile-car-service`**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | - | Parent Mobile Car Service + sub-services |
| GET | `/sub-services?parentId=` | - | Sub-services (optional parentId) |
| GET | `/compatible-parts?serviceId=&vehicleModelId=` | - | Spare parts for service + car |
| GET | `/recommended-parts?serviceId=&vehicleModelId=` | - | Recommended parts for service (optional car) |
| POST | `/bookings` | CUSTOMER | Create booking (subServiceId, vehicleId, spareParts?, location) |
| GET | `/bookings/:id` | User/Admin | Get booking (customer: own only; admin: any) |
| PATCH | `/bookings/:id/status` | TECHNICIAN, ADMIN | Update status (Assigned, On the way, Arrived, In service, Completed) |
| POST | `/admin/parts/:autoPartId/services` | ADMIN | Link part to (sub-)service |
| POST | `/admin/parts/:autoPartId/vendors` | ADMIN | Add/update vendor supply (unitPrice, stock, etc.) |

### Create booking body (POST `/bookings`)

```json
{
  "subServiceId": "uuid",
  "vehicleId": "uuid",
  "location": { "latitude": 24.71, "longitude": 46.67, "address": "optional" },
  "spareParts": [
    { "autoPartId": "uuid", "quantity": 1, "vendorId": "optional" }
  ],
  "scheduledDate": "optional ISO date",
  "scheduledTime": "optional",
  "notes": "optional"
}
```

### Status flow (tracking)

- `PENDING` → `CONFIRMED` → `TECHNICIAN_ASSIGNED` (Assigned) → `ON_THE_WAY` / `TECHNICIAN_EN_ROUTE` (On the way) → `ARRIVED` → `IN_SERVICE` / `IN_PROGRESS` → `COMPLETED`

Existing tracking (`/api/bookings/:bookingId/track`, technician location) works for `ON_THE_WAY` and `TECHNICIAN_EN_ROUTE` (ETA to pickup).

---

## 3. Backend Files

- **Service**: `src/services/mobileCarService.service.js` – parent/sub-services, compatible parts, booking create, status update, part–service and part–vendor links.
- **Controller**: `src/api/controllers/mobileCarService.controller.js`.
- **Routes**: `src/api/routes/mobileCarService.routes.js` (mounted at `/api/mobile-car-service` in `src/api/routes/index.js`).
- **Tracking**: `src/services/tracking.service.js` – ETA logic extended to treat `ON_THE_WAY` like `TECHNICIAN_EN_ROUTE` (target = pickup).

---

## 4. Car & Spare Parts

- **Car**: Uses existing **VehicleBrand**, **VehicleModel** (with year), **UserVehicle**. No new car tables.
- **Compatible parts**: Filter by `AutoPartService.serviceId` and `AutoPartCompatibility.vehicleModelId` (brand/model/year).
- **Vendors**: **AutoPartVendor** links parts to one or more vendors with price and availability; existing **VendorProfile** and marketplace logic are unchanged.

---

## 5. Seed (optional)

1. Create one **Service** with `type: MOBILE_CAR_SERVICE`, `parentServiceId: null` (e.g. name: "Mobile Car Service", nameAr: "خدمة الزرَش / الصيانة المتنقلة").
2. Create **Service** records with `type: MOBILE_CAR_SERVICE`, `parentServiceId: <parent id>` for sub-services (Oil Change, Periodic Maintenance, etc.).
3. Use admin endpoints to link parts to services and set vendor supplies.

---

## 6. What Was Not Changed

- Authentication, payments, or existing service/booking/vendor core logic.
- Existing booking list/detail under `/api/bookings` (mobile-car bookings are also visible there; full spare-parts detail is in GET `/api/mobile-car-service/bookings/:id`).
- Existing tracking and delivery modules; only status values and ETA target for `ON_THE_WAY` were extended.
