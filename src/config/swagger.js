const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'AutoService API',
            version: '1.0.0',
            description: `
# AutoService API Documentation

Comprehensive car services platform supporting 4 service models:
1. **Direct Booking** (Fixed Services) - Car Wash, Polishing
2. **E-Commerce** (Catalog Services) - Oil Change, Filter Replacement
3. **Indrive/Broadcast** (Emergency Services) - Roadside Assistance
4. **Ekfik Lifecycle** - Valet & Comprehensive Repair

## Features

- Real-time updates via Socket.io
- Multiple payment gateways
- Supply chain integration
- Geolocation-based services

## Postman

- Import spec: File -> Import -> \`http://localhost:3000/api-docs.json\` or \`openapi.json\` (after \`npm run openapi\`)
- Auth: Authorization tab, Bearer Token, JWT from \`POST /api/auth/login\`

## Authentication

All protected endpoints require Bearer token:

\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`
      `,
            contact: {
                name: 'AutoService API Support',
                email: 'support@autoservice.com',
                url: 'https://autoservice.com/support'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [{
            url: 'http://localhost:3000',
            description: 'Development Server'
        },
        {
            url: 'https://akfeek-backend.developteam.site',
            description: 'Production Server'
        }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Authorization header using Bearer scheme - رمز التفويض باستخدام JWT'
                }
            },
            schemas: {
                // Base response schemas
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        error: {
                            type: 'string',
                            example: 'Error message'
                        },
                        code: {
                            type: 'string',
                            example: 'VALIDATION_ERROR'
                        },
                        details: {
                            type: 'object',
                            additionalProperties: true
                        }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Operation successful'
                        }
                    }
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'integer',
                            example: 1,
                            description: 'Current page number'
                        },
                        limit: {
                            type: 'integer',
                            example: 10,
                            description: 'Items per page'
                        },
                        total: {
                            type: 'integer',
                            example: 100,
                            description: 'Total number of items'
                        },
                        totalPages: {
                            type: 'integer',
                            example: 10,
                            description: 'Total number of pages'
                        }
                    }
                },
                // Address schemas
                Address: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Address ID'
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                            description: 'User ID'
                        },
                        label: {
                            type: 'string',
                            description: 'Address label (e.g., Home, Work)',
                            example: 'Home'
                        },
                        labelAr: {
                            type: 'string',
                            nullable: true,
                            description: 'Arabic label',
                            example: 'المنزل'
                        },
                        street: {
                            type: 'string',
                            description: 'Street address',
                            example: 'King Fahd Road'
                        },
                        streetAr: {
                            type: 'string',
                            nullable: true,
                            description: 'Arabic street name',
                            example: 'طريق الملك فهد'
                        },
                        city: {
                            type: 'string',
                            description: 'City',
                            example: 'Riyadh'
                        },
                        cityAr: {
                            type: 'string',
                            nullable: true,
                            description: 'Arabic city name',
                            example: 'الرياض'
                        },
                        state: {
                            type: 'string',
                            nullable: true,
                            description: 'State/Province'
                        },
                        stateAr: {
                            type: 'string',
                            nullable: true,
                            description: 'Arabic state name'
                        },
                        postalCode: {
                            type: 'string',
                            nullable: true,
                            description: 'Postal code',
                            example: '12345'
                        },
                        country: {
                            type: 'string',
                            description: 'Country code',
                            example: 'SA',
                            default: 'SA'
                        },
                        latitude: {
                            type: 'number',
                            format: 'double',
                            description: 'GPS latitude',
                            example: 24.7136
                        },
                        longitude: {
                            type: 'number',
                            format: 'double',
                            description: 'GPS longitude',
                            example: 46.6753
                        },
                        isDefault: {
                            type: 'boolean',
                            description: 'Is this the default address?',
                            example: true
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Creation timestamp'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Last update timestamp'
                        }
                    }
                },
                AddressInput: {
                    type: 'object',
                    required: ['label', 'street', 'city', 'latitude', 'longitude'],
                    properties: {
                        label: {
                            type: 'string',
                            description: 'Address label (e.g., Home, Work)',
                            example: 'Home'
                        },
                        labelAr: {
                            type: 'string',
                            description: 'Arabic label',
                            example: 'المنزل'
                        },
                        street: {
                            type: 'string',
                            description: 'Street address',
                            example: 'King Fahd Road'
                        },
                        streetAr: {
                            type: 'string',
                            description: 'Arabic street name',
                            example: 'طريق الملك فهد'
                        },
                        city: {
                            type: 'string',
                            description: 'City',
                            example: 'Riyadh'
                        },
                        cityAr: {
                            type: 'string',
                            description: 'Arabic city name',
                            example: 'الرياض'
                        },
                        state: {
                            type: 'string',
                            description: 'State/Province'
                        },
                        stateAr: {
                            type: 'string',
                            description: 'Arabic state name'
                        },
                        postalCode: {
                            type: 'string',
                            description: 'Postal code',
                            example: '12345'
                        },
                        country: {
                            type: 'string',
                            description: 'Country code',
                            example: 'SA',
                            default: 'SA'
                        },
                        latitude: {
                            type: 'number',
                            format: 'double',
                            description: 'GPS latitude',
                            example: 24.7136
                        },
                        longitude: {
                            type: 'number',
                            format: 'double',
                            description: 'GPS longitude',
                            example: 46.6753
                        },
                        isDefault: {
                            type: 'boolean',
                            description: 'Set as default address?',
                            example: false
                        }
                    }
                }
            },
            parameters: {
                LanguageHeader: {
                    name: 'Accept-Language',
                    in: 'header',
                    description: 'Preferred language (ar or en) - اللغة المفضلة',
                    schema: {
                        type: 'string',
                        enum: ['ar', 'en'],
                        default: 'ar'
                    }
                },
                PageParam: {
                    name: 'page',
                    in: 'query',
                    description: 'Page number - رقم الصفحة',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        default: 1
                    }
                },
                LimitParam: {
                    name: 'limit',
                    in: 'query',
                    description: 'Items per page - عدد العناصر في الصفحة',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 10
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Authentication required - مطلوب مصادقة',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: 'Authentication required',
                                code: 'UNAUTHORIZED'
                            }
                        }
                    }
                },
                ForbiddenError: {
                    description: 'Access denied',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: 'Access denied',
                                code: 'FORBIDDEN'
                            }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: 'Resource not found',
                                code: 'NOT_FOUND'
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Validation error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: 'Validation failed',
                                code: 'VALIDATION_ERROR',
                                details: {
                                    email: 'Invalid email format',
                                    password: 'Password must be at least 8 characters'
                                }
                            }
                        }
                    }
                }
            }
        },
        security: [{
            bearerAuth: []
        }],
        tags: [
        {
            name: 'Banners',
            description: 'Top/Bottom banners for the mobile app. Public: GET /api/banners. Admin: /api/admin/banners.'
        },
        {
            name: 'Akfeek Journey',
            description: `
