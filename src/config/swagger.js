const swaggerJsdoc = require('swagger-jsdoc');

// ============================================================
// TAG DEFINITIONS — organized by audience
// ============================================================

const PUBLIC_TAGS = [
  { name: '🔓 Auth', description: 'تسجيل الدخول والتسجيل والـ OTP — مشترك لجميع أنواع المستخدمين | Login, register, OTP — shared for all user types' },
  { name: '🔓 Brands & Models', description: 'ماركات وموديلات السيارات (بيانات عامة لا تحتاج توكن) | Vehicle brands & models — public data, no auth required' },
];

const CUSTOMER_TAGS = [
  { name: '📱 Customer | Profile', description: 'إدارة الملف الشخصي للعميل | Customer profile management' },
  { name: '📱 Customer | Vehicles', description: 'مركبات العميل — إضافة وعرض وتعديل وحذف | Customer vehicles — CRUD' },
  { name: '📱 Customer | Addresses', description: 'عناوين العميل المحفوظة | Customer saved addresses' },
  { name: '📱 Customer | Services', description: 'عرض قائمة الخدمات المتاحة والأوقات | Browse available services & slots' },
  { name: '📱 Customer | Bookings', description: 'إنشاء وإدارة الحجوزات العامة | Create & manage general service bookings' },
  { name: '📱 Customer | Car Wash', description: 'طلب وتتبع خدمة غسيل السيارة | Request & track car wash service' },
  { name: '📱 Customer | Towing', description: 'طلب خدمة سحب الطوارئ | Request emergency towing service' },
  { name: '📱 Customer | Mobile Car Service', description: 'خدمة الصيانة المتنقلة (الزرَش) | On-the-go mobile maintenance service' },
  { name: '📱 Customer | Comprehensive Care', description: 'خدمة العناية الشاملة بالسيارة | Comprehensive car care service' },
  { name: '📱 Customer | Workshops', description: 'عرض الورش المعتمدة وتفاصيلها وتقييماتها | Browse certified workshops, details & reviews' },
  { name: '📱 Customer | Inspections', description: 'طلبات فحص السيارة | Vehicle inspection requests' },
  { name: '📱 Customer | Marketplace', description: 'تصفح وشراء قطع الغيار — الفئات والقطع والسلة والطلبات | Browse & buy spare parts — categories, parts, cart & orders' },
  { name: '📱 Customer | Vendors', description: 'عرض قائمة الفيندورز والموردين | Browse vendor/supplier listings' },
  { name: '📱 Customer | Payments', description: 'الدفع وعمليات الدفع | Payment processing' },
  { name: '📱 Customer | Wallet', description: 'المحفظة والرصيد والمعاملات | Wallet, balance & transactions' },
  { name: '📱 Customer | Invoices', description: 'فواتير العميل | Customer invoices' },
  { name: '📱 Customer | Ratings', description: 'تقييم الخدمات والفنيين والورش | Rate services, technicians & workshops' },
  { name: '📱 Customer | Notifications', description: 'إشعارات التطبيق | App push notifications' },
  { name: '📱 Customer | Technical Support', description: 'طلبات دعم فني من العميل | Customer technical support requests' },
  { name: '📱 Customer | Feedback', description: 'شكاوى ومقترحات من العميل | Customer complaints & suggestions' },
  { name: '📱 Customer | Emergency Broadcasts', description: 'بث طلبات الطوارئ — العميل يبث وينتظر عروض الفنيين | Emergency broadcasts — customer broadcasts & receives technician offers' },
  { name: '📱 Customer | Tracking', description: 'تتبع موقع الفني في الوقت الفعلي | Real-time technician location tracking' },
];

const TECHNICIAN_TAGS = [
  { name: '🔧 Technician | My Jobs', description: 'الحجوزات المعينة للفني (حجوزات عامة + دعم فني) | Assigned bookings & technical support requests' },
  { name: '🔧 Technician | Towing Jobs', description: 'طلبات السحب المعينة للفني | Assigned towing requests for technician' },
  { name: '🔧 Technician | Car Wash Jobs', description: 'طلبات الغسيل المعينة للفني | Assigned car wash requests for technician' },
  { name: '🔧 Technician | Location', description: 'بث الموقع الجغرافي للفني في الوقت الفعلي | Real-time technician GPS broadcasting' },
];

