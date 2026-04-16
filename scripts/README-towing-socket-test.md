# اختبار سوكت الونش بعد الدفع (Towing Socket After Payment)

## الهدف

هذا الاختبار يثبت إن العميل بعد الدفع:

- يقدر يستدعي endpoint: `GET /api/bookings/towing/booking/:bookingId/socket-access`
- يقدر يفتح السوكت ويستلم **الموقع الحالي** من خلال:
  - `booking:current_location`
  - (وأيضًا) `winch:location_update` / `technician:location_update`
- يقدر يطلب آخر موقع محفوظ يدويًا:
  - `booking:get_current_location`

## المتطلبات

- السيرفر شغال: `npm run dev`
- البيانات متسيدة (Seed) وفيها:
  - عميل + مركبة
  - فيندور ونش + ونش بموقع قريب من الرياض
  - أدمن

> ملاحظة مهمة: `npm run dev` يشغّل seed الإدمن فقط (`prisma/seed-admin-only.js`).
> للفلو كامل (عميل + فيندور ونش + ونش) شغّل demo seed مرة:
>
> ```bash
> npm run prisma:seed:demo
> ```

## التثبيت (مرة واحدة)

تم إضافة dependency: `socket.io-client` في `package.json`.

نفّذ:

```bash
npm install
```

## تشغيل الاختبار

```bash
npm run test:towing-socket
```

أو:

```bash
API_BASE_URL=http://localhost:3000 node scripts/test-towing-socket-after-payment.js
```

## متغيرات البيئة (اختياري)

- `API_BASE_URL` أو `TEST_API_URL`
- `TEST_CUSTOMER_EMAIL`, `TEST_CUSTOMER_PASSWORD` (افتراضي: user1@akfeek.com / password123)
- `TEST_WINCH_VENDOR_EMAIL`, `TEST_WINCH_VENDOR_PASSWORD` (افتراضي: vendor2@akfeek.com / password123)
- `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD` (افتراضي: admin@akfeek.com / admin123)

