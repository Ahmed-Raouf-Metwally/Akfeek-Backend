/**
 * @swagger
 * components:
 *   schemas:
 *     VendorProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         businessName:
 *           type: string
 *         businessNameAr:
 *           type: string
 *         description:
 *           type: string
 *         descriptionAr:
 *           type: string
 *         status:
 *           type: string
 *           enum: [PENDING_APPROVAL, ACTIVE, SUSPENDED, REJECTED]
 *         isActive:
 *           type: boolean
 *         logo:
 *           type: string
 *         contactEmail:
 *           type: string
 *         contactPhone:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 * 
 *     AutoPartCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         nameAr:
 *           type: string
 *         slug:
 *           type: string
 *         parentId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         icon:
 *           type: string
 *         isActive:
 *           type: boolean
 * 
 *     AutoPart:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         nameAr:
 *           type: string
 *         sku:
 *           type: string
 *         brand:
 *           type: string
 *         categoryId:
 *           type: string
 *           format: uuid
 *         vendorId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         price:
 *           type: number
 *         stockQuantity:
 *           type: integer
 *         isApproved:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         images:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AutoPartImage'
 *         badges:
 *           type: array
 *           items:
 *             type: string
 *           nullable: true
 * 
 *     AutoPartImage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         url:
 *           type: string
 *         isPrimary:
 *           type: boolean
 * 
 *     AutoPartCompatibility:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         autoPartId:
 *           type: string
 *           format: uuid
 *         vehicleModelId:
 *           type: string
 *           format: uuid
 *         yearRange:
 *           type: string
 *
 *     MaintenanceRecord:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: '2025-05-10'
 *         type:
 *           type: string
 *           enum:
 *             - Oil Change
 *             - Engine Repair
 *             - Brakes
 *             - Tires
 *             - A/C
 *             - Electrical
 *             - Suspension
 *             - Body Repair
 *             - Painting
 *             - Diagnosis
 *             - Battery
 *             - Transmission
 *             - Detailing
 *             - Glass
 *             - General Maintenance
 *             - Other
 *           example: Oil Change
 *         workshopName:
 *           type: string
 *           nullable: true
 *           example: اسم الورشة
 *         cost:
 *           type: number
 *           nullable: true
 *           example: 24
 *         note:
 *           type: string
 *           nullable: true
 *           example: ''
 *
 *     MaintenanceRecordInput:
 *       type: object
 *       required:
 *         - date
 *         - type
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: '2025-05-10'
 *         type:
 *           type: string
 *           enum:
 *             - Oil Change
 *             - Engine Repair
 *             - Brakes
 *             - Tires
 *             - A/C
 *             - Electrical
 *             - Suspension
 *             - Body Repair
 *             - Painting
 *             - Diagnosis
 *             - Battery
 *             - Transmission
 *             - Detailing
 *             - Glass
 *             - General Maintenance
 *             - Other
 *           example: Oil Change
 *         workshopName:
 *           type: string
 *           nullable: true
 *           example: اسم الورشة
 *         cost:
 *           type: number
 *           nullable: true
 *           example: 24
 *         nextMaintenanceDate:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: '2026-08-21'
 *         notes:
 *           type: string
 *           example: ''
 *
 *     VehicleDocumentsResponse:
 *       type: object
 *       properties:
 *         documents:
 *           type: array
 *           items:
 *             type: object
 *             additionalProperties: false
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [drivingLicense, registrationForm, insurance, inspectionReport]
 *               status:
 *                 type: string
 *                 enum: [expired, expiring, renewalRequired, renewed]
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               fileUrl:
 *                 type: string
 *                 nullable: true
 *         uploadOptions:
 *           type: array
 *           items:
 *             type: string
 *             enum: [drivingLicense, registrationForm, insurance, inspectionReport]
 *       example:
 *         documents:
 *           - type: drivingLicense
 *             status: renewed
 *             expiryDate: '2027-06-15'
 *             fileUrl: '/uploads/vehicle-documents/abc123.jpg'
 *           - type: registrationForm
 *             status: renewed
 *             expiryDate: '2028-01-01'
 *             fileUrl: null
 *           - type: insurance
 *             status: expiring
 *             expiryDate: '2026-04-20'
 *             fileUrl: '/uploads/vehicle-documents/def456.pdf'
 *           - type: inspectionReport
 *             status: renewalRequired
 *             expiryDate: null
 *             fileUrl: null
 *         uploadOptions:
 *           - drivingLicense
 *           - registrationForm
 *           - insurance
 *           - inspectionReport
 */
