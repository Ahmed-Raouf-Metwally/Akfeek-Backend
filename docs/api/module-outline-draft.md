# API Module Outline (Draft)

Generated from openapi.json and intended to guide re-tagging and restructuring.

## Auth

- Total operations: **5**

| Method | Path | Current tag | Summary |
|---|---|---|---|
| POST | /api/auth/login | Authentication | User login |
| GET | /api/auth/me | Authentication | Get current user |
| POST | /api/auth/register | Authentication | Register new user |
| POST | /api/auth/send-otp | Authentication | Send OTP to phone |
| POST | /api/auth/verify-otp | Authentication | Verify OTP |

## Users

- Total operations: **26**

| Method | Path | Current tag | Summary |
|---|---|---|---|
| GET | /api/addresses | Addresses | Get user addresses - جلب عناوين المستخدم |
| POST | /api/addresses | Addresses | Create address - إضافة عنوان جديد |
| DELETE | /api/addresses/{id} | Addresses | Delete address - حذف عنوان |
| GET | /api/addresses/{id} | Addresses | Get address by ID - جلب عنوان بالمعرف |
| PUT | /api/addresses/{id} | Addresses | Update address - تعديل عنوان |
| GET | /api/users | Users | Get all users (Admin only) |
| POST | /api/users | Users | Create user (Admin only) - e.g. vendor account |
| DELETE | /api/users/{id} | Users | Delete user (Admin only) |
| GET | /api/users/{id} | Users | Get user by ID (Admin only) |
| PUT | /api/users/{id} | Users | Update user (Admin only) |
| PATCH | /api/users/{id}/status | Users | Update user status (Admin only) |
| PUT | /api/users/language | Users | Update language preference |
| GET | /api/users/profile | Users | Get current user profile |
| PUT | /api/users/profile | Users | Update user profile |
| PUT | /api/users/supplier-profile | Users | Update supplier profile |
| PUT | /api/users/technician-profile | Users | Update technician profile |
| GET | /api/vehicles | Vehicles | Get my vehicles |
| POST | /api/vehicles | Vehicles | Add new vehicle |
| DELETE | /api/vehicles/{id} | Vehicles | Delete vehicle |
| GET | /api/vehicles/{id} | Vehicles | Get vehicle by ID |
| PUT | /api/vehicles/{id} | Vehicles | Update vehicle |
| PATCH | /api/vehicles/{id}/primary | Vehicles | Set as primary vehicle |
| GET | /api/vehicles/admin/all | Vehicles | Get all vehicles (Admin) |
| GET | /api/vehicles/brands | Vehicles | Get vehicle brands catalog |
| GET | /api/vehicles/brands/{brandId}/models | Vehicles | Get vehicle models for a brand |
| GET | /api/wallets | Wallets | Get my wallet (balance + recent context) |

## Vendors

- Total operations: **14**

| Method | Path | Current tag | Summary |
|---|---|---|---|
| PATCH | /api/vendor-onboarding/admin/{id}/status | Vendor Onboarding | Update vendor application status (Admin) |
| GET | /api/vendor-onboarding/admin/list | Vendor Onboarding | List all vendor applications (Admin) |
| POST | /api/vendor-onboarding/register | Vendor Onboarding | Register a new vendor (Public) |
| GET | /api/vendors | Vendors | Get all vendors (Admin only) |
| POST | /api/vendors | Vendors (الفيندور) | إضافة فيندور — Create vendor [CRUD - Create] |
| DELETE | /api/vendors/{id} | Vendors (الفيندور) | Delete vendor (Admin only) |
| GET | /api/vendors/{id} | Vendors (الفيندور) | عرض الفيندور بالمعرف — Get vendor by ID [CRUD - Read One] |
| PUT | /api/vendors/{id} | Vendors (الفيندور) | تحديث الفيندور — Update vendor [CRUD - Update] |
| GET | /api/vendors/{id}/car-wash-services | Vendors | Get car wash services for a vendor |
| GET | /api/vendors/{id}/services | Vendors | Get all services for a vendor |
| GET | /api/vendors/{id}/stats | Vendors (الفيندور) | Get vendor statistics |
| PUT | /api/vendors/{id}/status | Vendors (الفيندور) | Update vendor status (Admin only) |
| GET | /api/vendors/profile/me | Vendors (الفيندور) | Get current user's vendor profile |
| GET | /api/vendors/profile/me/comprehensive-care-bookings | 3. العناية الشاملة (Comprehensive Care) | حجوزات العناية الشاملة للفيندور — Comprehensive care bookings (الفيندور) [قسم 3] |

