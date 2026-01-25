# MVCS Architecture - AutoService Backend

## Overview

The AutoService backend follows **MVCS (Model-View-Controller-Service)** architecture pattern for clean separation of concerns:

- **Model**: Prisma schema + ORM (Database layer)
- **View**: JSON responses (API responses)
- **Controller**: HTTP request/response handlers
- **Service**: Business logic layer

---

## Directory Structure

```
src/
├── api/
│   ├── controllers/       # HTTP request/response handling
│   │   └── auth.controller.js
│   ├── middlewares/       # Express middlewares
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   └── error.middleware.js
│   └── routes/            # Route definitions
│       ├── index.js
│       └── auth.routes.js
├── services/              # Business logic layer
│   └── auth.service.js
├── models/                # (Via Prisma - prisma/schema.prisma)
├── config/                # Configuration files
│   └── swagger.js
├── socket/                # Socket.io real-time
│   ├── index.js
│   └── namespaces/
└── utils/                 # Utilities
    ├── database/
    └── logger/
```

---

## Layer Responsibilities

### 1. **Routes** (`src/api/routes/`)
- Define HTTP endpoints
- Map URLs to controller methods
- Apply middleware (auth, validation, rate limiting)
- Swagger documentation annotations

**Example:**
```javascript
router.post('/register', authController.register);
router.post('/login', authController.login);
```

---

### 2. **Controllers** (`src/api/controllers/`)
- Handle HTTP requests and responses
- Extract data from `req.body`, `req.params`, `req.query`
- Call appropriate service methods
- Format and send HTTP responses
- **NO business logic** - just HTTP layer

**Example:**
```javascript
async register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 3. **Services** (`src/services/`)
- **Contains ALL business logic**
- Data validation
- Database operations (via Prisma)
- External API calls
- File processing
- Calculations and transformations
- Reusable across multiple controllers

**Example:**
```javascript
class AuthService {
  async register(userData) {
    // 1. Validate data
    if (!userData.email) throw new AppError('Email required', 400);
    
    // 2. Check existing user
    const existing = await prisma.user.findUnique({...});
    
    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 4. Create user
    const user = await prisma.user.create({...});
    
    // 5. Generate token
    const token = this.generateToken(user);
    
    return { user, token };
  }
}
```

---

### 4. **Models** (Prisma)
- Database schema definition
- Type-safe database access
- Relations and constraints
- Migrations

---

## Data Flow

```
HTTP Request
    ↓
Route (routes/auth.routes.js)
    ↓
Middleware (auth, validation)
    ↓
Controller (controllers/auth.controller.js)
    ↓
Service (services/auth.service.js)
    ↓
Prisma Client (Database)
    ↓
Service (process data)
    ↓
Controller (format response)
    ↓
HTTP Response
```

---

## Authentication Example

### Route Definition
```javascript
// src/api/routes/auth.routes.js
router.post('/register', authController.register);
```

### Controller (HTTP Layer)
```javascript
// src/api/controllers/auth.controller.js
async register(req, res, next) {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
}
```

### Service (Business Logic)
```javascript
// src/services/auth.service.js
async register(userData) {
  // Validation
  // Check duplicates
  // Hash password
  // Create user in DB
  // Generate JWT token
  return { user, token };
}
```

---

## Benefits of MVCS

### ✅ **Separation of Concerns**
- Each layer has a single responsibility
- Easy to understand and maintain

### ✅ **Testability**
- Services can be tested independently
- Mock database calls easily
- Unit test business logic without HTTP

### ✅ **Reusability**
- Services can be called from multiple controllers
- Services can call other services
- Shared logic in one place

### ✅ **Maintainability**
- Changes to business logic don't affect HTTP layer
- Changes to API format don't affect logic
- Easy to add new features

### ✅ **Scalability**
- Easy to add caching layer
- Easy to add message queues
- Microservices migration path

---

## Best Practices

### Controllers Should:
- ✅ Be thin (< 20 lines per method)
- ✅ Only handle HTTP concerns
- ✅ Call one service method
- ✅ Format responses consistently
- ❌ Not contain business logic
- ❌ Not access database directly

### Services Should:
- ✅ Contain all business logic
- ✅ Be framework-agnostic (no req/res)
- ✅ Return pure data (not HTTP responses)
- ✅ Validate input data
- ✅ Handle errors with AppError
- ❌ Not know about HTTP requests

### Routes Should:
- ✅ Define URL patterns
- ✅ Apply middleware
- ✅ Document with Swagger
- ❌ Not contain logic

---

## Current Implementation Status

### ✅ Completed
- [x] auth.service.js - Complete authentication business logic
- [x] auth.controller.js - Thin HTTP layer
- [x] auth.routes.js - Route definitions with Swagger
- [x] Tested and verified working

### 🔜 Next Steps
- [ ] Create user.service.js
- [ ] Create vehicle.service.js
- [ ] Create booking.service.js
- [ ] Create service.service.js (catalog)
- [ ] Create payment.service.js

---

## File: auth.service.js

**Location**: `src/services/auth.service.js`

**Methods**:
- `register(userData)` - Register new user
- `login(identifier, password)` - Authenticate user
- `sendOTP(phone)` - Generate and send OTP
- `verifyOTP(phone, code)` - Verify OTP code
- `getUserById(userId)` - Get user details
- `generateToken(user)` - Generate JWT token

**Dependencies**:
- bcrypt (password hashing)
- jsonwebtoken (JWT)
- Prisma (database)
- Winston (logging)

---

## File: auth.controller.js

**Location**: `src/api/controllers/auth.controller.js`

**Methods**:
- `register(req, res, next)` - POST /api/auth/register
- `login(req, res, next)` - POST /api/auth/login
- `sendOTP(req, res, next)` - POST /api/auth/send-otp
- `verifyOTP(req, res, next)` - POST /api/auth/verify-otp
- `getCurrentUser(req, res, next)` - GET /api/auth/me

**Each method**:
1. Extracts data from request
2. Calls service method
3. Formats HTTP response
4. Handles errors via middleware

---

**Status**: ✅ MVCS Architecture Implemented and Tested
