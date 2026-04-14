# Legacy / Optional Candidates (Draft)

Detected by keyword scan in summary/description/tags: legacy, old, deprecated, اختياري, قديم.

| Method | Path | Tags | Summary |
|---|---|---|---|
| POST | /api/akfeek-journey/{id}/documents | Akfeek Journey | رفع وثائق التأمين — multipart |
| GET | /api/bookings/carwash/{broadcastId}/offers | 2. ورش الغسيل (Car Wash) | (اختياري) عروض طلب الغسيل (فلو البث) |
| POST | /api/bookings/carwash/{broadcastId}/offers/{offerId}/accept | 2. ورش الغسيل (Car Wash) | Accept a car wash offer |
| POST | /api/bookings/carwash/request | 2. ورش الغسيل (Car Wash) | (اختياري) إنشاء طلب غسيل وبث للفنيين |
| PATCH | /api/invoices/{id}/mark-paid | Invoices, 4. Towing | Mark invoice as paid (Admin) — إيداع حصة الفيندور وخصم عمولة المنصة |
| POST | /api/mobile-workshop-requests | 5. الورش المتنقلة (Mobile Workshop) | إنشاء طلب ورشة متنقلة (عميل) — Create mobile workshop request |
| POST | /api/mobile-workshop-requests/{requestId}/select-offer | 5. الورش المتنقلة (Mobile Workshop) | اختيار عرض (عميل) — Select offer → creates booking & invoice |
| GET | /api/models | Vehicle Models | Get all vehicle models |
| POST | /api/technical-support-requests | 📱 Customer | Technical Support | Submit technical support request (طلب دعم فني) |
| POST | /api/technician/carwash/{broadcastId}/offers | Technician Car Wash | (اختياري/قديم) تقديم عرض لطلب غسيل |
| GET | /api/technician/carwash/broadcasts | Technician Car Wash | (اختياري/قديم) طلبات غسيل بالبث للفني |
| POST | /api/winches/my/broadcasts/{broadcastId}/offer | 4. Towing | 3. إرسال عرض — Submit winch offer (Winch vendor) |