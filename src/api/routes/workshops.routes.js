const express = require('express');
const router = express.Router();
const workshopController = require('../controllers/workshop.controller');
const workshopInspectionController = require('../controllers/workshopInspection.controller');
const workshopReviewController = require('../controllers/workshopReview.controller');
const workshopImageController = require('../controllers/workshopImage.controller');
const workshopServiceController = require('../controllers/workshopService.controller');
const { upload } = require('../../utils/imageUpload');
const { optionalAuth, authMiddleware } = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

router.use(optionalAuth);

// Customer endpoints
/**
 * @swagger
 * /api/workshops:
 *   get:
 *     summary: Get all certified workshops
 *     description: |
 *       Retrieve a list of active and verified workshops with optional filtering.
 *       **رحلة أكفيك:** اختر ورشة ثم GET /api/workshops/{id}/services ثم POST /api/bookings لخطوة WORKSHOP_BOOKING.
 *     tags: [1. الورش المعتمدة (Certified Workshops), Akfeek Journey]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city name
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in workshop name, city
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: List of certified workshops retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       nameAr:
 *                         type: string
 *                       city:
 *                         type: string
 *                       averageRating:
 *                         type: number
 *                       totalReviews:
 *                         type: integer
 *                       isVerified:
 *                         type: boolean
 *                       warrantyMonths:
 *                         type: integer
 *                         nullable: true
 *                       workshopServices:
 *                         type: array
 *                         description: Active workshop services with pricing (CertifiedWorkshopService)
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string, format: uuid }
 *                             workshopId: { type: string, format: uuid }
 *                             serviceType: { type: string }
 *                             name: { type: string }
 *                             nameAr: { type: string, nullable: true }
 *                             description: { type: string, nullable: true }
 *                             price: { type: number }
 *                             currency: { type: string, example: SAR }
 *                             estimatedDuration: { type: integer, nullable: true, description: Duration in minutes }
 */
router.get('/', workshopController.getAllWorkshops);

// Vendor (CERTIFIED_WORKSHOP) – my workshop & bookings – must be before /:id
/**
 * @swagger
 * /api/workshops/profile/me:
 *   get:
 *     summary: Get my workshop (Vendor)
 *     description: |
 *       فيندور الورش المعتمدة فقط — يجلب بيانات ورشته المرتبطة بحسابه.
 *       Certified workshop vendor retrieves their linked workshop.
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workshop data
 *       403:
 *         description: Not a certified workshop vendor
 *       404:
 *         description: No workshop linked to your account
 */
router.get('/profile/me', requireRole('VENDOR'), workshopController.getMyWorkshop);
router.put('/profile/me', requireRole('VENDOR'), workshopController.updateMyWorkshop);

/**
 * @swagger
 * /api/workshops/profile/me/bookings:
 *   get:
 *     summary: Get my workshop bookings (Vendor)
 *     description: |
 *       فيندور الورش المعتمدة — قائمة الحجوزات الخاصة بالورشة المعتمدة فقط (للتأكيد والإكمال).
 *       Certified workshop vendor gets paginated list of bookings for their workshop.
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED] }
 *         description: Filter by booking status
 *     responses:
 *       200:
 *         description: List of bookings with customer, vehicle, pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: array, items: { type: object } }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       403:
 *         description: Not a certified workshop vendor
 */
router.get('/profile/me/bookings', requireRole('VENDOR'), workshopController.getMyWorkshopBookings);