## Services

- Total operations: **44**

| Method | Path | Current tag | Summary |
|---|---|---|---|
| GET | /api/brands | Vehicle Brands | Get all vehicle brands |
| POST | /api/brands | Vehicle Brands | Create new brand (Admin only) |
| DELETE | /api/brands/{id} | Vehicle Brands | Delete brand (Admin only) |
| GET | /api/brands/{id} | Vehicle Brands | Get brand by ID |
| PATCH | /api/brands/{id} | Vehicle Brands | Update brand (Admin only) |
| GET | /api/models | Vehicle Models | Get all vehicle models |
| POST | /api/models | Vehicle Models | Create new model (Admin only) |
| DELETE | /api/models/{id} | Vehicle Models | Delete model (Admin only) |
| GET | /api/models/{id} | Vehicle Models | Get model by ID |
| PATCH | /api/models/{id} | Vehicle Models | Update model (Admin only) |
| GET | /api/services | Services | Get all services |
| POST | /api/services | Services | Create new service (Admin) |
| DELETE | /api/services/{id} | Services | Delete/Deactivate service (Admin) |
| GET | /api/services/{id} | Services | Get service details |
| PUT | /api/services/{id} | Services | Update service (Admin) |
| GET | /api/services/car-wash | Services | Get all car wash services |
| GET | /api/services/car-wash/{vendorId} | Services | Get car wash services for specific vendor |
| GET | /api/services/comprehensive-care | Services | Get all comprehensive care services |
| GET | /api/services/mobile-workshop | Services | Get all mobile workshop services |
| GET | /api/services/workshop | Services | Get all certified workshop services |
| GET | /api/workshops | 1. الورش المعتمدة (Certified Workshops) | Get all certified workshops |
| GET | /api/workshops/{id} | 1. الورش المعتمدة (Certified Workshops) | Get workshop details by ID |
| POST | /api/workshops/{id}/images | 1. الورش المعتمدة (Certified Workshops) | Upload workshop images |
| DELETE | /api/workshops/{id}/images/{imageIndex} | 1. الورش المعتمدة (Certified Workshops) | Delete workshop image |
| DELETE | /api/workshops/{id}/logo | 1. الورش المعتمدة (Certified Workshops) | Delete workshop logo |
| POST | /api/workshops/{id}/logo | 1. الورش المعتمدة (Certified Workshops) | Upload workshop logo |
| GET | /api/workshops/{id}/reviews | 1. الورش المعتمدة (Certified Workshops) | Get workshop reviews |
| POST | /api/workshops/{id}/reviews | 1. الورش المعتمدة (Certified Workshops) | Create a review for a workshop |
| GET | /api/workshops/{id}/reviews/stats | 1. الورش المعتمدة (Certified Workshops) | Get review statistics |
| GET | /api/workshops/{id}/services | 1. الورش المعتمدة (Certified Workshops) | Get workshop services (list for booking) |
| GET | /api/workshops/admin/{id}/reviews | 1. الورش المعتمدة (Certified Workshops) | Get workshop reviews (Admin) |
| GET | /api/workshops/admin/all | 1. الورش المعتمدة (Certified Workshops) | Get all workshops (Admin) |
| DELETE | /api/workshops/admin/reviews/{id} | 1. الورش المعتمدة (Certified Workshops) | Delete a review |
| PATCH | /api/workshops/admin/reviews/{id}/approve | 1. الورش المعتمدة (Certified Workshops) | Update review approval status |
| POST | /api/workshops/admin/reviews/{id}/response | 1. الورش المعتمدة (Certified Workshops) | Add workshop response to review |
| POST | /api/workshops/admin/workshops | 1. الورش المعتمدة (Certified Workshops) | Create new certified workshop (Admin) |
| DELETE | /api/workshops/admin/workshops/{id} | 1. الورش المعتمدة (Certified Workshops) | Delete workshop (Admin) |
| PUT | /api/workshops/admin/workshops/{id} | 1. الورش المعتمدة (Certified Workshops) | Update workshop (Admin) |
| PATCH | /api/workshops/admin/workshops/{id}/verify | 1. الورش المعتمدة (Certified Workshops) | Verify/Unverify workshop (Admin) |
| GET | /api/workshops/profile/me | 1. الورش المعتمدة (Certified Workshops) | Get my workshop (Vendor) |
| GET | /api/workshops/profile/me/bookings | 1. الورش المعتمدة (Certified Workshops) | Get my workshop bookings (Vendor) |
| GET | /api/workshops/profile/me/bookings/{bookingId}/akfeek-journey/documents | 1. الورش المعتمدة (Certified Workshops) | List Akfeek journey insurance documents for this workshop booking (vendor) |
| GET | /api/workshops/profile/me/bookings/{bookingId}/inspection | 1. الورش المعتمدة (Certified Workshops) | Get inspection report for a workshop booking (vendor) |
| PUT | /api/workshops/profile/me/bookings/{bookingId}/inspection | 1. الورش المعتمدة (Certified Workshops) | Create/update inspection; when status COMPLETED or APPROVED syncs repair estimate to unpaid invoice |