const VENDOR_TAGS = [
  { name: '🏪 Vendor | Onboarding', description: 'تسجيل وتوثيق الفيندور الجديد | New vendor registration & verification' },
  { name: '🏪 Vendor | Workshop', description: 'إدارة ملف الورشة وخدماتها وصورها والكوبونات | Workshop profile, services, images & coupons management' },
  { name: '🏪 Vendor | Spare Parts', description: 'إدارة قطع الغيار في المتجر | Spare parts inventory management' },
  { name: '🏪 Vendor | Orders', description: 'طلبات العملاء لقطع الغيار | Customer spare parts orders' },
  { name: '🏪 Vendor | Supply Requests', description: 'طلبات التوريد من الفيندور | Supply requests from vendor' },
  { name: '🏪 Vendor | Comprehensive Care', description: 'خدمات العناية الشاملة المقدمة من الفيندور | Comprehensive care services offered by vendor' },
];

const ADMIN_TAGS = [
  { name: '⚙️ Admin | Dashboard', description: 'إحصائيات وملخص لوحة التحكم | Dashboard statistics & summary' },
  { name: '⚙️ Admin | Users', description: 'إدارة كل المستخدمين (عملاء + فنيين + فيندورز) | Manage all users — customers, technicians & vendors' },
  { name: '⚙️ Admin | Bookings', description: 'إدارة الحجوزات وتحديث الحالة — فاتورة تُنشأ تلقائياً عند الإكمال | Manage bookings & update status — invoice auto-created on COMPLETED' },
  { name: '⚙️ Admin | Services', description: 'إدارة قائمة الخدمات | Manage service catalog' },
  { name: '⚙️ Admin | Workshops', description: 'مراجعة وإدارة الورش المعتمدة | Review & manage certified workshops' },
  { name: '⚙️ Admin | Finance', description: 'التقارير المالية والفواتير والمحافظ والعمولات — إنشاء فاتورة يدوياً وتسجيل الدفع | Financial reports, invoices, wallets & commissions' },
  { name: '⚙️ Admin | Settings', description: 'إعدادات النظام العامة (ضريبة القيمة المضافة، عمولة التطبيق، النقاط) | System-wide settings (VAT, commission, points)' },
  { name: '⚙️ Admin | Feedback', description: 'مراجعة شكاوى ومقترحات العملاء | Review customer complaints & suggestions' },
  { name: '⚙️ Admin | Activity Logs', description: 'سجل نشاط الأدمن | Admin activity logs' },
  { name: '⚙️ Admin | Brands & Models', description: 'إضافة وتعديل وحذف ماركات وموديلات السيارات | Add, edit & delete vehicle brands & models' },
  { name: '⚙️ Admin | Spare Parts', description: 'الإشراف على قطع الغيار في المتجر | Oversee marketplace spare parts' },
];

const ALL_TAGS = [
  ...PUBLIC_TAGS,
  ...CUSTOMER_TAGS,
  ...TECHNICIAN_TAGS,
  ...VENDOR_TAGS,
  ...ADMIN_TAGS,
];

// ============================================================
// BASE SWAGGER DEFINITION (shared by all specs)
// ============================================================

