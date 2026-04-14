# Broadcast / Towing / Technician endpoints (for consolidation)

This list is used to decide a canonical broadcast model vs per-flow endpoints.

- /api/bookings/carwash/{broadcastId}/offers
- /api/bookings/carwash/{broadcastId}/offers/{offerId}/accept
- /api/bookings/towing/request
- /api/bookings/towing/{broadcastId}
- /api/bookings/towing/{broadcastId}/offers
- /api/bookings/towing/{broadcastId}/offers/{offerId}/accept
- /api/broadcasts
- /api/broadcasts/{id}
- /api/technician/carwash/broadcasts
- /api/technician/carwash/{broadcastId}/offers
- /api/technician/towing/broadcasts
- /api/technician/towing/broadcasts/{broadcastId}/offer
- /api/technician/towing/jobs
- /api/technician/towing/jobs/{jobId}/status
- /api/winches
- /api/winches/my
- /api/winches/my/broadcasts
- /api/winches/my/broadcasts/{broadcastId}/offer
- /api/winches/my/jobs
- /api/winches/my/jobs/{jobId}/status
- /api/winches/my/upload-image
- /api/winches/{id}