## Orders

- Total operations: **30**

| Method | Path | Current tag | Summary |
|---|---|---|---|
| GET | /api/auto-part-categories | Auto Part Categories | Get all categories |
| POST | /api/auto-part-categories | Auto Part Categories | Create new category (Admin only) |
| DELETE | /api/auto-part-categories/{id} | Auto Part Categories | Delete category (Admin only) |
| GET | /api/auto-part-categories/{id} | Auto Part Categories | Get category by ID |
| PUT | /api/auto-part-categories/{id} | Auto Part Categories | Update category (Admin only) |
| GET | /api/auto-part-categories/tree | Auto Part Categories | Get category tree hierarchy |
| GET | /api/auto-parts | Auto Parts | Get all auto parts with filters |
| POST | /api/auto-parts | Auto Parts | Create new auto part |
| DELETE | /api/auto-parts/{id} | Auto Parts | Delete part |
| GET | /api/auto-parts/{id} | Auto Parts | Get part details |
| PUT | /api/auto-parts/{id} | Auto Parts | Update auto part |
| PUT | /api/auto-parts/{id}/approve | Auto Parts | Approve or reject part (Admin only) |
| POST | /api/auto-parts/{id}/images | Auto Parts | Add images to part |
| PUT | /api/auto-parts/{id}/stock | Auto Parts | Update part stock quantity |
| GET | /api/auto-parts/brand/{vehicleBrandId} | Auto Parts | Get parts compatible with vehicle brand |
| GET | /api/auto-parts/vehicle/{vehicleModelId} | Auto Parts | Get parts compatible with vehicle |
| GET | /api/auto-parts/vendor/{vendorId} | Auto Parts | Get parts by vendor |
| GET | /api/cart | Cart | Get my cart (with items) |
| POST | /api/cart/checkout | Cart | Create order from cart (Customer) |
| POST | /api/cart/items | Cart | Add auto part to cart |
| DELETE | /api/cart/items/{id} | Cart | Remove item from cart |
| PATCH | /api/cart/items/{id} | Cart | Update cart item quantity |
| GET | /api/marketplace-orders | Marketplace Orders | Get all orders (Admin) |
| POST | /api/marketplace-orders | Marketplace Orders | Create new order |
| GET | /api/marketplace-orders/{id} | Marketplace Orders | Get order details |
| PUT | /api/marketplace-orders/{id}/items/{itemId}/status | Marketplace Orders | Update item status (Vendor) |
| PUT | /api/marketplace-orders/{id}/status | Marketplace Orders | Update global order status (Admin) |
| GET | /api/marketplace-orders/my-orders | Marketplace Orders | Get my orders (Customer) |
| GET | /api/marketplace-orders/status-options | Marketplace Orders | Get possible order/payment status values |
| GET | /api/marketplace-orders/vendor-orders | Marketplace Orders | Get received orders (Vendor) |

