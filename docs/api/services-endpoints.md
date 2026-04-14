# Services endpoints (for merge/unify decisions)

Canonical recommendation: use GET /api/v1/services?category=... and keep dedicated endpoints as aliases or mark legacy later.

## Current /api/services* paths

- /api/services
- /api/services/car-wash
- /api/services/car-wash/{vendorId}
- /api/services/comprehensive-care
- /api/services/mobile-workshop
- /api/services/workshop
- /api/services/{id}