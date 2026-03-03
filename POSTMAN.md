# اختبار الـ API بـ Postman / API Testing with Postman

## استيراد المواصفات (Import)

1. **مع تشغيل السيرفر:**  
   في Postman: **File → Import → Link**  
   الرابط: `http://localhost:3000/api-docs.json`

2. **بدون تشغيل السيرفر:**  
   من جذر المشروع شغّل:
   ```bash
   npm run openapi
   ```
   ثم **File → Import → File** واختر الملف `openapi.json` من مجلد المشروع.

## المصادقة (Authentication)

1. استدعِ **POST** `http://localhost:3000/api/auth/login`  
   Body (JSON):
   ```json
   {
     "identifier": "admin@example.com",
     "password": "كلمة_المرور"
   }
   ```
2. من الـ Response انسخ قيمة `data.token`.
3. في الـ Collection أو الطلب: **Authorization** → Type: **Bearer Token** → الصق الـ token.

## السيرفر (Base URL)

- تطوير: `http://localhost:3000`
- الـ paths تبدأ بـ `/api` (مثل `/api/bookings`, `/api/invoices`, `/api/auth/login`).

## وثائق تفاعلية (Swagger UI)

مع تشغيل السيرفر:  
**http://localhost:3000/api-docs**
