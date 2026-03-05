# التحقق من Endpoints — المستخدمون والموظفون

## Base URL
- التطوير: الطلبات من الفرونتند (Vite :5173) تُعكَس إلى الباكند عبر proxy → `http://localhost:3000/api`
- الباكند يربط الـ API تحت: `app.use('/api', routes)` → كل المسارات تبدأ بـ `/api`

---

## المستخدمون (Users)

| Method | Endpoint        | الوصف              | الحماية      |
|--------|-----------------|---------------------|-------------|
| GET    | /api/users     | قائمة المستخدمين (مع page, limit, role, status, search) | أدمن + JWT |
| POST   | /api/users     | إنشاء مستخدم (إضافة مستخدم) | أدمن + JWT |
| GET    | /api/users/:id | تفاصيل مستخدم       | أدمن + JWT |
| PUT    | /api/users/:id | تحديث مستخدم        | أدمن + JWT |
| PATCH  | /api/users/:id/status | تحديث الحالة   | أدمن + JWT |
| DELETE | /api/users/:id | حذف مستخدم          | أدمن + JWT |

### POST /api/users — إنشاء مستخدم
- **Body (JSON):** `email`, `password`, `role`, `firstName`, `lastName` مطلوبة. اختياري: `phone`, `preferredLanguage` (AR | EN).
- **الأدوار المسموحة:** CUSTOMER, TECHNICIAN, SUPPLIER, VENDOR, EMPLOYEE.
- **الاستجابة 201:** `{ success: true, message, messageAr, data: user }`

---

## الموظفون (Employees)

| Method | Endpoint | الوصف | الحماية |
|--------|----------|--------|---------|
| GET    | /api/admin/employees | قائمة الموظفين (page, limit, search) | أدمن + JWT |
| POST   | /api/admin/employees | إضافة موظف أكفيك | أدمن + JWT |
| GET    | /api/admin/employees/permission-keys | مفاتيح الصلاحيات | أدمن + JWT |
| GET    | /api/admin/employees/:id/permissions | صلاحيات موظف | أدمن + JWT |
| PUT    | /api/admin/employees/:id/permissions | تحديث صلاحيات موظف | أدمن + JWT |

---

## التوكن (Authorization)
- كل الطلبات المحمية تتطلب هيدر: `Authorization: Bearer <JWT>`
- الفرونتند يضيف التوكن من الـ store عند كل طلب عبر `getAuthToken()`.