## Bookings

- Total operations: **113**

| Method | Path | Current tag | Summary |
|---|---|---|---|
| GET | /api/activity | Activity Logs | List activity logs (admin) |
| POST | /api/activity | Activity Logs | Create activity log entry |
| PATCH | /api/akfeek-journey/{id}/abandon | Akfeek Journey | إلغاء الرحلة — Abandon |
| POST | /api/akfeek-journey/{id}/documents | Akfeek Journey | رفع وثائق التأمين — multipart |
| GET | /api/akfeek-journey/{id}/documents/{documentId}/file | Akfeek Journey | تنزيل ملف وثيقة رحلة (عميل) |
| PATCH | /api/akfeek-journey/{id}/step/{stepKey}/complete | Akfeek Journey | إكمال خطوة وثائق التأمين بدون رفع ملفات جديدة |
| PATCH | /api/akfeek-journey/{id}/step/{stepKey}/link | Akfeek Journey | ربط حجز بالخطوة الحالية (سحب أو ورشة) |
| PATCH | /api/akfeek-journey/{id}/step/{stepKey}/skip | Akfeek Journey | تخطي الخطوة الحالية فقط |
| GET | /api/akfeek-journey/me | Akfeek Journey | رحلتي النشطة — Current journey + steps + فاتورة الورشة إن وُجدت |
| POST | /api/akfeek-journey/start | Akfeek Journey | بدء رحلة أكفيك — Start journey |
| GET | /api/banners | Banners | بنرات التطبيق (أعلى/أسفل/قطع غيار) — Public banners for mobile app |
| GET | /api/bookings | Bookings | List all bookings (Admin) |
| POST | /api/bookings | Bookings | Create booking (الورش المعتمدة / العناية الشاملة) |
| GET | /api/bookings/{bookingId}/location-history | Tracking | Get location history |
| GET | /api/bookings/{bookingId}/track | Tracking | Track technician location |
| GET | /api/bookings/{id} | Bookings | Get booking by ID (Admin or Customer — تفاصيل حجزي) |
| PATCH | /api/bookings/{id}/complete | Bookings | Mark booking as completed (Vendor) |
| PATCH | /api/bookings/{id}/confirm | Bookings | Confirm booking (Vendor – Certified Workshop) |
| GET | /api/bookings/{id}/inspection-report | Bookings | Get inspection report for booking (customer / workshop vendor / admin) |
| PATCH | /api/bookings/{id}/mobile-workshop-status | Bookings | Update mobile workshop booking status (Vendor) — في الطريق / وصل / جاري التنفيذ / تم |
| PATCH | /api/bookings/{id}/start | Bookings | Start booking (Vendor – Certified Workshop) — بدء تنفيذ الحجز |
| PATCH | /api/bookings/{id}/status | Bookings | Update booking status (Admin) |
| POST | /api/bookings/apply-package | Packages | Apply a package to a booking |
| GET | /api/bookings/carwash/{broadcastId}/offers | 2. ورش الغسيل (Car Wash) | (اختياري) عروض طلب الغسيل (فلو البث) |
| POST | /api/bookings/carwash/{broadcastId}/offers/{offerId}/accept | 2. ورش الغسيل (Car Wash) | Accept a car wash offer |
| POST | /api/bookings/carwash/request | 2. ورش الغسيل (Car Wash) | (اختياري) إنشاء طلب غسيل وبث للفنيين |
| GET | /api/bookings/my | Bookings | My bookings (Customer) — حجوزاتي / حالة الحجز |
| GET | /api/bookings/towing/{broadcastId} | 4. Towing | تفاصيل البث — Get broadcast details |
| GET | /api/bookings/towing/{broadcastId}/offers | 4. Towing | 4. عرض عروض السحب (أسعارها) — Get offers for towing request |
| POST | /api/bookings/towing/{broadcastId}/offers/{offerId}/accept | 4. Towing | 4. قبول عرض الوينش — Accept winch offer |
| POST | /api/bookings/towing/request | 4. Towing | 1. إنشاء طلب سحب (ونش) — Create towing request |
| GET | /api/broadcasts | Broadcasts | List all broadcasts (Admin) |
| GET | /api/broadcasts/{id} | Broadcasts | Get broadcast by ID (towing or mobile workshop request) |
| GET | /api/dashboard/all-sub-services | Dashboard | All sub-services for dashboard filters / overview |
| GET | /api/dashboard/analytics | Dashboard | Platform analytics (admin only) |
| GET | /api/dashboard/stats | Dashboard | Dashboard KPI stats |
| POST | /api/feedback | Feedback | Submit new complaint or suggestion |
| GET | /api/feedback/{id} | Feedback | Get feedback details |
| POST | /api/feedback/{id}/reply | Feedback | Reply to a feedback (Customer) |
| GET | /api/feedback/my | Feedback | Get my feedback history |
| GET | /api/inspections | Inspections | List inspection reports (paginated) |
| GET | /api/inspections/{id} | Inspections | Get inspection report by ID |
| GET | /api/invoices | Invoices | List all invoices (Admin) |
| GET | /api/invoices/{id} | Invoices | Get invoice by ID |
| PATCH | /api/invoices/{id}/mark-paid | Invoices | Mark invoice as paid (Admin) — إيداع حصة الفيندور وخصم عمولة المنصة |
| GET | /api/invoices/my/{id} | Invoices | Get my invoice (Customer) — جلب فاتورتي |
| PATCH | /api/invoices/my/{id}/pay | Invoices | Pay my invoice (Customer) — دفع فاتورتي |
| GET | /api/invoices/vendor/mine | Invoices | List my invoices (Vendor) — فواتير الفيندور |
| POST | /api/mobile-car-service/bookings | 5. الورش المتنقلة (Mobile Workshop) | إنشاء حجز ورشة متنقلة — Create mobile workshop booking (حجز يظهر تحت قسم الورش المتنقلة) |
| GET | /api/mobile-workshop-requests | 5. الورش المتنقلة (Mobile Workshop) | طلباتي (عميل) — Get my mobile workshop requests |
| POST | /api/mobile-workshop-requests | 5. الورش المتنقلة (Mobile Workshop) | إنشاء طلب ورشة متنقلة (عميل) — Create mobile workshop request |
| GET | /api/mobile-workshop-requests/{id} | 5. الورش المتنقلة (Mobile Workshop) | تفاصيل الطلب مع العروض (عميل) — Get request by ID with offers |
| POST | /api/mobile-workshop-requests/{requestId}/select-offer | 5. الورش المتنقلة (Mobile Workshop) | اختيار عرض (عميل) — Select offer → creates booking & invoice |
| GET | /api/mobile-workshop-types | 5. الورش المتنقلة (Mobile Workshop) | قائمة أنواع الورش المتنقلة — List mobile workshop types (public) |
| POST | /api/mobile-workshop-types | 5. الورش المتنقلة (Mobile Workshop) | إضافة نوع ورشة (أدمن) — Create workshop type |
| DELETE | /api/mobile-workshop-types/{id} | 5. الورش المتنقلة (Mobile Workshop) | حذف نوع ورشة (أدمن) — Delete workshop type |
| GET | /api/mobile-workshop-types/{id} | 5. الورش المتنقلة (Mobile Workshop) | عرض نوع ورشة بالمعرف — Get workshop type by ID |
| PUT | /api/mobile-workshop-types/{id} | 5. الورش المتنقلة (Mobile Workshop) | تحديث نوع ورشة (أدمن) — Update workshop type |
| GET | /api/mobile-workshop-types/{typeId}/services | 5. الورش المتنقلة (Mobile Workshop) | خدمات نوع الورشة — Get services for a workshop type |
| POST | /api/mobile-workshop-types/{typeId}/services | 5. الورش المتنقلة (Mobile Workshop) | إضافة خدمة لنوع الورشة (أدمن) — Create type service |
| DELETE | /api/mobile-workshop-types/{typeId}/services/{serviceId} | 5. الورش المتنقلة (Mobile Workshop) | حذف خدمة من نوع الورشة (أدمن) — Delete type service |
| PUT | /api/mobile-workshop-types/{typeId}/services/{serviceId} | 5. الورش المتنقلة (Mobile Workshop) | تحديث خدمة نوع الورشة (أدمن) — Update type service |
| GET | /api/mobile-workshops | 5. الورش المتنقلة (Mobile Workshop) | قائمة الورش المتنقلة — List all mobile workshops [CRUD - Read List] |
| POST | /api/mobile-workshops | 5. الورش المتنقلة (Mobile Workshop) | إضافة ورشة متنقلة (أدمن) — Create mobile workshop [CRUD - Create] |
| DELETE | /api/mobile-workshops/{id} | 5. الورش المتنقلة (Mobile Workshop) | حذف ورشة متنقلة (أدمن) — Delete mobile workshop [CRUD - Delete] |
| GET | /api/mobile-workshops/{id} | 5. الورش المتنقلة (Mobile Workshop) | عرض ورشة متنقلة بالمعرف — Get mobile workshop by ID [CRUD - Read One] |
| PUT | /api/mobile-workshops/{id} | 5. الورش المتنقلة (Mobile Workshop) | تحديث ورشة متنقلة (أدمن) — Update mobile workshop [CRUD - Update] |
| POST | /api/mobile-workshops/{id}/services | 5. الورش المتنقلة (Mobile Workshop) | إضافة خدمة لورشة متنقلة (أدمن) |
| DELETE | /api/mobile-workshops/{id}/services/{svcId} | 5. الورش المتنقلة (Mobile Workshop) | حذف خدمة ورشة متنقلة (أدمن) |
| PUT | /api/mobile-workshops/{id}/services/{svcId} | 5. الورش المتنقلة (Mobile Workshop) | تحديث خدمة ورشة متنقلة (أدمن) |
| POST | /api/mobile-workshops/{workshopId}/requests/{requestId}/offer | 5. الورش المتنقلة (Mobile Workshop) | موافقة على الطلب أو إرسال عرض (بائع) |
| POST | /api/mobile-workshops/{workshopId}/requests/{requestId}/reject | 5. الورش المتنقلة (Mobile Workshop) | رفض الطلب (بائع) — Reject request so it no longer appears in vendor list |
| DELETE | /api/mobile-workshops/my | 5. الورش المتنقلة (Mobile Workshop) | حذف ورشتي (بائع) — Delete my mobile workshop |
| GET | /api/mobile-workshops/my | 5. الورش المتنقلة (Mobile Workshop) | ورشتي المتنقلة (بائع) — Get my mobile workshop |
| POST | /api/mobile-workshops/my | 5. الورش المتنقلة (Mobile Workshop) | إنشاء ورشتي المتنقلة (بائع) — Create my mobile workshop |
| PUT | /api/mobile-workshops/my | 5. الورش المتنقلة (Mobile Workshop) | تحديث بيانات ورشتي (بائع) — Update my mobile workshop |
| GET | /api/mobile-workshops/my/requests | 5. الورش المتنقلة (Mobile Workshop) | طلبات ورشتي (بائع) — Get requests for my mobile workshop |
| POST | /api/mobile-workshops/my/upload-image | 5. الورش المتنقلة (Mobile Workshop) | رفع صورة لورشتي (بائع) — Upload image for my workshop |
| GET | /api/payments | Payments | List payments |
| GET | /api/payments/{id} | Payments | Get payment by ID |
| GET | /api/supplies | Supply Requests | List supply requests |
| GET | /api/supplies/{id} | Supply Requests | Get supply request by ID |
| POST | /api/technical-support-requests | 📱 Customer | Technical Support | Submit technical support request (طلب دعم فني) |
| GET | /api/technical-support-requests/{id} | 📱 Customer | Technical Support | Get request by ID (owner or admin) |
| GET | /api/technical-support-requests/{id}/track | 📱 Customer | Technical Support | Get tracking info (technician location) for customer |
| POST | /api/technical-support-requests/admin/{id}/assign | ⚙️ Admin | Users | [Admin] Assign technician to request |
| PATCH | /api/technical-support-requests/admin/{id}/status | ⚙️ Admin | Users | [Admin] Update request status |
| GET | /api/technical-support-requests/admin/list | ⚙️ Admin | Users | [Admin] List all technical support requests |
| GET | /api/technical-support-requests/my | 📱 Customer | Technical Support | Get my technical support requests |
| GET | /api/technical-support-requests/technicians | ⚙️ Admin | Users | [Admin] List technicians for assign dropdown |
| GET | /api/technician/bookings | 🔧 Technician | My Jobs | Get my assigned bookings (Technician) |
| POST | /api/technician/carwash/{broadcastId}/offers | Technician Car Wash | (اختياري/قديم) تقديم عرض لطلب غسيل |
| GET | /api/technician/carwash/broadcasts | Technician Car Wash | (اختياري/قديم) طلبات غسيل بالبث للفني |
| GET | /api/technician/technical-support-requests | 🔧 Technician | My Jobs | Get my assigned technical support requests (Technician) |
| GET | /api/technician/towing/broadcasts | Technician Towing | Get active towing broadcasts (for technicians) |
| POST | /api/technician/towing/broadcasts/{broadcastId}/offer | Technician Towing | Submit offer for towing request |
| GET | /api/technician/towing/jobs | Technician Towing | 6. قائمة مهام السائق — Get assigned towing jobs |
| PATCH | /api/technician/towing/jobs/{jobId}/status | Technician Towing | 6. تحديث حالة المهمة حتى إتمام النقل — Update job status |
| POST | /api/technician/tracking/location | Tracking | Update technician location |
| GET | /api/winches | 4. Towing | قائمة مقدمي السحب — List all winches [CRUD - Read List] |
| POST | /api/winches | 4. Towing | إضافة ونش (أدمن) — Create winch [CRUD - Create] |
| DELETE | /api/winches/{id} | 4. Towing | حذف ونش (أدمن) — Delete winch [CRUD - Delete] |
| GET | /api/winches/{id} | 4. Towing | عرض ونش بالمعرف — Get winch by ID [CRUD - Read One] |
| PUT | /api/winches/{id} | 4. Towing | تحديث ونش (أدمن) — Update winch [CRUD - Update] |
| DELETE | /api/winches/my | 4. Towing | حذف ونشي — Delete my winch (Winch vendor) |
| GET | /api/winches/my | 4. Towing | 1. ونشي — Get my winch (Winch vendor) |
| POST | /api/winches/my | 4. Towing | إنشاء ونش — Create my winch (Winch vendor) |
| PUT | /api/winches/my | 4. Towing | تحديث ونشي — Update my winch (Winch vendor) |
| GET | /api/winches/my/broadcasts | 4. Towing | 2. طلبات السحب القريبة — Get nearby towing requests (Winch vendor) |
| POST | /api/winches/my/broadcasts/{broadcastId}/offer | 4. Towing | 3. إرسال عرض — Submit winch offer (Winch vendor) |
| GET | /api/winches/my/jobs | 4. Towing | 5. مهام فيندور الوينش — Get my assigned jobs (Winch vendor) |
| PATCH | /api/winches/my/jobs/{jobId}/status | 4. Towing | 5. تحديث حالة المهمة — Update job status (Winch vendor) |
| POST | /api/winches/my/upload-image | 4. Towing | رفع صورة الونش — Upload my winch image (Winch vendor) |

