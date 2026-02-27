# Endpoints: من عرض قطع الغيار حتى إنشاء الطلب

الترتيب الكامل للـ API من أول ما تعرض قطع الغيار لحد ما تطلع الأوردر.

**Base URL:** `http://localhost:3000/api` (أو السيرفر اللي عندك)

---

## 1) تسجيل الدخول (مطلوب للطلبات والسلة)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| POST | `/auth/login` | تسجيل دخول – ترجع `token` تستخدمه في الـ headers |

**Body:**
```json
{
  "identifier": "your@email.com",
  "password": "YourPassword"
}
```

**استخدام التوكن:** في كل طلب لاحق (سلة، طلبات) أضف الهيدر:
```
Authorization: Bearer <token>
```

---

## 2) عرض قطع الغيار والفئات

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/auto-part-categories` | كل الفئات (للفلترة أو القوائم) |
| GET | `/auto-part-categories/tree` | شجرة الفئات (هيكل أب/أبناء) |
| GET | `/auto-part-categories/{id}` | تفاصيل فئة واحدة |
| GET | `/auto-parts` | كل قطع الغيار (مع فلترة وباجينيشين) |
| GET | `/auto-parts/vendor/{vendorId}` | قطع غيار فيندور معين |
| GET | `/auto-parts/vehicle/{vehicleModelId}` | قطع متوافقة مع موديل مركبة |
| GET | `/auto-parts/{id}` | تفاصيل قطعة غيار واحدة |

**أمثلة Query لـ GET /auto-parts:**
- `?page=1&limit=10`
- `?search=فلتر`
- `?categoryId=xxx`
- `?vendorId=xxx`

**ملاحظة:** هذه الـ GET ما تحتاج توكن (optional auth)، تقدر تعرض القطع بدون تسجيل دخول.

---

## 3) طريقتان للطلب: سلة ثم Checkout أو طلب مباشر

### أ) عبر السلة (Cart ثم Checkout)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/cart` | عرض السلة الحالية (تحتاج توكن) |
| POST | `/cart/items` | إضافة قطعة للسلة |
| PATCH | `/cart/items/{id}` | تعديل كمية صنف في السلة |
| DELETE | `/cart/items/{id}` | حذف صنف من السلة |
| POST | `/cart/checkout` | إنشاء الطلب من محتويات السلة |

**إضافة للسلة – POST /cart/items**
```json
{
  "autoPartId": "uuid-لقطعة-الغيار",
  "quantity": 1
}
```

**إنشاء الطلب من السلة – POST /cart/checkout**
```json
{
  "shippingAddress": {
    "address": "العنوان الكامل",
    "city": "الرياض",
    "country": "SA",
    "name": "اسم المستلم",
    "phone": "+966501234567"
  },
  "paymentMethod": "CASH"
}
```

### ب) طلب مباشر (بدون سلة)

| Method | Endpoint | الوصف |
|--------|----------|--------|
| POST | `/marketplace-orders` | إنشاء طلب مباشر بقائمة قطع (تحتاج توكن) |

**Body – POST /marketplace-orders**
```json
{
  "items": [
    { "autoPartId": "uuid-1", "quantity": 2 },
    { "autoPartId": "uuid-2", "quantity": 1 }
  ],
  "shippingAddress": {
    "address": "العنوان الكامل",
    "city": "الرياض",
    "country": "SA"
  }
}
```

---

## 4) بعد الطلب: عرض الطلبات والتفاصيل

| Method | Endpoint | الوصف |
|--------|----------|--------|
| GET | `/marketplace-orders/my-orders` | طلباتي (عميل) – مع pagination |
| GET | `/marketplace-orders/{id}` | تفاصيل طلب واحد |

**أمثلة Query لـ my-orders:**
- `?page=1&limit=10`

---

## ملخص الترتيب (من أول عرض قطع الغيار لحد الأوردر)

1. **عرض القطع:**  
   `GET /auto-part-categories` → `GET /auto-parts` (واختياري `GET /auto-parts/{id}`).
2. **دخول:**  
   `POST /auth/login` → استخدم الـ `token` في `Authorization: Bearer <token>`.
3. **إما السلة:**  
   `POST /cart/items` (مرة أو أكثر) → `GET /cart` (للمراجعة) → `POST /cart/checkout`.  
4. **أو طلب مباشر:**  
   `POST /marketplace-orders` مع `items` و `shippingAddress`.
5. **بعد الطلب:**  
   `GET /marketplace-orders/my-orders` أو `GET /marketplace-orders/{id}`.

كل الـ endpoints أعلاه تحت `/api`، مثلاً:  
`POST /api/auth/login`، `GET /api/auto-parts`، `POST /api/cart/items`، `POST /api/cart/checkout`، `POST /api/marketplace-orders`، `GET /api/marketplace-orders/my-orders`.
