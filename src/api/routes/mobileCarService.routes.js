const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const controller = require('../controllers/mobileCarService.controller');

// Public: parent service and sub-services (no auth required for catalog)
router.get('/', controller.getParentService);
router.get('/sub-services', controller.getSubServices);
router.get('/compatible-parts', controller.getCompatibleSpareParts);
router.get('/recommended-parts', controller.getRecommendedSpareParts);

// Protected: create booking (customer)
router.post('/bookings', authMiddleware, requireRole(['CUSTOMER']), controller.createBooking);

// Protected: get booking by ID (customer own, or admin)
router.get('/bookings/:id', authMiddleware, controller.getBookingById);

// Protected: update booking status (technician or admin)
router.patch('/bookings/:id/status', authMiddleware, requireRole(['TECHNICIAN', 'ADMIN']), controller.updateBookingStatus);

// Admin: link spare part to service; add vendor supply (does not affect existing vendor logic)
router.post('/admin/parts/:autoPartId/services', authMiddleware, requireRole(['ADMIN']), controller.linkPartToService);
router.post('/admin/parts/:autoPartId/vendors', authMiddleware, requireRole(['ADMIN']), controller.setPartVendorSupply);

module.exports = router;
