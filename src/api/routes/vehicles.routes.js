const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const vehicleMaintenanceRecordController = require('../controllers/vehicleMaintenanceRecord.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const { requireAdminOrPermission } = require('../middlewares/permission.middleware');
const { upload } = require('../../utils/vehicleDocumentUpload');

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
 *     tags: [Vehicles]
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
 *     tags: [Vehicles]
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
 * /api/vehicles/admin/all:
 *   get:
 *     summary: Get all vehicles (Admin)
 *     description: "List all user vehicles with pagination. Query params: page, limit, userId, search"
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *         description: Filter by user ID
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search plate, color, email, name, brand/model
 *     responses:
 *       200:
 *         description: Paginated list of vehicles
 */
router.get('/admin/all', requireAdminOrPermission('vehicles'), vehicleController.getAllVehicles);

/**
 * @swagger
 * /api/vehicles:
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
 * /api/vehicles/car-profile-ui:
 *   get:
 *     summary: Get car profile UI screen response
 *     description: Returns only the fields visible in the provided car documents, maintenance history, add maintenance, and car profile screens.
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Minimal UI-shaped car profile payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required:
 *                 - drivingLicense
 *                 - insurance
 *                 - maintenanceRecords
 *                 - maintenanceForm
 *                 - car
 *               properties:
 *                 drivingLicense:
 *                   type: object
 *                   additionalProperties: false
 *                   required: [status, expiryDate]
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [expired, expiring, valid]
 *                       example: expiring
 *                     expiryDate:
 *                       type: string
 *                       format: date
 *                       example: '2020-03-15'
 *                 insurance:
 *                   type: object
 *                   additionalProperties: false
 *                   required: [status, expiryDate]
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [expired, expiring, valid]
 *                       example: expired
 *                     expiryDate:
 *                       type: string
 *                       format: date
 *                       example: '2020-03-15'
 *                 maintenanceRecords:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: false
 *                     required: [date, type, workshopName, cost]
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: '2025-05-10'
 *                       type:
 *                         type: string
 *                         example: تغيير زيت + فلتر
 *                       workshopName:
 *                         type: string
 *                         example: اسم الورشة
 *                       cost:
 *                         type: number
 *                         example: 24
 *                 maintenanceForm:
 *                   type: object
 *                   additionalProperties: false
 *                   required: [date, type, notes]
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: '2026-08-21'
 *                     type:
 *                       type: string
 *                       example: تغيير زيت + فلتر
 *                     notes:
 *                       type: string
 *                       example: ''
 *                 car:
 *                   type: object
 *                   additionalProperties: false
 *                   required: [brand, model, year, plateNumber, mileage, nextMaintenance]
 *                   properties:
 *                     brand:
 *                       type: string
 *                       example: هونداي
 *                     model:
 *                       type: string
 *                       example: إلنترا
 *                     year:
 *                       type: number
 *                       example: 2012
 *                     plateNumber:
 *                       type: string
 *                       example: م ص ح 7/15
 *                     mileage:
 *                       type: number
 *                       example: 125200
 *                     nextMaintenance:
 *                       type: object
 *                       additionalProperties: false
 *                       required: [type, date]
 *                       properties:
 *                         type:
 *                           type: string
 *                           example: تغيير زيت + فلتر
 *                         date:
 *                           type: string
 *                           format: date
 *                           example: '2026-08-21'
 *             example:
 *               drivingLicense:
 *                 status: expiring
 *                 expiryDate: '2020-03-15'
 *               insurance:
 *                 status: expired
 *                 expiryDate: '2020-03-15'
 *               maintenanceRecords:
 *                 - date: '2025-05-10'
 *                   type: تغيير زيت + فلتر
 *                   workshopName: اسم الورشة
 *                   cost: 24
 *                 - date: '2025-05-10'
 *                   type: تغيير زيت + فلتر
 *                   workshopName: اسم الورشة
 *                   cost: 24
 *                 - date: '2025-05-10'
 *                   type: تغيير زيت + فلتر
 *                   workshopName: اسم الورشة
 *                   cost: 24
 *                 - date: '2025-05-10'
 *                   type: تغيير زيت + فلتر
 *                   workshopName: اسم الورشة
 *                   cost: 24
 *               maintenanceForm:
 *                 date: '2026-08-21'
 *                 type: تغيير زيت + فلتر
 *                 notes: ''
 *               car:
 *                 brand: هونداي
 *                 model: إلنترا
 *                 year: 2012
 *                 plateNumber: م ص ح 7/15
 *                 mileage: 125200
 *                 nextMaintenance:
 *                   type: تغيير زيت + فلتر
 *                   date: '2026-08-21'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/car-profile-ui', vehicleController.getCarProfileUi);

/**
 * @swagger
 * /api/vehicles/{vehicleId}/documents:
 *   get:
 *     summary: Get vehicle documents data
 *     description: Returns car documents data exactly as shown in the UI
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               properties:
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: false
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [drivingLicense, registrationForm, insurance, inspectionReport]
 *                       status:
 *                         type: string
 *                         enum: [expiring, expired, renewalRequired, renewed]
 *                       expiryDate:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                       fileUrl:
 *                         type: string
 *                         nullable: true
 *                 uploadOptions:
 *                   type: array
 *                   items:
 *                     type: string
 *                     enum: [drivingLicense, registrationForm, insurance, inspectionReport]
 *             example:
 *               documents:
 *                 - type: drivingLicense
 *                   status: renewed
 *                   expiryDate: '2027-06-15'
 *                   fileUrl: '/uploads/vehicle-documents/abc.jpg'
 *                 - type: registrationForm
 *                   status: renewed
 *                   expiryDate: '2028-01-01'
 *                   fileUrl: null
 *                 - type: insurance
 *                   status: expiring
 *                   expiryDate: '2026-04-20'
 *                   fileUrl: '/uploads/vehicle-documents/def.pdf'
 *                 - type: inspectionReport
 *                   status: renewalRequired
 *                   expiryDate: null
 *                   fileUrl: null
 *               uploadOptions:
 *                 - drivingLicense
 *                 - registrationForm
 *                 - insurance
 *                 - inspectionReport
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:vehicleId/documents', vehicleController.getVehicleDocuments);

/**
 * @swagger
 * /api/vehicles/{vehicleId}/documents:
 *   post:
 *     summary: Create or update a vehicle document
 *     description: Creates or replaces a document (drivingLicense or insurance)
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, expiryDate]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [drivingLicense, registrationForm, insurance, inspectionReport]
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 example: '2027-06-15'
 *           example:
 *             type: insurance
 *             expiryDate: '2027-06-15'
 *     responses:
 *       201:
 *         description: Document created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleDocumentsResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:vehicleId/documents', vehicleController.createVehicleDocument);

/**
 * @swagger
 * /api/vehicles/{vehicleId}/documents/{type}:
 *   put:
 *     summary: Update vehicle document expiry date
 *     description: Updates the expiry date of an existing document
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [drivingLicense, registrationForm, insurance, inspectionReport]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [expiryDate]
 *             properties:
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 example: '2028-01-01'
 *     responses:
 *       200:
 *         description: Document updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleDocumentsResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:vehicleId/documents/:type', vehicleController.updateVehicleDocument);

/**
 * @swagger
 * /api/vehicles/{vehicleId}/documents/{type}:
 *   delete:
 *     summary: Delete vehicle document
 *     description: Deletes a document by type
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [drivingLicense, registrationForm, insurance, inspectionReport]
 *     responses:
 *       200:
 *         description: Document deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleDocumentsResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:vehicleId/documents/:type', vehicleController.deleteVehicleDocument);

/**
 * @swagger
 * /api/vehicles/{vehicleId}/documents/{type}/upload:
 *   post:
 *     summary: Upload vehicle document file
 *     description: Upload a document file (drivingLicense, registrationForm, insurance, or inspectionReport)
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [drivingLicense, registrationForm, insurance, inspectionReport]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file (JPEG, PNG, or PDF)
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleDocumentsResponse'
 *       400:
 *         description: No file uploaded or invalid file type
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:vehicleId/documents/:type/upload', upload.single('file'), vehicleController.uploadVehicleDocument);

/**
 * @swagger
 * /api/vehicles/upcoming-maintenance:
 *   get:
 *     summary: Get overdue and upcoming maintenance within 7 days
 *     description: Returns maintenance records where nextMaintenanceDate is overdue or within the next 7 days.
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming maintenance records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required:
 *                 - upcomingMaintenance
 *               properties:
 *                 upcomingMaintenance:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: false
 *                     required:
 *                       - date
 *                       - type
 *                       - workshopName
 *                       - cost
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: '2026-08-21'
 *                       type:
 *                         type: string
 *                         example: تغيير زيت + فلتر
 *                       workshopName:
 *                         type: string
 *                         example: اسم الورشة
 *                       cost:
 *                         type: number
 *                         example: 24
 *             example:
 *               upcomingMaintenance:
 *                 - date: '2026-08-21'
 *                   type: تغيير زيت + فلتر
 *                   workshopName: اسم الورشة
 *                   cost: 24
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/upcoming-maintenance', vehicleMaintenanceRecordController.listUpcoming);

/**
 * @swagger
 * /api/vehicles/{vehicleId}/maintenance/next:
 *   get:
 *     summary: Get next upcoming maintenance for a vehicle
 *     description: Returns only the nearest upcoming maintenance record
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Next upcoming maintenance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nextMaintenance:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: Oil Change
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: '2026-08-21'
 *             example:
 *               nextMaintenance:
 *                 type: Oil Change
 *                 date: '2026-08-21'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:vehicleId/maintenance/next', vehicleMaintenanceRecordController.getNextMaintenance);

/**
 * @swagger
 * /api/vehicles/{vehicleId}/maintenance-records:
 *   get:
 *     summary: List vehicle maintenance records
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Maintenance records for the vehicle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 maintenanceRecords:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MaintenanceRecord'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   post:
 *     summary: Create vehicle maintenance record
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceRecordInput'
 *           example:
 *             date: '2025-05-10'
 *             type: Oil Change
 *             workshopName: اسم الورشة
 *             cost: 24
 *             nextMaintenanceDate: '2026-08-21'
 *             notes: ''
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceRecordInput'
 *           example:
 *             date: '2025-05-10'
 *             type: Oil Change
 *             workshopName: اسم الورشة
 *             cost: 24
 *             nextMaintenanceDate: '2026-08-21'
 *             notes: ''
 *     responses:
 *       201:
 *         description: Maintenance record created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 maintenance:
 *                   $ref: '#/components/schemas/MaintenanceRecord'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router
  .route('/:vehicleId/maintenance-records')
  .get(vehicleMaintenanceRecordController.list)
  .post(vehicleMaintenanceRecordController.create);

/**
 * @swagger
 * /api/vehicles/{vehicleId}/maintenance-records/{recordId}:
 *   get:
 *     summary: Get vehicle maintenance record
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Maintenance record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 maintenance:
 *                   $ref: '#/components/schemas/MaintenanceRecord'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   put:
 *     summary: Update vehicle maintenance record
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceRecordInput'
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceRecordInput'
 *     responses:
 *       200:
 *         description: Maintenance record updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 maintenance:
 *                   $ref: '#/components/schemas/MaintenanceRecord'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Delete vehicle maintenance record
 *     tags: [Car Profile UI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Maintenance record deleted
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router
  .route('/:vehicleId/maintenance-records/:recordId')
  .get(vehicleMaintenanceRecordController.get)
  .put(vehicleMaintenanceRecordController.update)
  .delete(vehicleMaintenanceRecordController.delete);

/**
 * @swagger
 * /api/vehicles/{id}:
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
 * /api/vehicles/{id}:
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
 * /api/vehicles/{id}:
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
 * /api/vehicles/{id}/primary:
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
