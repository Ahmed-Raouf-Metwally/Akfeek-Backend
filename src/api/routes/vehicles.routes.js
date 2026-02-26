const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/vehicles/brands:
 *   get:
 *     summary: Get vehicle brands catalog
 *     description: |
 *       Get available vehicle brands (Toyota, BMW, Mercedes, etc.)
 *       
 *       الحصول على العلامات التجارية للمركبات المتاحة
 *     tags: [📱 Customer | Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle brands list
 */
router.get('/brands', vehicleController.getVehicleBrands);

/**
 * @swagger
 * /api/vehicles/brands/{brandId}/models:
 *   get:
 *     summary: Get vehicle models for a brand
 *     description: |
 *       Get all available models for a specific brand
 *       
 *       الحصول على موديلات مركبة محددة
 *     tags: [📱 Customer | Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand ID
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [SEDAN, HATCHBACK, COUPE, SMALL_SUV, LARGE_SEDAN, SUV, CROSSOVER, TRUCK, VAN, BUS]
 *         description: Filter by vehicle type
 *     responses:
 *       200:
 *         description: Vehicle models list
 */
router.get('/brands/:brandId/models', vehicleController.getVehicleModels);

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Get my vehicles
 *     description: |
 *       Get all vehicles registered to current user
 *       
 *       الحصول على جميع مركبات المستخدم
 *     tags: [📱 Customer | Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicles list retrieved
 */
router.get('/', vehicleController.getMyVehicles);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Add new vehicle
 *     description: |
 *       Register a new vehicle to current user
 *       
 *       إضافة مركبة جديدة
 *     tags: [📱 Customer | Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleModelId
 *             properties:
 *               vehicleModelId:
 *                 type: string
 *                 description: Vehicle model ID from catalog
 *               plateLettersAr:
 *                 type: string
 *                 example: "ع س س"
 *                 description: Arabic letters on plate (optional)
 *               plateLettersEn:
 *                 type: string
 *                 example: "SEJ"
 *                 description: English letters on plate (optional)
 *               plateDigits:
 *                 type: string
 *                 example: "7415"
 *                 description: Plate number digits (required if plateNumber not provided)
 *               plateRegion:
 *                 type: string
 *                 example: "K"
 *                 description: Region code (optional)
 *               plateNumber:
 *                 type: string
 *                 example: "ع س س 7415"
 *                 description: Full plate number (alternative to structured fields)
 *               color:
 *                 type: string
 *                 example: "White"
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *                 description: Set as default vehicle
 *     responses:
 *       201:
 *         description: Vehicle added successfully
 *       409:
 *         description: Plate number already registered
 */
router.post('/', vehicleController.addVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [📱 Customer | Vehicles]
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
 *         description: Vehicle retrieved
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', vehicleController.getVehicleById);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Update vehicle
 *     description: |
 *       Update vehicle information
 *       
 *       تحديث معلومات المركبة
 *     tags: [📱 Customer | Vehicles]
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
 *               plateNumber:
 *                 type: string
 *               color:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *                 description: Set as default/primary vehicle
 *     responses:
 *       200:
 *         description: Vehicle updated
 */
router.put('/:id', vehicleController.updateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Delete vehicle
 *     description: |
 *       Remove vehicle from user account
 *       
 *       حذف المركبة
 *     tags: [📱 Customer | Vehicles]
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
 *         description: Vehicle deleted
 */
router.delete('/:id', vehicleController.deleteVehicle);

/**
 * @swagger
 * /api/vehicles/{id}/primary:
 *   patch:
 *     summary: Set as primary vehicle
 *     description: |
 *       Set this vehicle as the primary vehicle for bookings
 *       
 *       تعيين كمركبة رئيسية
 *     tags: [📱 Customer | Vehicles]
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
 *         description: Primary vehicle updated
 */
router.patch('/:id/primary', vehicleController.setPrimary);

module.exports = router;