/**
 * @swagger
 * /api/workshops/profile/me/bookings/{bookingId}/akfeek-journey/documents:
 *   get:
 *     summary: List Akfeek journey insurance documents for this workshop booking (vendor)
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/profile/me/bookings/:bookingId/akfeek-journey/documents',
  requireRole('VENDOR'),
  workshopController.getAkfeekJourneyDocumentsForBooking
);
router.get(
  '/profile/me/bookings/:bookingId/akfeek-journey/documents/:documentId/file',
  requireRole('VENDOR'),
  workshopController.downloadAkfeekJourneyDocument
);

/**
 * @swagger
 * /api/workshops/profile/me/bookings/{bookingId}/inspection:
 *   get:
 *     summary: Get inspection report for a workshop booking (vendor)
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Create/update inspection; when status COMPLETED or APPROVED syncs repair estimate to unpaid invoice
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/profile/me/bookings/:bookingId/inspection',
  requireRole('VENDOR'),
  workshopInspectionController.getMyBookingInspection
);
router.put(
  '/profile/me/bookings/:bookingId/inspection',
  requireRole('VENDOR'),
  workshopInspectionController.upsertMyBookingInspection
);

// Vendor: إدارة الخدمات (مع الأسعار) — نوع الخدمة، اسم، سعر، مدة، وصف
router.get('/profile/me/services', requireRole('VENDOR'), workshopServiceController.getMyServices);
router.post('/profile/me/services', requireRole('VENDOR'), workshopServiceController.addMyService);
router.put('/profile/me/services/:svcId', requireRole('VENDOR'), workshopServiceController.updateMyService);
router.delete('/profile/me/services/:svcId', requireRole('VENDOR'), workshopServiceController.removeMyService);

/**
 * @swagger
 * /api/workshops/{id}:
 *   get:
 *     summary: Get workshop details by ID
 *     description: Retrieve detailed information about a specific certified workshop
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workshop ID
 *     responses:
 *       200:
 *         description: Workshop details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     nameAr:
 *                       type: string
 *                     description:
 *                       type: string
 *                     address:
 *                       type: string
 *                     city:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     workingHours:
 *                       type: object
 *                     services:
 *                       type: string
 *                     averageRating:
 *                       type: number
 *                     totalReviews:
 *                       type: integer
 *       404:
 *         description: Workshop not found
 */
router.get('/:id', workshopController.getWorkshopById);

// Admin endpoints
/**
 * @swagger
 * /api/workshops/admin/all:
 *   get:
 *     summary: Get all workshops (Admin)
 *     description: Retrieve all workshops without filtering (Admin only)
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: string
 *           enum: [true, false]
 *     responses:
 *       200:
 *         description: All workshops retrieved successfully
 *       403:
 *         description: Unauthorized - Admin access required
 */
router.get('/admin/all', requireRole('ADMIN'), workshopController.getAllWorkshopsAdmin);

/**
 * @swagger
 * /api/workshops/admin/workshops:
 *   post:
 *     summary: Create new certified workshop (Admin)
 *     description: Add a new certified workshop to the system
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, city, address, phone, services]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Al-Salam Auto Center
 *               nameAr:
 *                 type: string
 *                 example: مركز السلام للسيارات
 *               description:
 *                 type: string
 *               descriptionAr:
 *                 type: string
 *               address:
 *                 type: string
 *                 example: King Fahd Road, Al-Olaya District
 *               addressAr:
 *                 type: string
 *               city:
 *                 type: string
 *                 example: Riyadh
 *               cityAr:
 *                 type: string
 *                 example: الرياض
 *               locationUrl:
 *                 type: string
 *                 description: Google Maps URL (coordinates will be extracted automatically)
 *                 example: https://maps.google.com/?q=24.7136,46.6753
 *               latitude:
 *                 type: number
 *                 description: Optional if locationUrl is provided
 *                 example: 24.7136
 *               longitude:
 *                 type: number
 *                 description: Optional if locationUrl is provided
 *                 example: 46.6753
 *               phone:
 *                 type: string
 *                 example: "+966112345001"
 *               email:
 *                 type: string
 *               workingHours:
 *                 type: object
 *                 example: {sunday: {open: "08:00", close: "18:00"}}
 *               services:
 *                 type: string
 *                 example: '["Engine Repair", "Brake Service"]'
 *               logo:
 *                 type: string
 *               images:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               isVerified:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Workshop created successfully
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Unauthorized - Admin access required
 */