const baseDefinition = {
  openapi: '3.0.0',
  servers: [
    { url: 'http://localhost:3000', description: 'Development — بيئة التطوير' },
    { url: 'https://akfeek-backend.developteam.site', description: 'Production — بيئة الإنتاج' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token — أدخل التوكن بعد كلمة Bearer مثال: `Bearer eyJhbGci...`',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Error message' },
          errorAr: { type: 'string', example: 'رسالة الخطأ' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          details: { type: 'object', additionalProperties: true },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          messageAr: { type: 'string', example: 'تمت العملية بنجاح' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 10 },
        },
      },
      Address: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          label: { type: 'string', example: 'Home' },
          labelAr: { type: 'string', nullable: true, example: 'المنزل' },
          street: { type: 'string', example: 'King Fahd Road' },
          streetAr: { type: 'string', nullable: true, example: 'طريق الملك فهد' },
          city: { type: 'string', example: 'Riyadh' },
          cityAr: { type: 'string', nullable: true, example: 'الرياض' },
          state: { type: 'string', nullable: true },
          stateAr: { type: 'string', nullable: true },
          postalCode: { type: 'string', nullable: true, example: '12345' },
          country: { type: 'string', example: 'SA', default: 'SA' },
          latitude: { type: 'number', format: 'double', example: 24.7136 },
          longitude: { type: 'number', format: 'double', example: 46.6753 },
          isDefault: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AddressInput: {
        type: 'object',
        required: ['label', 'street', 'city', 'latitude', 'longitude'],
        properties: {
          label: { type: 'string', example: 'Home' },
          labelAr: { type: 'string', example: 'المنزل' },
          street: { type: 'string', example: 'King Fahd Road' },
          streetAr: { type: 'string', example: 'طريق الملك فهد' },
          city: { type: 'string', example: 'Riyadh' },
          cityAr: { type: 'string', example: 'الرياض' },
          state: { type: 'string' },
          stateAr: { type: 'string' },
          postalCode: { type: 'string', example: '12345' },
          country: { type: 'string', example: 'SA', default: 'SA' },
          latitude: { type: 'number', format: 'double', example: 24.7136 },
          longitude: { type: 'number', format: 'double', example: 46.6753 },
          isDefault: { type: 'boolean', example: false },
        },
      },
    },
    parameters: {
      LanguageHeader: {
        name: 'Accept-Language',
        in: 'header',
        description: 'اللغة المفضلة | Preferred language',
        schema: { type: 'string', enum: ['ar', 'en'], default: 'ar' },
      },
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'رقم الصفحة | Page number',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'عدد العناصر في الصفحة | Items per page',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'مطلوب مصادقة | Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, error: 'Authentication required', errorAr: 'مطلوب مصادقة', code: 'UNAUTHORIZED' },
          },
        },
      },
      ForbiddenError: {
        description: 'تم رفض الوصول | Access denied',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, error: 'Access denied', errorAr: 'تم رفض الوصول', code: 'FORBIDDEN' },
          },
        },
      },
      NotFoundError: {
        description: 'المورد غير موجود | Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { success: false, error: 'Resource not found', errorAr: 'المورد غير موجود', code: 'NOT_FOUND' },
          },
        },
      },
      ValidationError: {
        description: 'خطأ في التحقق من البيانات | Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false, error: 'Validation failed', errorAr: 'فشل التحقق',
              code: 'VALIDATION_ERROR', details: { field: 'Invalid value' },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const API_FILES = [
  './src/api/routes/*.js',
  './src/api/routes/admin/*.js',
  './src/config/swagger-schemas.js',
  './src/modules/vendor/*.js',
];

// ============================================================
// SPEC BUILDER — generates a spec filtered by tag prefixes
// ============================================================

function buildSpec({ title, description, tags, tagFilter }) {
  const spec = swaggerJsdoc({
    definition: {
      ...baseDefinition,
      info: {
        title,
        version: '1.0.0',
        description,
        contact: { name: 'Akfeek API Support', email: 'support@akfeek.com' },
      },
      tags,
    },
    apis: API_FILES,
  });

  if (tagFilter && spec.paths) {
    const filteredPaths = {};
    for (const [path, methods] of Object.entries(spec.paths)) {
      const filteredMethods = {};
      for (const [method, operation] of Object.entries(methods)) {
        if (!operation.tags) continue;
        const hasMatch = operation.tags.some((tag) =>
          tagFilter.some((prefix) => tag.startsWith(prefix))
        );
        if (hasMatch) filteredMethods[method] = operation;
      }
      if (Object.keys(filteredMethods).length > 0) {
        filteredPaths[path] = filteredMethods;
      }
    }
    spec.paths = filteredPaths;
  }

  return spec;
}

// ============================================================
// FULL SPEC — كل شيء (للمطورين الداخليين)
// ============================================================

const fullSpec = swaggerJsdoc({
  definition: {
    ...baseDefinition,
    info: {
      title: '🚗 Akfeek API — Full Reference',
      version: '1.0.0',
      description: `
# Akfeek Platform — Full API Reference

> **للمطورين الداخليين فقط** — هذه الوثيقة تحتوي على **جميع** الـ endpoints.
> لو بتشتغل على جزء معين، استخدم الرابط المخصص ليك:

| الجمهور | الرابط |
|---|---|
| 📱 تطبيق موبايل العميل | [\`/api-docs/mobile\`](/api-docs/mobile) |
| 🔧 تطبيق موبايل الفني | [\`/api-docs/technician\`](/api-docs/technician) |
| 🏪 بوابة الفيندور / الورشة | [\`/api-docs/vendor\`](/api-docs/vendor) |
| ⚙️ لوحة تحكم الأدمن | [\`/api-docs/admin\`](/api-docs/admin) |

---

## Authentication / المصادقة

\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

1. \`POST /api/auth/login\` — سجل دخول واحصل على التوكن
2. انقر **Authorize** في الأعلى وأدخل: \`Bearer <token>\`
      `,
      contact: { name: 'Akfeek API Support', email: 'support@akfeek.com' },
    },
    tags: ALL_TAGS,
  },
  apis: API_FILES,
});

// ============================================================
// MOBILE SPEC — 📱 تطبيق العميل
// ============================================================

const mobileSpec = buildSpec({
  title: '📱 Akfeek — Customer Mobile App',
  description: `
# تطبيق أكفيك — موبايل العميل

**لمطور موبايل العميل فقط** — هذه الوثيقة تحتوي على كل الـ endpoints التي يحتاجها تطبيق العميل.

## كيف تبدأ؟

1. \`POST /api/auth/login\` → احصل على التوكن
2. انقر **Authorize** وأدخل: \`Bearer <token>\`
3. تصفح الـ endpoints حسب الـ tags (كلها تبدأ بـ 📱 Customer)

## رحلة العميل الأساسية

| الخطوة | Endpoint |
|---|---|
| 1. تسجيل | \`POST /api/auth/register\` |
| 2. دخول | \`POST /api/auth/login\` |
| 3. إضافة سيارة | \`POST /api/vehicles\` |
| 4. عرض الخدمات | \`GET /api/services\` |
| 5. حجز | \`POST /api/bookings\` |
| 6. دفع | \`POST /api/payments/initiate\` |
| 7. تقييم | \`POST /api/ratings\` |
  `,
  tags: [...PUBLIC_TAGS, ...CUSTOMER_TAGS],
  tagFilter: ['🔓', '📱 Customer'],
});

// ============================================================
// TECHNICIAN SPEC — 🔧 تطبيق الفني
// ============================================================

const technicianSpec = buildSpec({
  title: '🔧 Akfeek — Technician Mobile App',
  description: `
# تطبيق أكفيك — موبايل الفني

**لمطور موبايل الفني فقط** — هذه الوثيقة تحتوي على كل الـ endpoints التي يحتاجها تطبيق الفني.

## رحلة الفني

| الخطوة | Endpoint |
|---|---|
| 1. دخول | \`POST /api/auth/login\` (role: TECHNICIAN) |
| 2. وظائفي | \`GET /api/technician/bookings\` |
| 3. طلبات السحب | \`GET /api/technician/towing/broadcasts\` |
| 4. طلبات الغسيل | \`GET /api/technician/carwash/broadcasts\` |
| 5. بث الموقع | \`POST /api/technician/tracking/location\` |

> كل الـ endpoints تتطلب توكن بـ role = **TECHNICIAN**
  `,
  tags: [...PUBLIC_TAGS, ...TECHNICIAN_TAGS],
  tagFilter: ['🔓', '🔧 Technician'],
});

// ============================================================
// VENDOR SPEC — 🏪 بوابة الفيندور
// ============================================================

const vendorSpec = buildSpec({
  title: '🏪 Akfeek — Vendor / Workshop Portal',
  description: `
# بوابة أكفيك — الفيندور والورش

**لمطور بوابة الفيندور فقط** — هذه الوثيقة تحتوي على كل الـ endpoints الخاصة بالفيندور وصاحب الورشة.

## أنواع الفيندور

| النوع | الوصف |
|---|---|
| **WORKSHOP** | صاحب ورشة معتمدة |
| **SPARE_PARTS_VENDOR** | بائع قطع غيار |
| **COMPREHENSIVE_CARE** | مزود خدمة عناية شاملة |

## رحلة الفيندور

| الخطوة | Endpoint |
|---|---|
| 1. تسجيل | \`POST /api/vendor-onboarding/register\` |
| 2. دخول | \`POST /api/auth/login\` (role: SUPPLIER) |
| 3. ملف الورشة | \`GET /api/workshops/profile/me\` |
| 4. حجوزاتي | \`GET /api/workshops/profile/me/bookings\` |
| 5. قطع الغيار | \`GET /api/auto-parts/vendor/my-parts\` |
| 6. طلباتي | \`GET /api/marketplace-orders/vendor\` |
  `,
  tags: [...PUBLIC_TAGS, ...VENDOR_TAGS],
  tagFilter: ['🔓', '🏪 Vendor'],
});

// ============================================================
// ADMIN SPEC — ⚙️ لوحة تحكم الأدمن
// ============================================================

const adminSpec = buildSpec({
  title: '⚙️ Akfeek — Admin Dashboard',
  description: `
# لوحة تحكم أكفيك — الأدمن

**لمطور الداشبورد فقط** — هذه الوثيقة تحتوي على كل الـ endpoints الخاصة بلوحة التحكم.

> كل الـ endpoints تتطلب توكن بـ role = **ADMIN**

## الـ endpoints الرئيسية

| القسم | Endpoint |
|---|---|
| إحصائيات | \`GET /api/dashboard/stats\` |
| المستخدمون | \`GET /api/users\` |
| الطلبات المالية | \`GET /api/admin/finance/wallets\` |
| إعدادات النظام | \`GET /api/admin/settings\` |
| الورش | \`GET /api/workshops\` |
| الشكاوى | \`GET /api/admin/feedback\` |
  `,
  tags: [...PUBLIC_TAGS, ...ADMIN_TAGS],
  tagFilter: ['🔓 Auth', '⚙️ Admin'],
});

module.exports = {
  fullSpec,
  mobileSpec,
  technicianSpec,
  vendorSpec,
  adminSpec,
};