## Packages

- Total operations: **4**

| Method | Path | Current tag | Summary |
|---|---|---|---|
| GET | /api/user-packages | Packages | Get current user's packages |
| GET | /api/user-packages/{id} | Packages | Get specific user package by ID |
| GET | /api/user-packages/eligible | Packages | Get user's eligible packages for specific services |
| POST | /api/user-packages/purchase | Packages | Purchase a package |

## Notifications

- Total operations: **5**

| Method | Path | Current tag | Summary |
|---|---|---|---|
| GET | /api/notifications | Notifications | Get my notifications (paginated) |
| GET | /api/notifications/{id} | Notifications | Get notification by ID |
| PATCH | /api/notifications/{id}/read | Notifications | Mark notification as read |
| GET | /api/notifications/admin/all | Notifications | Get all notifications in the system (Admin only) |
| PATCH | /api/notifications/read-all | Notifications | Mark all my notifications as read |

## Admin

- Total operations: **29**

| Method | Path | Current tag | Summary |
|---|---|---|---|
| GET | /api/admin/akfeek-journey | Akfeek Journey | List Akfeek journeys (admin) |
| GET | /api/admin/akfeek-journey/{id} | Akfeek Journey | Journey detail for admin (steps breakdown, invoice, documents meta) |
| GET | /api/admin/akfeek-journey/{id}/documents/{documentId}/file | Akfeek Journey | Download / inline open journey document file (admin) |
| GET | /api/admin/banners | Banners | (Admin) List banners |
| POST | /api/admin/banners | Banners | (Admin) Create banner |
| DELETE | /api/admin/banners/{id} | Banners | (Admin) Delete banner |
| PUT | /api/admin/banners/{id} | Banners | (Admin) Update banner |
| POST | /api/admin/banners/{id}/images | Banners | (Admin) Upload banner images (multiple) |
| DELETE | /api/admin/banners/{id}/images/{imageId} | Banners | (Admin) Delete one banner image |
| GET | /api/admin/employees | Admin Employees | List Akfeek employees (paginated) |
| POST | /api/admin/employees | Admin Employees | Create employee user |
| GET | /api/admin/employees/{id}/permissions | Admin Employees | Get employee + permissions + allKeys/labels |
| PUT | /api/admin/employees/{id}/permissions | Admin Employees | Replace employee permissions |
| GET | /api/admin/employees/permission-keys | Admin Employees | Available employee permission keys + labels (for admin UI) |
| GET | /api/admin/feedback | Admin Feedback | List all feedbacks (Admin) |
| DELETE | /api/admin/feedback/{id} | Admin Feedback | Soft delete feedback |
| POST | /api/admin/feedback/{id}/reply | Admin Feedback | Reply to a feedback |
| PATCH | /api/admin/feedback/{id}/status | Admin Feedback | Update feedback status |
| POST | /api/admin/finance/points/adjust | Wallets | Adjust user points (Credit/Debit) |
| GET | /api/admin/finance/points/audit | Wallets | Get points audit log |
| GET | /api/admin/finance/points/settings | Wallets | Get points conversion rate settings |
| POST | /api/admin/finance/points/settings | Wallets | Update points conversion rate settings |
| GET | /api/admin/finance/wallet/{walletId}/transactions | Wallets | Get wallet transactions history |
| POST | /api/admin/finance/wallet/credit | Wallets | Credit a user's wallet |
| POST | /api/admin/finance/wallet/debit | Wallets | Debit a user's wallet |
| GET | /api/admin/finance/wallets | Wallets | Get all wallets with pagination and search |
| GET | /api/admin/settings | Admin Settings | Get all system settings |
| PUT | /api/admin/settings/{key} | Admin Settings | Update a system setting |
| GET | /api/admin/settings/towing | Admin Settings | Get towing service settings |

## Reference

- Total operations: **1**

| Method | Path | Current tag | Summary |
|---|---|---|---|
| GET | /api/role-labels | Reference | Human-readable role labels for UI (AR/EN map) |

## Other

- Total operations: **10**

| Method | Path | Current tag | Summary |
|---|---|---|---|
| GET | /api/comprehensive-care/providers | 📱 Customer | Comprehensive Care | Get all comprehensive care providers (Merged Vendors & Workshops) |
| GET | /api/packages | Packages | Get all active packages |
| POST | /api/packages | Packages | Create a new package (Admin only) |
| DELETE | /api/packages/{id} | Packages | Delete a package (Admin only) |
| GET | /api/packages/{id} | Packages | Get package by ID |
| PUT | /api/packages/{id} | Packages | Update a package (Admin only) |
| GET | /api/packages/admin/subscriptions | Packages | Get all user package subscriptions (Admin only) |
| GET | /api/packages/eligible | Packages | Get packages eligible for specific services |
| GET | /api/packages/services | Packages | Get all available services for package selection |
| GET | /api/ratings | Ratings | List all ratings and reviews (Admin only) |
