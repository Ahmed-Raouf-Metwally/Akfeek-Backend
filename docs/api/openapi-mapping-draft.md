# OpenAPI Re-Org Mapping (Draft)

This is a **draft** mapping used for implementation. It does not delete endpoints; it proposes canonical /api/v1 paths and tags.

| Method | Old | Old tags | Module | New tag | Suggested canonical path |
|---|---|---|---|---|---|
| GET | /api/activity | Activity Logs | Admin | Admin | /api/v1/activity |
| POST | /api/activity | Activity Logs | Admin | Admin | /api/v1/activity |
| GET | /api/addresses | Addresses | Users | Users | /api/v1/users/me/addresses |
| POST | /api/addresses | Addresses | Users | Users | /api/v1/users/me/addresses |
| DELETE | /api/addresses/{id} | Addresses | Users | Users | /api/v1/users/me/addresses/{id} |
| GET | /api/addresses/{id} | Addresses | Users | Users | /api/v1/users/me/addresses/{id} |
| PUT | /api/addresses/{id} | Addresses | Users | Users | /api/v1/users/me/addresses/{id} |
| GET | /api/admin/akfeek-journey | Akfeek Journey | Admin | Admin | /api/v1/admin/akfeek-journey |
| GET | /api/admin/akfeek-journey/{id} | Akfeek Journey | Admin | Admin | /api/v1/admin/akfeek-journey/{id} |
| GET | /api/admin/akfeek-journey/{id}/documents/{documentId}/file | Akfeek Journey | Admin | Admin | /api/v1/admin/akfeek-journey/{id}/documents/{documentId}/file |
| GET | /api/admin/banners | Banners | Admin | Admin | /api/v1/admin/banners |
| POST | /api/admin/banners | Banners | Admin | Admin | /api/v1/admin/banners |
| DELETE | /api/admin/banners/{id} | Banners | Admin | Admin | /api/v1/admin/banners/{id} |
| PUT | /api/admin/banners/{id} | Banners | Admin | Admin | /api/v1/admin/banners/{id} |
| POST | /api/admin/banners/{id}/images | Banners | Admin | Admin | /api/v1/admin/banners/{id}/images |
| DELETE | /api/admin/banners/{id}/images/{imageId} | Banners | Admin | Admin | /api/v1/admin/banners/{id}/images/{imageId} |
| GET | /api/admin/employees | Admin Employees | Admin | Admin | /api/v1/admin/employees |
| POST | /api/admin/employees | Admin Employees | Admin | Admin | /api/v1/admin/employees |
| GET | /api/admin/employees/{id}/permissions | Admin Employees | Admin | Admin | /api/v1/admin/employees/{id}/permissions |
| PUT | /api/admin/employees/{id}/permissions | Admin Employees | Admin | Admin | /api/v1/admin/employees/{id}/permissions |
| GET | /api/admin/employees/permission-keys | Admin Employees | Admin | Admin | /api/v1/admin/employees/permission-keys |
| GET | /api/admin/feedback | Admin Feedback | Admin | Admin | /api/v1/admin/feedback |
| DELETE | /api/admin/feedback/{id} | Admin Feedback | Admin | Admin | /api/v1/admin/feedback/{id} |
| POST | /api/admin/feedback/{id}/reply | Admin Feedback | Admin | Admin | /api/v1/admin/feedback/{id}/reply |
| PATCH | /api/admin/feedback/{id}/status | Admin Feedback | Admin | Admin | /api/v1/admin/feedback/{id}/status |
| POST | /api/admin/finance/points/adjust | Wallets | Admin | Admin | /api/v1/admin/finance/points/adjust |
| GET | /api/admin/finance/points/audit | Wallets | Admin | Admin | /api/v1/admin/finance/points/audit |
| GET | /api/admin/finance/points/settings | Wallets | Admin | Admin | /api/v1/admin/finance/points/settings |
| POST | /api/admin/finance/points/settings | Wallets | Admin | Admin | /api/v1/admin/finance/points/settings |
| GET | /api/admin/finance/wallet/{walletId}/transactions | Wallets | Admin | Admin | /api/v1/admin/finance/wallet/{walletId}/transactions |
| POST | /api/admin/finance/wallet/credit | Wallets | Admin | Admin | /api/v1/admin/finance/wallet/credit |
| POST | /api/admin/finance/wallet/debit | Wallets | Admin | Admin | /api/v1/admin/finance/wallet/debit |
| GET | /api/admin/finance/wallets | Wallets | Admin | Admin | /api/v1/admin/finance/wallets |
| GET | /api/admin/settings | Admin Settings | Admin | Admin | /api/v1/admin/settings |
| PUT | /api/admin/settings/{key} | Admin Settings | Admin | Admin | /api/v1/admin/settings/{key} |
| GET | /api/admin/settings/towing | Admin Settings | Admin | Admin | /api/v1/admin/settings/towing |
| PATCH | /api/akfeek-journey/{id}/abandon | Akfeek Journey | Other | Other | /api/v1/akfeek-journey/{id}/abandon |
| POST | /api/akfeek-journey/{id}/documents | Akfeek Journey | Other | Other | /api/v1/akfeek-journey/{id}/documents |
| GET | /api/akfeek-journey/{id}/documents/{documentId}/file | Akfeek Journey | Other | Other | /api/v1/akfeek-journey/{id}/documents/{documentId}/file |
| PATCH | /api/akfeek-journey/{id}/step/{stepKey}/complete | Akfeek Journey | Other | Other | /api/v1/akfeek-journey/{id}/step/{stepKey}/complete |
| PATCH | /api/akfeek-journey/{id}/step/{stepKey}/link | Akfeek Journey | Other | Other | /api/v1/akfeek-journey/{id}/step/{stepKey}/link |
| PATCH | /api/akfeek-journey/{id}/step/{stepKey}/skip | Akfeek Journey | Other | Other | /api/v1/akfeek-journey/{id}/step/{stepKey}/skip |
| GET | /api/akfeek-journey/me | Akfeek Journey | Other | Other | /api/v1/akfeek-journey/me |
| POST | /api/akfeek-journey/start | Akfeek Journey | Other | Other | /api/v1/akfeek-journey/start |
| POST | /api/auth/login | Authentication | Auth | Auth | /api/v1/auth/login |
| GET | /api/auth/me | Authentication | Auth | Auth | /api/v1/auth/me |
| POST | /api/auth/register | Authentication | Auth | Auth | /api/v1/auth/register |
| POST | /api/auth/send-otp | Authentication | Auth | Auth | /api/v1/auth/send-otp |
| POST | /api/auth/verify-otp | Authentication | Auth | Auth | /api/v1/auth/verify-otp |
| GET | /api/auto-part-categories | Auto Part Categories | Orders | Orders | /api/v1/auto-part-categories |
| POST | /api/auto-part-categories | Auto Part Categories | Orders | Orders | /api/v1/auto-part-categories |
| DELETE | /api/auto-part-categories/{id} | Auto Part Categories | Orders | Orders | /api/v1/auto-part-categories/{id} |
| GET | /api/auto-part-categories/{id} | Auto Part Categories | Orders | Orders | /api/v1/auto-part-categories/{id} |
| PUT | /api/auto-part-categories/{id} | Auto Part Categories | Orders | Orders | /api/v1/auto-part-categories/{id} |
| GET | /api/auto-part-categories/tree | Auto Part Categories | Orders | Orders | /api/v1/auto-part-categories/tree |
| GET | /api/auto-parts | Auto Parts | Orders | Orders | /api/v1/auto-parts |
| POST | /api/auto-parts | Auto Parts | Orders | Orders | /api/v1/auto-parts |
| DELETE | /api/auto-parts/{id} | Auto Parts | Orders | Orders | /api/v1/auto-parts/{id} |
| GET | /api/auto-parts/{id} | Auto Parts | Orders | Orders | /api/v1/auto-parts/{id} |
| PUT | /api/auto-parts/{id} | Auto Parts | Orders | Orders | /api/v1/auto-parts/{id} |
| PUT | /api/auto-parts/{id}/approve | Auto Parts | Orders | Orders | /api/v1/auto-parts/{id}/approve |
| POST | /api/auto-parts/{id}/images | Auto Parts | Orders | Orders | /api/v1/auto-parts/{id}/images |
| PUT | /api/auto-parts/{id}/stock | Auto Parts | Orders | Orders | /api/v1/auto-parts/{id}/stock |
| GET | /api/auto-parts/brand/{vehicleBrandId} | Auto Parts | Orders | Orders | /api/v1/auto-parts/brand/{vehicleBrandId} |
| GET | /api/auto-parts/vehicle/{vehicleModelId} | Auto Parts | Orders | Orders | /api/v1/auto-parts/vehicle/{vehicleModelId} |
| GET | /api/auto-parts/vendor/{vendorId} | Auto Parts | Orders | Orders | /api/v1/auto-parts/vendor/{vendorId} |
| GET | /api/banners | Banners | Other | Other | /api/v1/banners |
| GET | /api/bookings | Bookings | Bookings | Bookings | /api/v1/bookings |
| POST | /api/bookings | Bookings, Akfeek Journey, 1. الورش المعتمدة (Certified Workshops), 2. ورش الغسيل (Car Wash), 3. العناية الشاملة (Comprehensive Care) | Bookings | Bookings | /api/v1/bookings |
| GET | /api/bookings/{bookingId}/location-history | Tracking | Bookings | Bookings | /api/v1/bookings/{bookingId}/location-history |
| GET | /api/bookings/{bookingId}/track | Tracking | Bookings | Bookings | /api/v1/bookings/{bookingId}/track |
| GET | /api/bookings/{id} | Bookings, 1. الورش المعتمدة (Certified Workshops) | Bookings | Bookings | /api/v1/bookings/{id} |
| PATCH | /api/bookings/{id}/complete | Bookings, 1. الورش المعتمدة (Certified Workshops), 2. ورش الغسيل (Car Wash), 3. العناية الشاملة (Comprehensive Care) | Bookings | Bookings | /api/v1/bookings/{id}/complete |
| PATCH | /api/bookings/{id}/confirm | Bookings, 1. الورش المعتمدة (Certified Workshops), Akfeek Journey | Bookings | Bookings | /api/v1/bookings/{id}/confirm |
| GET | /api/bookings/{id}/inspection-report | Bookings, 1. الورش المعتمدة (Certified Workshops) | Bookings | Bookings | /api/v1/bookings/{id}/inspection-report |
| PATCH | /api/bookings/{id}/mobile-workshop-status | Bookings, 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/bookings/{id}/mobile-workshop-status |
| PATCH | /api/bookings/{id}/start | Bookings, 1. الورش المعتمدة (Certified Workshops) | Bookings | Bookings | /api/v1/bookings/{id}/start |
| PATCH | /api/bookings/{id}/status | Bookings | Bookings | Bookings | /api/v1/bookings/{id}/status |
| POST | /api/bookings/apply-package | Packages | Bookings | Bookings | /api/v1/bookings/apply-package |
| GET | /api/bookings/carwash/{broadcastId}/offers | 2. ورش الغسيل (Car Wash) | Bookings | Bookings | /api/v1/bookings/carwash/{broadcastId}/offers |
| POST | /api/bookings/carwash/{broadcastId}/offers/{offerId}/accept | 2. ورش الغسيل (Car Wash) | Bookings | Bookings | /api/v1/bookings/carwash/{broadcastId}/offers/{offerId}/accept |
| POST | /api/bookings/carwash/request | 2. ورش الغسيل (Car Wash) | Bookings | Bookings | /api/v1/bookings/carwash/request |
| GET | /api/bookings/my | Bookings, 1. الورش المعتمدة (Certified Workshops) | Bookings | Bookings | /api/v1/bookings/my |
| GET | /api/bookings/towing/{broadcastId} | 4. Towing | Bookings | Bookings | /api/v1/bookings/towing/{broadcastId} |
| GET | /api/bookings/towing/{broadcastId}/offers | 4. Towing | Bookings | Bookings | /api/v1/bookings/towing/{broadcastId}/offers |
| POST | /api/bookings/towing/{broadcastId}/offers/{offerId}/accept | 4. Towing | Bookings | Bookings | /api/v1/bookings/towing/{broadcastId}/offers/{offerId}/accept |
| POST | /api/bookings/towing/request | 4. Towing, Akfeek Journey | Bookings | Bookings | /api/v1/bookings/towing/request |
| GET | /api/brands | Vehicle Brands | Other | Other | /api/v1/brands |
| POST | /api/brands | Vehicle Brands | Other | Other | /api/v1/brands |
| DELETE | /api/brands/{id} | Vehicle Brands | Other | Other | /api/v1/brands/{id} |
| GET | /api/brands/{id} | Vehicle Brands | Other | Other | /api/v1/brands/{id} |
| PATCH | /api/brands/{id} | Vehicle Brands | Other | Other | /api/v1/brands/{id} |
| GET | /api/broadcasts | Broadcasts | Bookings | Bookings | /api/v1/broadcasts |
| GET | /api/broadcasts/{id} | Broadcasts | Bookings | Bookings | /api/v1/broadcasts/{id} |
| GET | /api/cart | Cart | Orders | Orders | /api/v1/cart |
| POST | /api/cart/checkout | Cart | Orders | Orders | /api/v1/cart/checkout |
| POST | /api/cart/items | Cart | Orders | Orders | /api/v1/cart/items |
| DELETE | /api/cart/items/{id} | Cart | Orders | Orders | /api/v1/cart/items/{id} |
| PATCH | /api/cart/items/{id} | Cart | Orders | Orders | /api/v1/cart/items/{id} |
| GET | /api/comprehensive-care/providers | 📱 Customer | Comprehensive Care | Other | Other | /api/v1/comprehensive-care/providers |
| GET | /api/dashboard/all-sub-services | Dashboard | Admin | Admin | /api/v1/dashboard/all-sub-services |
| GET | /api/dashboard/analytics | Dashboard | Admin | Admin | /api/v1/dashboard/analytics |
| GET | /api/dashboard/stats | Dashboard | Admin | Admin | /api/v1/dashboard/stats |
| POST | /api/feedback | Feedback | Other | Other | /api/v1/feedback |
| GET | /api/feedback/{id} | Feedback | Other | Other | /api/v1/feedback/{id} |
| POST | /api/feedback/{id}/reply | Feedback | Other | Other | /api/v1/feedback/{id}/reply |
| GET | /api/feedback/my | Feedback | Other | Other | /api/v1/feedback/my |
| GET | /api/inspections | Inspections | Other | Other | /api/v1/inspections |
| GET | /api/inspections/{id} | Inspections | Other | Other | /api/v1/inspections/{id} |
| GET | /api/invoices | Invoices | Other | Other | /api/v1/invoices |
| GET | /api/invoices/{id} | Invoices | Other | Other | /api/v1/invoices/{id} |
| PATCH | /api/invoices/{id}/mark-paid | Invoices, 4. Towing | Bookings | Bookings | /api/v1/invoices/{id}/mark-paid |
| GET | /api/invoices/my/{id} | Invoices, 2. ورش الغسيل (Car Wash), 3. العناية الشاملة (Comprehensive Care) | Other | Other | /api/v1/invoices/my/{id} |
| PATCH | /api/invoices/my/{id}/pay | Invoices, Akfeek Journey, 2. ورش الغسيل (Car Wash), 3. العناية الشاملة (Comprehensive Care), 4. Towing | Bookings | Bookings | /api/v1/invoices/my/{id}/pay |
| GET | /api/invoices/vendor/mine | Invoices | Other | Other | /api/v1/invoices/vendor/mine |
| GET | /api/marketplace-orders | Marketplace Orders | Orders | Orders | /api/v1/marketplace-orders |
| POST | /api/marketplace-orders | Marketplace Orders | Orders | Orders | /api/v1/marketplace-orders |
| GET | /api/marketplace-orders/{id} | Marketplace Orders | Orders | Orders | /api/v1/marketplace-orders/{id} |
| PUT | /api/marketplace-orders/{id}/items/{itemId}/status | Marketplace Orders | Orders | Orders | /api/v1/marketplace-orders/{id}/items/{itemId}/status |
| PUT | /api/marketplace-orders/{id}/status | Marketplace Orders | Orders | Orders | /api/v1/marketplace-orders/{id}/status |
| GET | /api/marketplace-orders/my-orders | Marketplace Orders | Orders | Orders | /api/v1/marketplace-orders/my-orders |
| GET | /api/marketplace-orders/status-options | Marketplace Orders | Orders | Orders | /api/v1/marketplace-orders/status-options |
| GET | /api/marketplace-orders/vendor-orders | Marketplace Orders | Orders | Orders | /api/v1/marketplace-orders/vendor-orders |
| POST | /api/mobile-car-service/bookings | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-car-service/bookings |
| GET | /api/mobile-workshop-requests | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-requests |
| POST | /api/mobile-workshop-requests | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-requests |
| GET | /api/mobile-workshop-requests/{id} | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-requests/{id} |
| POST | /api/mobile-workshop-requests/{requestId}/select-offer | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-requests/{requestId}/select-offer |
| GET | /api/mobile-workshop-types | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-types |
| POST | /api/mobile-workshop-types | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-types |
| DELETE | /api/mobile-workshop-types/{id} | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-types/{id} |
| GET | /api/mobile-workshop-types/{id} | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-types/{id} |
| PUT | /api/mobile-workshop-types/{id} | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-types/{id} |
| GET | /api/mobile-workshop-types/{typeId}/services | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-types/{typeId}/services |
| POST | /api/mobile-workshop-types/{typeId}/services | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-types/{typeId}/services |
| DELETE | /api/mobile-workshop-types/{typeId}/services/{serviceId} | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-types/{typeId}/services/{serviceId} |
| PUT | /api/mobile-workshop-types/{typeId}/services/{serviceId} | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshop-types/{typeId}/services/{serviceId} |
| GET | /api/mobile-workshops | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops |
| POST | /api/mobile-workshops | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops |
| DELETE | /api/mobile-workshops/{id} | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/{id} |
| GET | /api/mobile-workshops/{id} | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/{id} |
| PUT | /api/mobile-workshops/{id} | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/{id} |
| POST | /api/mobile-workshops/{id}/services | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/{id}/services |
| DELETE | /api/mobile-workshops/{id}/services/{svcId} | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/{id}/services/{svcId} |
| PUT | /api/mobile-workshops/{id}/services/{svcId} | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/{id}/services/{svcId} |
| POST | /api/mobile-workshops/{workshopId}/requests/{requestId}/offer | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/{workshopId}/requests/{requestId}/offer |
| POST | /api/mobile-workshops/{workshopId}/requests/{requestId}/reject | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/{workshopId}/requests/{requestId}/reject |
| DELETE | /api/mobile-workshops/my | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/my |
| GET | /api/mobile-workshops/my | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/my |
| POST | /api/mobile-workshops/my | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/my |
| PUT | /api/mobile-workshops/my | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/my |
| GET | /api/mobile-workshops/my/requests | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/my/requests |
| POST | /api/mobile-workshops/my/upload-image | 5. الورش المتنقلة (Mobile Workshop) | Bookings | Bookings | /api/v1/mobile-workshops/my/upload-image |
| GET | /api/models | Vehicle Models | Other | Other | /api/v1/models |
| POST | /api/models | Vehicle Models | Other | Other | /api/v1/models |
| DELETE | /api/models/{id} | Vehicle Models | Other | Other | /api/v1/models/{id} |
| GET | /api/models/{id} | Vehicle Models | Other | Other | /api/v1/models/{id} |
| PATCH | /api/models/{id} | Vehicle Models | Other | Other | /api/v1/models/{id} |
| GET | /api/notifications | Notifications | Notifications | Notifications | /api/v1/notifications |
| GET | /api/notifications/{id} | Notifications | Notifications | Notifications | /api/v1/notifications/{id} |
| PATCH | /api/notifications/{id}/read | Notifications | Notifications | Notifications | /api/v1/notifications/{id}/read |
| GET | /api/notifications/admin/all | Notifications | Notifications | Notifications | /api/v1/notifications/admin/all |
| PATCH | /api/notifications/read-all | Notifications | Notifications | Notifications | /api/v1/notifications/read-all |
| GET | /api/packages | Packages | Other | Other | /api/v1/packages |
| POST | /api/packages | Packages | Other | Other | /api/v1/packages |
| DELETE | /api/packages/{id} | Packages | Other | Other | /api/v1/packages/{id} |
| GET | /api/packages/{id} | Packages | Other | Other | /api/v1/packages/{id} |
| PUT | /api/packages/{id} | Packages | Other | Other | /api/v1/packages/{id} |
| GET | /api/packages/admin/subscriptions | Packages | Other | Other | /api/v1/packages/admin/subscriptions |
| GET | /api/packages/eligible | Packages | Other | Other | /api/v1/packages/eligible |
| GET | /api/packages/services | Packages | Other | Other | /api/v1/packages/services |
| GET | /api/payments | Payments | Other | Other | /api/v1/payments |
| GET | /api/payments/{id} | Payments | Other | Other | /api/v1/payments/{id} |
| GET | /api/ratings | Ratings | Other | Other | /api/v1/ratings |
| GET | /api/role-labels | Reference | Reference | Reference | /api/v1/role-labels |
| GET | /api/services | Services, 2. ورش الغسيل (Car Wash), 3. العناية الشاملة (Comprehensive Care), 4. الورش المعتمدة (Certified Workshop), 5. الورش المتنقلة (Mobile Workshop) | Services | Services | /api/v1/services |
| POST | /api/services | Services | Services | Services | /api/v1/services |
| DELETE | /api/services/{id} | Services | Services | Services | /api/v1/services/{id} |
| GET | /api/services/{id} | Services | Services | Services | /api/v1/services/{id} |
| PUT | /api/services/{id} | Services | Services | Services | /api/v1/services/{id} |
| GET | /api/services/car-wash | Services, 2. ورش الغسيل (Car Wash) | Services | Services | /api/v1/services/car-wash |
| GET | /api/services/car-wash/{vendorId} | Services, 2. ورش الغسيل (Car Wash) | Services | Services | /api/v1/services/car-wash/{vendorId} |
| GET | /api/services/comprehensive-care | Services, 3. العناية الشاملة (Comprehensive Care) | Services | Services | /api/v1/services/comprehensive-care |
| GET | /api/services/mobile-workshop | Services, 5. الورش المتنقلة (Mobile Workshop) | Services | Services | /api/v1/services/mobile-workshop |
| GET | /api/services/workshop | Services, 4. الورش المعتمدة (Certified Workshop) | Services | Services | /api/v1/services/workshop |
| GET | /api/supplies | Supply Requests | Other | Other | /api/v1/supplies |
| GET | /api/supplies/{id} | Supply Requests | Other | Other | /api/v1/supplies/{id} |
| POST | /api/technical-support-requests | 📱 Customer | Technical Support | Other | Other | /api/v1/technical-support-requests |
| GET | /api/technical-support-requests/{id} | 📱 Customer | Technical Support | Other | Other | /api/v1/technical-support-requests/{id} |
| GET | /api/technical-support-requests/{id}/track | 📱 Customer | Technical Support | Other | Other | /api/v1/technical-support-requests/{id}/track |
| POST | /api/technical-support-requests/admin/{id}/assign | ⚙️ Admin | Users | Admin | Admin | /api/v1/technical-support-requests/admin/{id}/assign |
| PATCH | /api/technical-support-requests/admin/{id}/status | ⚙️ Admin | Users | Admin | Admin | /api/v1/technical-support-requests/admin/{id}/status |
| GET | /api/technical-support-requests/admin/list | ⚙️ Admin | Users | Admin | Admin | /api/v1/technical-support-requests/admin/list |
| GET | /api/technical-support-requests/my | 📱 Customer | Technical Support | Other | Other | /api/v1/technical-support-requests/my |
| GET | /api/technical-support-requests/technicians | ⚙️ Admin | Users | Admin | Admin | /api/v1/technical-support-requests/technicians |
| GET | /api/technician/bookings | 🔧 Technician | My Jobs | Bookings | Bookings | /api/v1/technician/bookings |
| POST | /api/technician/carwash/{broadcastId}/offers | Technician Car Wash | Bookings | Bookings | /api/v1/technician/carwash/{broadcastId}/offers |
| GET | /api/technician/carwash/broadcasts | Technician Car Wash | Bookings | Bookings | /api/v1/technician/carwash/broadcasts |
| GET | /api/technician/technical-support-requests | 🔧 Technician | My Jobs | Bookings | Bookings | /api/v1/technician/technical-support-requests |
| GET | /api/technician/towing/broadcasts | Technician Towing | Bookings | Bookings | /api/v1/technician/towing/broadcasts |
| POST | /api/technician/towing/broadcasts/{broadcastId}/offer | Technician Towing | Bookings | Bookings | /api/v1/technician/towing/broadcasts/{broadcastId}/offer |
| GET | /api/technician/towing/jobs | Technician Towing | Bookings | Bookings | /api/v1/technician/towing/jobs |
| PATCH | /api/technician/towing/jobs/{jobId}/status | Technician Towing | Bookings | Bookings | /api/v1/technician/towing/jobs/{jobId}/status |
| POST | /api/technician/tracking/location | Tracking | Bookings | Bookings | /api/v1/technician/tracking/location |
| GET | /api/user-packages | Packages | Packages | Packages | /api/v1/user-packages |
| GET | /api/user-packages/{id} | Packages | Packages | Packages | /api/v1/user-packages/{id} |
| GET | /api/user-packages/eligible | Packages | Packages | Packages | /api/v1/user-packages/eligible |
| POST | /api/user-packages/purchase | Packages | Packages | Packages | /api/v1/user-packages/purchase |
| GET | /api/users | Users | Users | Users | /api/v1/users |
| POST | /api/users | Users | Users | Users | /api/v1/users |
| DELETE | /api/users/{id} | Users | Users | Users | /api/v1/users/{id} |
| GET | /api/users/{id} | Users | Users | Users | /api/v1/users/{id} |
| PUT | /api/users/{id} | Users | Users | Users | /api/v1/users/{id} |
| PATCH | /api/users/{id}/status | Users | Users | Users | /api/v1/users/{id}/status |
| PUT | /api/users/language | Users | Users | Users | /api/v1/users/language |
| GET | /api/users/profile | Users | Users | Users | /api/v1/users/profile |
| PUT | /api/users/profile | Users | Users | Users | /api/v1/users/profile |
| PUT | /api/users/supplier-profile | Users | Users | Users | /api/v1/users/supplier-profile |
| PUT | /api/users/technician-profile | Users | Users | Users | /api/v1/users/technician-profile |
| GET | /api/vehicles | Vehicles | Users | Users | /api/v1/users/me/vehicles |
| POST | /api/vehicles | Vehicles | Users | Users | /api/v1/users/me/vehicles |
| DELETE | /api/vehicles/{id} | Vehicles | Users | Users | /api/v1/users/me/vehicles/{id} |
| GET | /api/vehicles/{id} | Vehicles | Users | Users | /api/v1/users/me/vehicles/{id} |
| PUT | /api/vehicles/{id} | Vehicles | Users | Users | /api/v1/users/me/vehicles/{id} |
| PATCH | /api/vehicles/{id}/primary | Vehicles | Users | Users | /api/v1/users/me/vehicles/{id}/primary |
| GET | /api/vehicles/admin/all | Vehicles | Users | Users | /api/v1/vehicles/admin/all |
| GET | /api/vehicles/brands | Vehicles | Users | Users | /api/v1/users/me/vehicles/brands |
| GET | /api/vehicles/brands/{brandId}/models | Vehicles | Users | Users | /api/v1/users/me/vehicles/brands/{brandId}/models |
| PATCH | /api/vendor-onboarding/admin/{id}/status | Vendor Onboarding | Vendors | Vendors | /api/v1/vendor-onboarding/admin/{id}/status |
| GET | /api/vendor-onboarding/admin/list | Vendor Onboarding | Vendors | Vendors | /api/v1/vendor-onboarding/admin/list |
| POST | /api/vendor-onboarding/register | Vendor Onboarding | Vendors | Vendors | /api/v1/vendor-onboarding/register |
| GET | /api/vendors | Vendors | Vendors | Vendors | /api/v1/vendors |
| POST | /api/vendors | Vendors (الفيندور) | Vendors | Vendors | /api/v1/vendors |
| DELETE | /api/vendors/{id} | Vendors (الفيندور) | Vendors | Vendors | /api/v1/vendors/{id} |
| GET | /api/vendors/{id} | Vendors (الفيندور) | Vendors | Vendors | /api/v1/vendors/{id} |
| PUT | /api/vendors/{id} | Vendors (الفيندور) | Vendors | Vendors | /api/v1/vendors/{id} |
| GET | /api/vendors/{id}/car-wash-services | Vendors | Vendors | Vendors | /api/v1/vendors/{id}/car-wash-services |
| GET | /api/vendors/{id}/services | Vendors | Vendors | Vendors | /api/v1/vendors/{id}/services |
| GET | /api/vendors/{id}/stats | Vendors (الفيندور) | Vendors | Vendors | /api/v1/vendors/{id}/stats |
| PUT | /api/vendors/{id}/status | Vendors (الفيندور) | Vendors | Vendors | /api/v1/vendors/{id}/status |
| GET | /api/vendors/profile/me | Vendors (الفيندور) | Vendors | Vendors | /api/v1/vendors/profile/me |
| GET | /api/vendors/profile/me/comprehensive-care-bookings | 3. العناية الشاملة (Comprehensive Care) | Vendors | Vendors | /api/v1/vendors/profile/me/comprehensive-care-bookings |
| GET | /api/wallets | Wallets | Users | Users | /api/v1/users/me/wallet |
| GET | /api/winches | 4. Towing | Bookings | Bookings | /api/v1/winches |
| POST | /api/winches | 4. Towing | Bookings | Bookings | /api/v1/winches |
| DELETE | /api/winches/{id} | 4. Towing | Bookings | Bookings | /api/v1/winches/{id} |
| GET | /api/winches/{id} | 4. Towing | Bookings | Bookings | /api/v1/winches/{id} |
| PUT | /api/winches/{id} | 4. Towing | Bookings | Bookings | /api/v1/winches/{id} |
| DELETE | /api/winches/my | 4. Towing | Bookings | Bookings | /api/v1/winches/my |
| GET | /api/winches/my | 4. Towing | Bookings | Bookings | /api/v1/winches/my |
| POST | /api/winches/my | 4. Towing | Bookings | Bookings | /api/v1/winches/my |
| PUT | /api/winches/my | 4. Towing | Bookings | Bookings | /api/v1/winches/my |
| GET | /api/winches/my/broadcasts | 4. Towing | Bookings | Bookings | /api/v1/winches/my/broadcasts |
| POST | /api/winches/my/broadcasts/{broadcastId}/offer | 4. Towing | Bookings | Bookings | /api/v1/winches/my/broadcasts/{broadcastId}/offer |
| GET | /api/winches/my/jobs | 4. Towing | Bookings | Bookings | /api/v1/winches/my/jobs |
| PATCH | /api/winches/my/jobs/{jobId}/status | 4. Towing | Bookings | Bookings | /api/v1/winches/my/jobs/{jobId}/status |
| POST | /api/winches/my/upload-image | 4. Towing | Bookings | Bookings | /api/v1/winches/my/upload-image |
| GET | /api/workshops | 1. الورش المعتمدة (Certified Workshops), Akfeek Journey | Services | Services | /api/v1/workshops |
| GET | /api/workshops/{id} | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/{id} |
| POST | /api/workshops/{id}/images | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/{id}/images |
| DELETE | /api/workshops/{id}/images/{imageIndex} | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/{id}/images/{imageIndex} |
| DELETE | /api/workshops/{id}/logo | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/{id}/logo |
| POST | /api/workshops/{id}/logo | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/{id}/logo |
| GET | /api/workshops/{id}/reviews | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/{id}/reviews |
| POST | /api/workshops/{id}/reviews | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/{id}/reviews |
| GET | /api/workshops/{id}/reviews/stats | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/{id}/reviews/stats |
| GET | /api/workshops/{id}/services | 1. الورش المعتمدة (Certified Workshops), Bookings, Akfeek Journey | Services | Services | /api/v1/workshops/{id}/services |
| GET | /api/workshops/admin/{id}/reviews | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/admin/{id}/reviews |
| GET | /api/workshops/admin/all | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/admin/all |
| DELETE | /api/workshops/admin/reviews/{id} | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/admin/reviews/{id} |
| PATCH | /api/workshops/admin/reviews/{id}/approve | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/admin/reviews/{id}/approve |
| POST | /api/workshops/admin/reviews/{id}/response | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/admin/reviews/{id}/response |
| POST | /api/workshops/admin/workshops | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/admin/workshops |
| DELETE | /api/workshops/admin/workshops/{id} | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/admin/workshops/{id} |
| PUT | /api/workshops/admin/workshops/{id} | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/admin/workshops/{id} |
| PATCH | /api/workshops/admin/workshops/{id}/verify | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/admin/workshops/{id}/verify |
| GET | /api/workshops/profile/me | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/profile/me |
| GET | /api/workshops/profile/me/bookings | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/profile/me/bookings |
| GET | /api/workshops/profile/me/bookings/{bookingId}/akfeek-journey/documents | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/profile/me/bookings/{bookingId}/akfeek-journey/documents |
| GET | /api/workshops/profile/me/bookings/{bookingId}/inspection | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/profile/me/bookings/{bookingId}/inspection |
| PUT | /api/workshops/profile/me/bookings/{bookingId}/inspection | 1. الورش المعتمدة (Certified Workshops) | Services | Services | /api/v1/workshops/profile/me/bookings/{bookingId}/inspection |