const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth.routes');
const brandRoutes = require('./brands.routes');
const modelRoutes = require('./models.routes');
const userRoutes = require('./users.routes');
const vehicleRoutes = require('./vehicles.routes');
const serviceRoutes = require('./services.routes');
const productRoutes = require('./products.routes');
const bookingRoutes = require('./bookings.routes');
const broadcastRoutes = require('./broadcasts.routes');
const inspectionRoutes = require('./inspections.routes');
const supplyRoutes = require('./supplies.routes');
const invoiceRoutes = require('./invoices.routes');
const paymentRoutes = require('./payments.routes');
const walletRoutes = require('./wallets.routes');
const ratingRoutes = require('./ratings.routes');
const notificationRoutes = require('./notifications.routes');
const addressRoutes = require('./addresses.routes');
const adminSettingsRoutes = require('./admin/settings.routes');
const towingRoutes = require('./towing.routes');
const technicianTowingRoutes = require('./technicianTowing.routes');
const feedbackRoutes = require('./feedback.routes');
const feedbackAdminRoutes = require('./admin/feedback.admin.routes');

// Auto Parts Marketplace routes
const vendorRoutes = require('./vendors.routes');
const autoPartCategoryRoutes = require('./autoPartCategories.routes');
const autoPartRoutes = require('./autoParts.routes');
const marketplaceOrderRoutes = require('./marketplaceOrders.routes');
const workshopRoutes = require('./workshops.routes');

// ... existing routes
// ... (imports)

// ...

// Auto Parts Marketplace routes
router.use('/vendors', vendorRoutes);
router.use('/auto-part-categories', autoPartCategoryRoutes);
router.use('/auto-parts', autoPartRoutes);
router.use('/marketplace-orders', marketplaceOrderRoutes);

// Certified Workshops routes
router.use('/workshops', workshopRoutes);

// Public routes (no authentication required)
router.use('/auth', authRoutes);
router.use('/brands', brandRoutes);
router.use('/models', modelRoutes);

// Protected routes (authentication required)
// These will have auth middleware applied in individual route files
// Towing service routes (Must come before generic /bookings)
router.use('/bookings/towing', towingRoutes);
router.use('/technician/towing', technicianTowingRoutes);

// Car Wash service routes (Must come before generic /bookings)
const carWashRoutes = require('./carwash.routes');
const technicianCarWashRoutes = require('./technicianCarwash.routes');
router.use('/bookings/carwash', carWashRoutes);
router.use('/technician/carwash', technicianCarWashRoutes);

// Mobile Car Service (خدمة الزرَش / الصيانة المتنقلة)
const mobileCarServiceRoutes = require('./mobileCarService.routes');
router.use('/mobile-car-service', mobileCarServiceRoutes);

// Protected routes (authentication required)
// These will have auth middleware applied in individual route files
router.use('/users', userRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/services', serviceRoutes);
router.use('/products', productRoutes);
router.use('/bookings', bookingRoutes);
router.use('/broadcasts', broadcastRoutes);
router.use('/inspections', inspectionRoutes);
router.use('/supplies', supplyRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/wallets', walletRoutes);
router.use('/ratings', ratingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/addresses', addressRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/activity', require('./activity.routes'));

// Tracking routes (real-time location)
const trackingRoutes = require('./tracking.routes');
router.use('/technician/tracking', trackingRoutes);
// Note: Customer tracking endpoints (/api/bookings/:id/track) are in bookings.routes.js

// Admin routes
router.use('/admin/settings', adminSettingsRoutes);
router.use('/admin/feedback', feedbackAdminRoutes);
router.use('/dashboard', require('./dashboard.routes'));
router.use('/admin/finance', require('./admin/finance.routes'));

// Auto Parts Marketplace routes
router.use('/vendors', vendorRoutes);
router.use('/auto-part-categories', autoPartCategoryRoutes);
router.use('/auto-parts', autoPartRoutes);

module.exports = router;
