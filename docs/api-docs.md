# API Docs — حجز الخدمات (تظهر تحت بعض)

هذه النقاط تظهر أيضاً في وصف التوثيق في صفحة **api-docs** (من `openapi.json`):

---

- **Bookings:** الورش المعتمدة + العناية الشاملة مع أمثلة. (`POST /api/bookings`)
- **Car Wash Service:** ورش الغسيل ومسار الطلب → العروض → القبول. (`POST /api/bookings/carwash/request` ثم GET عروض ثم POST قبول)
- **Towing Service:** الوينشات ومسار الطلب → العروض → القبول. (`POST /api/bookings/towing/request` ثم GET عروض ثم POST قبول)
- **Mobile Workshop:** الورش المتنقلة مع body كامل ومثال. (`POST /api/mobile-car-service/bookings`)

---

لتفاصيل كل اند بوينت وأمثلة الـ body راجع Swagger في: `http://localhost:3000/api-docs`