router.post('/admin/workshops', requireRole('ADMIN'), workshopController.createWorkshop);

/**
 * @swagger
 * /api/workshops/admin/workshops/{id}:
 *   put:
 *     summary: Update workshop (Admin)
 *     description: Update workshop information
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               description:
 *                 type: string
 *               city:
 *                 type: string
 *               phone:
 *                 type: string
 *               workingHours:
 *                 type: object
 *               services:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Workshop updated successfully
 *       404:
 *         description: Workshop not found
 *       403:
 *         description: Unauthorized - Admin access required
 */
router.put('/admin/workshops/:id', requireRole('ADMIN'), workshopController.updateWorkshop);

/**
 * @swagger
 * /api/workshops/admin/workshops/{id}/verify:
 *   patch:
 *     summary: Verify/Unverify workshop (Admin)
 *     description: Toggle workshop verification status
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isVerified]
 *             properties:
 *               isVerified:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Verification status updated successfully
 *       404:
 *         description: Workshop not found
 *       403:
 *         description: Unauthorized - Admin access required
 */
router.patch('/admin/workshops/:id/verify', requireRole('ADMIN'), workshopController.toggleVerification);

/**
 * @swagger
 * /api/workshops/admin/workshops/{id}:
 *   delete:
 *     summary: Delete workshop (Admin)
 *     description: Delete a certified workshop (only if no active bookings)
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workshop deleted successfully
 *       400:
 *         description: Cannot delete workshop with active bookings
 *       404:
 *         description: Workshop not found
 *       403:
 *         description: Unauthorized - Admin access required
 */
router.delete('/admin/workshops/:id', requireRole('ADMIN'), workshopController.deleteWorkshop);

// ================================================================================================
// WORKSHOP REVIEWS
// ================================================================================================

/**
 * @swagger
 * /api/workshops/{id}/reviews:
 *   post:
 *     summary: Create a review for a workshop
 *     description: Submit a review and rating for a workshop (requires completed booking for verified reviews)
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workshop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               bookingId:
 *                 type: string
 *                 description: Booking ID (optional, makes review verified)
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: Excellent service and professional staff
 *               commentAr:
 *                 type: string
 *                 example: خدمة ممتازة وطاقم محترف
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Validation error or already reviewed
 *       404:
 *         description: Workshop or booking not found
 */
router.post('/:id/reviews', workshopReviewController.createReview);

/**
 * @swagger
 * /api/workshops/{id}/reviews:
 *   get:
 *     summary: Get workshop reviews
 *     description: Retrieve all approved reviews for a workshop
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 */
router.get('/:id/reviews', workshopReviewController.getWorkshopReviews);

/**
 * @swagger
 * /api/workshops/{id}/reviews/stats:
 *   get:
 *     summary: Get review statistics
 *     description: Get rating distribution and statistics for a workshop
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/:id/reviews/stats', workshopReviewController.getReviewStats);

/**
 * @swagger
 * /api/workshops/admin/{id}/reviews:
 *   get:
 *     summary: Get workshop reviews (Admin)
 *     description: Retrieve all reviews including unapproved ones
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: isApproved
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 */
router.get('/admin/:id/reviews', requireRole('ADMIN'), workshopReviewController.getWorkshopReviewsAdmin);

/**
 * @swagger
 * /api/workshops/admin/reviews/{id}/approve:
 *   patch:
 *     summary: Update review approval status
 *     description: Approve or hide a review
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isApproved]
 *             properties:
 *               isApproved:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Review approval status updated
 */
router.patch('/admin/reviews/:id/approve', requireRole('ADMIN'), workshopReviewController.updateReviewApproval);

/**
 * @swagger
 * /api/workshops/admin/reviews/{id}/response:
 *   post:
 *     summary: Add workshop response to review
 *     description: Add an official response from the workshop to a review
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: string
 *               responseAr:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response added successfully
 */
router.post('/admin/reviews/:id/response', requireRole('ADMIN'), workshopReviewController.addWorkshopResponse);

