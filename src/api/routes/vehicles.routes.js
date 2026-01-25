const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /vehicles/masters:
 *   get:
 *     summary: Get vehicle masters catalog
 *     description: |
 *       Get available vehicle makes/models for selection
 *       
 *       الحصول على كتالوج المركبات المتاحة
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: make
 *         schema:
 *           type: string
 *         description: Filter by make (Toyota, BMW, etc.)
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *       - in: query
 *         name: yearFrom
 *         schema:
 *           type: integer
 *       - in: query
 *         name: yearTo
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [SEDAN, SUV, TRUCK, SPORTS, LUXURY]
 *     responses:
 *       200:
 *         description: Vehicle masters list
 */
router.get('/masters', vehicleController.getVehicleMasters);

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: Get my vehicles
 *     description: |
 *       Get all vehicles registered to current user
 *       
 *       الحصول على جميع مركبات المستخدم
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicles list retrieved
 */
router.get('/', vehicleController.getMyVehicles);

/**
 * @swagger
 * /vehicles:
 *   post:
 *     summary: Add new vehicle
 *     description: |
 *       Register a new vehicle to current user
 *       
 *       إضافة مركبة جديدة
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleMasterId
 *               - plateNumber
 *             properties:
 *               vehicleMasterId:
 *                 type: string
 *                 description: Vehicle master ID from catalog
 *               plateNumber:
 *                 type: string
 *                 example: ABC 1234
 *               color:
 *                 type: string
 *                 example: White
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
 * /vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
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
 * /vehicles/{id}:
 *   put:
 *     summary: Update vehicle
 *     description: |
 *       Update vehicle information
 *       
 *       تحديث معلومات المركبة
 *     tags: [Vehicles]
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
 * /vehicles/{id}:
 *   delete:
 *     summary: Delete vehicle
 *     description: |
 *       Remove vehicle from user account
 *       
 *       حذف المركبة
 *     tags: [Vehicles]
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
 * /vehicles/{id}/primary:
 *   patch:
 *     summary: Set as primary vehicle
 *     description: |
 *       Set this vehicle as the primary vehicle for bookings
 *       
 *       تعيين كمركبة رئيسية
 *     tags: [Vehicles]
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