**رحلة موجّهة للعميل (CUSTOMER)** — الخطوات: \`INSURANCE_TOW\` → \`INSURANCE_DOCS\` → \`TOW_TO_WORKSHOP\` → \`WORKSHOP_BOOKING\` → \`POST_REPAIR_TOW_HOME\`.

### ترتيب اختبار E2E في Swagger (من البداية لحد العودة للبيت)

1. **POST** \`/api/auth/login\` — توكن عميل (\`CUSTOMER\`).
2. **POST** \`/api/akfeek-journey/start\` — Body: \`vehicleId\` (مستحسن لمسار السحب).
3. **GET** \`/api/akfeek-journey/me\` — احفظ \`journey.id\` و \`currentStep\`.

**أ) خطوة سحب التأمين \`INSURANCE_TOW\`**
4. **POST** \`/api/bookings/towing/request\` → \`bookingId\`, \`broadcastId\`.
5. **GET** \`/api/bookings/towing/{broadcastId}\` (اختياري).
6. **GET** \`/api/bookings/towing/{broadcastId}/offers\`
7. **POST** \`/api/bookings/towing/{broadcastId}/offers/{offerId}/accept\` → فاتورة.
8. **PATCH** \`/api/invoices/my/{invoiceId}/pay\` — دفع العميل (أو أدمن: \`/api/invoices/{id}/mark-paid\`).
9. **PATCH** \`/api/akfeek-journey/{journeyId}/step/INSURANCE_TOW/link\` — Body: \`{ "bookingId" }\`.
   - بديل سريع: **PATCH** \`.../step/INSURANCE_TOW/skip\`.

**ب) وثائق التأمين \`INSURANCE_DOCS\`**
10. **POST** \`/api/akfeek-journey/{journeyId}/documents\` (multipart \`files\`) **أو** **PATCH** \`.../step/INSURANCE_DOCS/complete\` **أو** \`.../skip\`.
11. **GET** \`/api/akfeek-journey/me\`.

**ج) سحب للورشة \`TOW_TO_WORKSHOP\`**
12. كرر فلو السحب (4–8) ثم **PATCH** \`.../step/TOW_TO_WORKSHOP/link\` — أو \`skip\`.

**د) حجز الورشة \`WORKSHOP_BOOKING\`**
13. **GET** \`/api/workshops\` — **GET** \`/api/workshops/{workshopId}/services\`.
14. **POST** \`/api/bookings\` — \`workshopId\`, \`deliveryMethod\`, \`workshopServiceIds\` أو \`serviceIds\`, \`scheduledDate\`, …
15. **PATCH** \`/api/bookings/{bookingId}/confirm\` — توكن **فيندور الورشة** (إن لزم).
16. **PATCH** \`/api/akfeek-journey/{journeyId}/step/WORKSHOP_BOOKING/link\` — Body: \`{ "bookingId" }\`.
17. **PATCH** \`/api/invoices/my/{invoiceId}/pay\` — حتى تصبح فاتورة الورشة مدفوعة (شرط إكمال الخطوة في الرحلة).
18. **GET** \`/api/akfeek-journey/me\`.

**هـ) العودة للمنزل \`POST_REPAIR_TOW_HOME\`**
19. فلو سحب مرة أخرى ثم **PATCH** \`.../step/POST_REPAIR_TOW_HOME/link\` — أو **PATCH** \`.../step/POST_REPAIR_TOW_HOME/skip\` (رفض العودة بالسحب → إكمال الرحلة).

20. **GET** \`/api/akfeek-journey/me\` — توقع \`status: COMPLETED\`.

**أدمن (ليس للموبايل):** \`GET /api/admin/akfeek-journey\`, \`GET .../{id}\`, \`GET .../documents/{documentId}/file\`.
`.trim()
        },
        {
            name: 'Inspections',
            description: 'تقارير الفحص — قائمة (أدمن/فني) وتفاصيل (أدمن/فني/عميل لحجزه).'
        },
        {
            name: 'Dashboard',
            description: 'إحصائيات ولوحة تحكم للأدمن والفيندور — /api/dashboard/*'
        },
        {
            name: 'Activity Logs',
            description: 'سجل النشاط — أدمن فقط: GET/POST /api/activity'
        },
        {
            name: 'Admin Employees',
            description: 'موظفو أكفيك — إدارة وصلاحيات (أدمن فقط) — /api/admin/employees'
        },
        {
            name: '1. Certified Workshops',
            description: 'Certified workshops CRUD + booking (POST /api/bookings with workshopId).'
        },
        {
            name: '2. Car Wash',
            description: 'Car wash flow: customer books cleaning service, pays invoice, vendor marks complete. GET /api/services?category=CLEANING, POST /api/bookings, PATCH /api/invoices/my/{id}/pay, PATCH /api/bookings/{id}/complete.'
        },
        {
            name: '3. Comprehensive Care',
            description: 'Comprehensive care flow: GET /api/services?category=COMPREHENSIVE_CARE, POST /api/bookings, PATCH /api/invoices/my/{id}/pay, PATCH /api/bookings/{id}/complete.'
        },
        {
            name: '4. Towing',
            description: 'Towing flow: POST /api/bookings/towing/request, GET /api/winches/my/broadcasts, POST .../offer, GET/POST offers/accept, PATCH /api/invoices/{id}/mark-paid, GET/PATCH /api/winches/my/jobs. Socket: customer:join_booking, driver:join_booking, driver:location, booking:message.'
        },
        {
            name: '5. الورش المتنقلة (Mobile Workshop)',
            description: `**الورش المتنقلة (Mobile Workshop) — فلو مبسط بدون تتبع أو شات**

---

**1. الكاتالوج الثابت + الحجز المباشر — /api/mobile-workshop**
| Method | Path | الوصف | صلاحية |
|--------|------|--------|--------|
| GET | /api/mobile-workshop/catalog | كاتالوج ثابت مطابق لتصميم الموبايل (7 عناصر فقط) | عام |
| POST | /api/mobile-workshop/bookings | إنشاء حجز وتعيين أقرب ورشة متاحة تلقائياً | عميل |
| GET | /api/mobile-workshop/bookings/:id | تفاصيل الحجز (عميل) | عميل |

**2. إدارة بيانات الورشة المتنقلة (Vendor/Admin) — /api/mobile-workshops**
| Method | Path | الوصف | صلاحية |
|--------|------|--------|--------|
| GET | /api/mobile-workshops | قائمة كل الورش | مصادق |
| GET | /api/mobile-workshops/my | ورشتي المتنقلة | فيندور |
| POST | /api/mobile-workshops/my | إنشاء ورشتي المتنقلة | فيندور |
| PUT | /api/mobile-workshops/my | تحديث بيانات ورشتي | فيندور |
| DELETE | /api/mobile-workshops/my | حذف ورشتي | فيندور |
| POST | /api/mobile-workshops/my/upload-image | رفع صورة لورشتي | فيندور |
| GET | /api/mobile-workshops/:id | تفاصيل ورشة | مصادق |
| POST | /api/mobile-workshops | إضافة ورشة | أدمن |
| PUT | /api/mobile-workshops/:id | تحديث ورشة | أدمن |
| DELETE | /api/mobile-workshops/:id | حذف ورشة | أدمن |
| POST | /api/mobile-workshops/:id/upload-image | رفع صورة (لأدمن) | أدمن |
| POST | /api/mobile-workshops/:id/services | إضافة خدمة لورشة | أدمن |
| PUT | /api/mobile-workshops/:id/services/:svcId | تحديث خدمة | أدمن |
| DELETE | /api/mobile-workshops/:id/services/:svcId | حذف خدمة | أدمن |

**3. الدفع**
- Customer: \`PATCH /api/invoices/my/:id/pay\`

ملاحظة: فلو الورش المتنقلة هنا **لا يعتمد على الشات أو التتبع**.
`
        },
        {
            name: '5. الورشة المتنقلة للمستخدم (Mobile Workshop User)',
            description: `واجهات العميل لعرض كاتالوج الورشة المتنقلة (ثابت + هرمي) وإنشاء الحجز.

**الكاتالوج (Public):**
- GET \`/api/mobile-workshop/catalog\` (ثابت حسب التصميم)
- GET \`/api/mobile-workshop/catalogs\` (هرمي: catalogs → categories → services)
- GET \`/api/mobile-workshop/catalogs/{catalogId}/categories\`
- GET \`/api/mobile-workshop/categories/{categoryId}/services\`

**الحجز (Customer):**
- POST \`/api/mobile-workshop/bookings\`
- GET \`/api/mobile-workshop/bookings/{id}\`
`
        },
        {
            name: 'Authentication',
            description: 'User authentication endpoints',
            externalDocs: {
                description: 'Authentication Guide',
                url: 'https://docs.autoservice.com/authentication'
            }
        },
        {
            name: 'Vehicle Brands',
            description: 'Vehicle brand management (Toyota, BMW, etc.)'
        },
        {
            name: 'Vehicle Models',
            description: 'Vehicle model management (Camry, X5, etc.)'
        },
        {
            name: 'Users',
            description: 'User profile management'
        },
        {
            name: 'Vendors',
            description: 'Vendor CRUD: list (GET), create (POST), get (GET :id), update (PUT :id), delete (DELETE :id), status (PUT :id/status).'
        },
        {
            name: 'Vehicles',
            description: 'Vehicle management'
        },
        {
            name: 'Car Profile UI',
            description: 'Car profile UI response plus maintenance records CRUD for the mobile car profile screens.'
        },
        {
            name: 'Services',
            description: 'Service catalog'
        },
        {
            name: 'Bookings',
            description: 'Booking list and status (GET/PATCH). See sections 1-5 for flow details.'
        },
        {
            name: 'Broadcasts',
            description: 'Job broadcasts (towing + mobile workshop). GET /api/broadcasts?type=towing|mobile-workshop|all.'
        },
        // Mobile Workshop Requests (legacy broadcast/offers flow) intentionally removed from the documented surface
        {
            name: 'Supply Requests',
            description: 'Spare parts supply chain'
        },
        {
            name: 'Invoices',
            description: 'Invoice management. vendorSummary for invoice owner. GET /api/invoices/my/{id}, PATCH .../pay.'
        },
        {
            name: 'Payments',
            description: 'Payment processing'
        },
        {
            name: 'Wallets',
            description: 'Wallet and transactions'
        },
        {
            name: 'Ratings',
            description: 'Reviews and ratings'
        },
        {
            name: 'Notifications',
            description: 'Push notifications'
        },
        {
            name: 'Addresses',
            description: 'Address management'
        },
        {
            name: 'Towing Service',
            description: 'Emergency towing service'
        },
        {
            name: 'Technician Towing',
            description: 'Technician towing endpoints'
        },
        {
            name: 'Technician Car Wash',
            description: 'Technician car wash broadcast endpoints (legacy).'
        },
        {
            name: 'Admin Settings',
            description: 'System settings for administrators'
        },
        {
            name: 'Auto Part Categories',
            description: 'Auto part category management'
        },
        {
            name: 'Auto Parts',
            description: 'Auto parts catalog management'
        },
        {
            name: 'Cart',
            description: 'Customer cart and checkout'
        },
        {
            name: 'Marketplace Orders',
            description: 'Orders from marketplace (customer, vendor, admin)'
        },
        {
            name: 'Reference',
            description: 'بيانات مرجعية عامة للواجهات (بدون مصادقة حيث يُذكر ذلك)'
        }
        ]
    },
    apis: [
        // All routes, excluding legacy mobile workshop flows that are not mounted anymore
        './src/api/routes/**/!(mobileWorkshopRequests.routes|mobileWorkshopTypes.routes|mobileCarService.routes).js',
        './src/api/routes/admin/**/*.js',
        './src/api/controllers/*.js',
        './src/config/swagger-schemas.js',
        './src/modules/vendor/*.js'
    ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
