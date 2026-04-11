const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const { upload: uploadServiceImage } = require('../../utils/serviceImageUpload');

// Public access for listing services (or auth required if business rule dictates)
// For now, allow authenticated users to view
router.use(authMiddleware);

// Upload service image (must be before /:id)
router.post('/upload-image', requireRole(['ADMIN', 'VENDOR']), uploadServiceImage.single('file'), serviceController.uploadImage);

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all services
 *     description: |
 *       Retrieve a list of all available services with filtering.
 *       **ورش الغسيل (Car Wash):** استخدم category=CLEANING لخدمات الغسيل، أو vendorId={id} لخدمات فيندور غسيل معيّن.
 *       **العناية الشاملة:** استخدم category=COMPREHENSIVE_CARE أو vendorId=me (مع تسجيل دخول الفيندور).
 *       **الورش المعتمدة:** استخدم category=CERTIFIED_WORKSHOP
 *       **الورش المتنقلة:** استخدم category=MAINTENANCE
 *     tags: [Services, 2. ورش الغسيل (Car Wash), 3. العناية الشاملة (Comprehensive Care), 4. الورش المعتمدة (Certified Workshop), 5. الورش المتنقلة (Mobile Workshop)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [CLEANING, MAINTENANCE, REPAIR, EMERGENCY, CUSTOMIZATION, COMPREHENSIVE_CARE]
 *         description: CLEANING = خدمات الغسيل، COMPREHENSIVE_CARE = العناية الشاملة
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *         description: تصفية بخدمات فيندور (uuid) أو "me" للفيندور الحالي
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [FIXED, CATALOG, EMERGENCY]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of services retrieved
 */
router.get('/', serviceController.getAllServices);

const serviceCatalogService = require('../../services/service.service');

/**
 * @swagger
 * /api/services/car-wash:
 *   get:
 *     summary: Get all car wash services
 *     description: Returns all active services with category CLEANING (ورش الغسيل)
 *     tags: [Services, 2. ورش الغسيل (Car Wash)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *         description: Optional filter by vendor ID, or 'all' for all vendors
 *     responses:
 *       200:
 *         description: List of car wash services
 */
router.get('/car-wash', async (req, res, next) => {
  try {
    const { vendorId } = req.query;
    const filters = { category: 'CLEANING' };
    if (vendorId && vendorId !== 'all') filters.vendorId = vendorId;
    const services = await serviceCatalogService.getAllServices(filters, req.user);
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/services/car-wash/{vendorId}:
 *   get:
 *     summary: Get car wash services for specific vendor
 *     description: Returns all active CLEANING services for a specific car wash vendor
 *     tags: [Services, 2. ورش الغسيل (Car Wash)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID (UUID)
 *     responses:
 *       200:
 *         description: List of car wash services for this vendor
 */
router.get('/car-wash/:vendorId', async (req, res, next) => {
  try {
    const services = await serviceCatalogService.getAllServices({ 
      category: 'CLEANING', 
      isActive: 'true',
      vendorId: req.params.vendorId 
    }, req.user);
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/services/comprehensive-care:
 *   get:
 *     summary: Get all comprehensive care services
 *     description: Returns all active services with category COMPREHENSIVE_CARE (العناية الشاملة)
 *     tags: [Services, 3. العناية الشاملة (Comprehensive Care)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of comprehensive care services
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   name: "Premium Polish"
 *                   nameAr: "تلميع فاخر"
 *                   category: "COMPREHENSIVE_CARE"
 *                   type: "CATALOG"
 *                   isActive: true
 *                   estimatedDuration: 120
 */
router.get('/comprehensive-care', async (req, res, next) => {
  try {
    const { vendorId } = req.query;
    const filters = { category: 'COMPREHENSIVE_CARE' };
    if (vendorId && vendorId !== 'all') filters.vendorId = vendorId;
    const services = await serviceCatalogService.getAllServices(filters, req.user);
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/services/workshop:
 *   get:
 *     summary: Get all certified workshop services
 *     description: Returns all active services with category CERTIFIED_WORKSHOP (الورش المعتمدة)
 *     tags: [Services, 4. الورش المعتمدة (Certified Workshop)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of certified workshop services
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   name: "Oil Change"
 *                   nameAr: "تغيير زيت"
 *                   category: "CERTIFIED_WORKSHOP"
 *                   type: "CATALOG"
 *                   isActive: true
 *                   estimatedDuration: 30
 */
router.get('/workshop', async (req, res, next) => {
  try {
    const { vendorId } = req.query;
    const filters = { category: 'CERTIFIED_WORKSHOP' };
    if (vendorId && vendorId !== 'all') filters.vendorId = vendorId;
    const services = await serviceCatalogService.getAllServices(filters, req.user);
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/services/mobile-workshop:
 *   get:
 *     summary: Get all mobile workshop services
 *     description: Returns all active services with category MAINTENANCE (الورش المتنقلة)
 *     tags: [Services, 5. الورش المتنقلة (Mobile Workshop)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *         description: Optional filter by vendor ID
 *     responses:
 *       200:
 *         description: List of mobile workshop services
 */
router.get('/mobile-workshop', async (req, res, next) => {
  try {
    const { vendorId } = req.query;
    const filters = { category: 'MAINTENANCE' };
    if (vendorId && vendorId !== 'all') filters.vendorId = vendorId;
    const services = await serviceCatalogService.getAllServices(filters, req.user);
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/services/mobile-workshop:
 *   get:
 *     summary: Get all mobile workshop services
 *     description: Returns all active services with category MAINTENANCE (الورش المتنقلة)
 *     tags: [Services, 5. الورش المتنقلة (Mobile Workshop)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of mobile workshop services
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   name: "Mobile Oil Change"
 *                   nameAr: "تغيير زيت متنقل"
 *                   category: "MAINTENANCE"
 *                   type: "MOBILE_CAR_SERVICE"
 *                   isActive: true
 *                   estimatedDuration: 45
 */
router.get('/mobile-workshop', async (req, res, next) => {
  try {
    const { vendorId } = req.query;
    const filters = { category: 'MAINTENANCE', isActive: 'true' };
    if (vendorId && vendorId !== 'all') filters.vendorId = vendorId;
    const services = await serviceCatalogService.getAllServices(filters, req.user);
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/services/:id/available-slots?date=YYYY-MM-DD
 * Returns available time slots for Comprehensive Care booking (no double-book).
 */
router.get('/:id/available-slots', serviceController.getAvailableSlots);

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Get service details
 *     tags: [Services]
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
 *         description: Service details retrieved
 *       404:
 *         description: Service not found
 */
router.get('/:id', serviceController.getServiceById);

// Admin routes
/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create new service (Admin)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, category]
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               category:
 *                 type: string
 *               estimatedDuration:
 *                 type: integer
 *               pricing:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     vehicleSize:
 *                       type: string
 *                     basePrice:
 *                       type: number
 *     responses:
 *       201:
 *         description: Service created
 */
// Admin or Vendor (Vendor can only create COMPREHENSIVE_CARE – enforced in service)
router.post('/', requireRole(['ADMIN', 'VENDOR']), serviceController.createService);

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Update service (Admin)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Service updated
 */
router.put('/:id', requireRole(['ADMIN', 'VENDOR']), serviceController.updateService);

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Delete/Deactivate service (Admin)
 *     tags: [Services]
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
 *         description: Service deleted
 */
router.delete('/:id', requireRole(['ADMIN', 'VENDOR']), serviceController.deleteService);

module.exports = router;