/**
 * @swagger
 * /api/workshops/admin/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     description: Permanently delete a review
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 */
router.delete('/admin/reviews/:id', requireRole('ADMIN'), workshopReviewController.deleteReview);

// ================================================================================================
// WORKSHOP IMAGES
// ================================================================================================

/**
 * @swagger
 * /api/workshops/{id}/logo:
 *   post:
 *     summary: Upload workshop logo
 *     description: Upload a logo image for a workshop (Admin only)
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
 *       400:
 *         description: Invalid file type or no file uploaded
 */
router.post('/:id/logo', requireRole('ADMIN'), upload.single('file'), workshopImageController.uploadLogo);

/**
 * @swagger
 * /api/workshops/{id}/images:
 *   post:
 *     summary: Upload workshop images
 *     description: Upload multiple images for a workshop (max 10 total, Admin only)
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *       400:
 *         description: Invalid file type, no files, or limit exceeded
 */
router.post('/:id/images', requireRole('ADMIN'), upload.array('files', 10), workshopImageController.uploadImages);

/**
 * @swagger
 * /api/workshops/{id}/images/{imageIndex}:
 *   delete:
 *     summary: Delete workshop image
 *     description: Delete a specific image by index (Admin only)
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imageIndex
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       400:
 *         description: Invalid image index
 */
router.delete('/:id/images/:imageIndex', requireRole('ADMIN'), workshopImageController.deleteImage);

/**
 * @swagger
 * /api/workshops/{id}/logo:
 *   delete:
 *     summary: Delete workshop logo
 *     description: Delete the workshop logo (Admin only)
 *     tags: [1. الورش المعتمدة (Certified Workshops)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logo deleted successfully
 *       400:
 *         description: Workshop has no logo
 */
router.delete('/:id/logo', requireRole('ADMIN'), workshopImageController.deleteLogo);

// ================================================================================================
// WORKSHOP SERVICES (Pricing)
// ================================================================================================

/**
 * @swagger
 * /api/workshops/{id}/services:
 *   get:
 *     summary: Get workshop services (list for booking)
 *     description: |
 *       Retrieve all active services offered by a certified workshop (id, name, price, duration).
 *       Use these IDs in POST /api/bookings with workshopId + workshopServiceIds to book workshop-specific services.
 *       قائمة خدمات الورشة المعتمدة (للعميل) — استخدم معرفات الخدمات في حجز ورشة مع workshopServiceIds.
 *       **رحلة أكفيك:** خطوة WORKSHOP_BOOKING — بعد POST /api/bookings ثم PATCH .../link.
 *     tags: [1. الورش المعتمدة (Certified Workshops), Bookings, Akfeek Journey]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Workshop ID
 *     responses:
 *       200:
 *         description: List of workshop services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         description: CertifiedWorkshopService ID (use in workshopServiceIds when booking)
 *                       workshopId:
 *                         type: string
 *                         format: uuid
 *                       serviceType:
 *                         type: string
 *                         enum: [GENERAL, MAINTENANCE, REPAIR, INSPECTION, OTHER]
 *                       name:
 *                         type: string
 *                       nameAr:
 *                         type: string
 *                         nullable: true
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       price:
 *                         type: number
 *                         format: double
 *                       currency:
 *                         type: string
 *                         example: SAR
 *                       estimatedDuration:
 *                         type: integer
 *                         nullable: true
 *                         description: Duration in minutes
 *                       isActive:
 *                         type: boolean
 *       404:
 *         description: Workshop not found
 */
router.get('/:id/services',                     workshopServiceController.getServices);
router.post('/:id/services',                    requireRole('ADMIN'), workshopServiceController.addService);
router.put('/:id/services/:svcId',              requireRole('ADMIN'), workshopServiceController.updateService);
router.delete('/:id/services/:svcId',           requireRole('ADMIN'), workshopServiceController.removeService);

module.exports = router;
