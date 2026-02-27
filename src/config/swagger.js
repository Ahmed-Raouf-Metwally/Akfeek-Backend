const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'AutoService (أكفيك) API',
            version: '1.0.0',
            description: `
# AutoService API Documentation

Comprehensive car services platform supporting 4 service models:
1. **Direct Booking** (Fixed Services) - Car Wash, Polishing
2. **E-Commerce** (Catalog Services) - Oil Change, Filter Replacement
3. **Indrive/Broadcast** (Emergency Services) - Roadside Assistance
4. **Ekfik Lifecycle** (Inspection Services) - Valet & Comprehensive Repair

---

منصة شاملة لخدمات السيارات تدعم 4 نماذج خدمة:
1. **الحجز المباشر** (خدمات ثابتة) - غسيل السيارة، التلميع
2. **التجارة الإلكترونية** (خدمات الكتالوج) - تغيير الزيت، استبدال الفلاتر
3. **البث المباشر** (خدمات الطوارئ) - المساعدة على الطريق
4. **دورة الفحص** (خدمات الفحص) - الفحص الشامل والإصلاح

---

## Features / المميزات

- ✅ Bilingual support (Arabic/English) - دعم اللغتين
- ✅ Real-time updates via Socket.io - تحديثات فورية
- ✅ Multiple payment gateways - بوابات دفع متعددة
- ✅ Supply chain integration - تكامل سلسلة التوريد
- ✅ Geolocation-based services - خدمات الموقع الجغرافي

## Authentication / المصادقة

All protected endpoints require Bearer token in Authorization header:

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
            description: 'Development Server - بيئة التطوير'
        },
        {
            url: 'https://akfeek-backend.developteam.site',
            description: 'Production Server - بيئة الإنتاج'
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
                        errorAr: {
                            type: 'string',
                            example: 'رسالة الخطأ'
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
                        },
                        messageAr: {
                            type: 'string',
                            example: 'تمت العملية بنجاح'
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
                                errorAr: 'مطلوب مصادقة',
                                code: 'UNAUTHORIZED'
                            }
                        }
                    }
                },
                ForbiddenError: {
                    description: 'Access denied - تم رفض الوصول',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: 'Access denied',
                                errorAr: 'تم رفض الوصول',
                                code: 'FORBIDDEN'
                            }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Resource not found - المورد غير موجود',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: 'Resource not found',
                                errorAr: 'المورد غير موجود',
                                code: 'NOT_FOUND'
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Validation error - خطأ في التحقق',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: 'Validation failed',
                                errorAr: 'فشل التحقق',
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
        tags: [{
            name: 'Authentication',
            description: 'User authentication endpoints - نقاط المصادقة',
            externalDocs: {
                description: 'Authentication Guide',
                url: 'https://docs.autoservice.com/authentication'
            }
        },
        {
            name: 'Vehicle Brands',
            description: 'Vehicle brand management (Toyota, BMW, etc.) - إدارة ماركات المركبات'
        },
        {
            name: 'Vehicle Models',
            description: 'Vehicle model management (Camry, X5, etc.) - إدارة موديلات المركبات'
        },
        {
            name: 'Users',
            description: 'User profile management - إدارة الملف الشخصي'
        },
        {
            name: 'Vehicles',
            description: 'Vehicle management - إدارة المركبات'
        },
        {
            name: 'Services',
            description: 'Service catalog - كتالوج الخدمات'
        },
        {
            name: 'Bookings',
            description: 'Booking management (All 4 models) - إدارة الحجوزات'
        },
        {
            name: 'Broadcasts',
            description: 'Emergency job broadcasts (Indrive model) - بث وظائف الطوارئ'
        },
        {
            name: 'Inspections',
            description: 'Vehicle inspections (Ekfik model) - فحص المركبات'
        },
        {
            name: 'Supply Requests',
            description: 'Spare parts supply chain - سلسلة توريد قطع الغيار'
        },
        {
            name: 'Invoices',
            description: 'Invoice management - إدارة الفواتير'
        },
        {
            name: 'Payments',
            description: 'Payment processing - معالجة الدفع'
        },
        {
            name: 'Wallets',
            description: 'Wallet & transactions - المحفظة والمعاملات'
        },
        {
            name: 'Ratings',
            description: 'Reviews & ratings - التقييمات والمراجعات'
        },
        {
            name: 'Notifications',
            description: 'Push notifications - الإشعارات'
        },
        {
            name: 'Addresses',
            description: 'Address management - إدارة العناوين'
        },
        {
            name: 'Towing Service',
            description: 'Emergency towing service - خدمة السحب الطارئة'
        },
        {
            name: 'Technician Towing',
            description: 'Technician towing endpoints - نقاط خدمة السحب للفنيين'
        },
        {
            name: 'Technician Car Wash',
            description: 'Car Wash technician endpoints for viewing requests and offering services - نقاط خدمة غسيل السيارات للفنيين'
        },
        {
            name: 'Admin Settings',
            description: 'System settings management for administrators - إدارة إعدادات النظام للمسؤولين'
        },
        {
            name: 'Marketplace Vendors',
            description: 'Vendor management for auto parts - إدارة البائعين لقطع الغيار'
        },
        {
            name: 'Auto Part Categories',
            description: 'Auto part category management - إدارة فئات قطع الغيار'
        },
        {
            name: 'Auto Parts',
            description: 'Auto parts catalog management - إدارة كتالوج قطع الغيار'
        },
        {
            name: 'Cart',
            description: 'Customer cart and checkout - سلة المشتريات وإتمام الطلب'
        },
        {
            name: 'Marketplace Orders',
            description: 'Orders from marketplace (customer, vendor, admin) - طلبات المتجر'
        }
        ]
    },
    apis: [
        './src/api/routes/*.js',
        './src/api/routes/admin/*.js',
        './src/api/controllers/*.js',
        './src/config/swagger-schemas.js',
        './src/modules/vendor/*.js'
    ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;