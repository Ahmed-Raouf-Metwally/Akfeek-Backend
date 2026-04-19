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
 *         isFavorite:
 *           type: boolean
 *           description: |
 *             GET `/api/auto-parts/{id}` only — present when the request includes a valid Bearer token.
 *             `true` if the part is in the authenticated user's wishlist (المفضلة).
 * 
 *     AutoPartWishlistPartSummary:
 *       type: object
 *       description: Auto part fields returned inside each wishlist row (summary for lists).
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         sku:
 *           type: string
 *         name:
 *           type: string
 *         nameAr:
 *           type: string
 *           nullable: true
 *         price:
 *           type: number
 *         stockQuantity:
 *           type: integer
 *         isActive:
 *           type: boolean
 *         isApproved:
 *           type: boolean
 *         badges:
 *           type: array
 *           items:
 *             type: string
 *         primaryImageUrl:
 *           type: string
 *           nullable: true
 *         brandLogoUrl:
 *           type: string
 *           nullable: true
 *         category:
 *           type: object
 *           nullable: true
 *           properties:
 *             id: { type: string, format: uuid }
 *             name: { type: string }
 *             nameAr: { type: string, nullable: true }
 *         brandRef:
 *           type: object
 *           nullable: true
 *           properties:
 *             id: { type: string, format: uuid }
 *             name: { type: string }
 *             nameAr: { type: string, nullable: true }
 *             logo: { type: string, nullable: true }
 * 
 *     AutoPartWishlistItem:
 *       type: object
 *       properties:
 *         favoriteId:
 *           type: string
 *           format: uuid
 *           description: Row id in AutoPartFavorite (for debugging; remove uses autoPartId).
 *         createdAt:
 *           type: string
 *           format: date-time
 *         autoPart:
 *           $ref: '#/components/schemas/AutoPartWishlistPartSummary'
 * 
 *     AutoPartFavoritesListData:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AutoPartWishlistItem'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 * 
 *     AddAutoPartFavoriteBody:
 *       type: object
 *       required:
 *         - autoPartId
 *       properties:
 *         autoPartId:
 *           type: string
 *           format: uuid
 *           description: Auto part to add to the user's wishlist (idempotent).
 * 
 *     AddAutoPartFavoriteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Added to favorites
 *         messageAr:
 *           type: string
 *           example: تمت الإضافة إلى المفضلة
 *         data:
 *           $ref: '#/components/schemas/AutoPartWishlistItem'
 * 
 *     RemoveAutoPartFavoriteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         messageAr:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             removed:
 *               type: boolean
 *               example: true
 *             autoPartId:
 *               type: string
 *               format: uuid
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
 *
 *     VendorWorkshopOffer:
 *       type: object
 *       description: Vendor-defined offer or prepaid bundle for a certified workshop
 *       properties:
 *         id: { type: string, format: uuid }
 *         workshopId: { type: string, format: uuid }
 *         offerType:
 *           type: string
 *           enum: [PERCENT_DISCOUNT, PREPAID_BUNDLE]
 *         title: { type: string }
 *         titleAr: { type: string, nullable: true }
 *         description: { type: string, nullable: true }
 *         descriptionAr: { type: string, nullable: true }
 *         validFrom: { type: string, format: date-time }
 *         validUntil: { type: string, format: date-time }
 *         isActive: { type: boolean }
 *         sortOrder: { type: integer }
 *         vehicleModelIds:
 *           type: array
 *           items: { type: string, format: uuid }
 *           nullable: true
 *           description: Empty/null = all models
 *         discountScope:
 *           type: string
 *           enum: [ALL_SERVICES, ONE_SERVICE]
 *           nullable: true
 *         discountPercent: { type: integer, minimum: 1, maximum: 100, nullable: true }
 *         certifiedWorkshopServiceId: { type: string, format: uuid, nullable: true }
 *         paidSlots: { type: integer, nullable: true }
 *         bonusSlots: { type: integer, nullable: true }
 *         bundlePrice: { type: number, nullable: true }
 *         validityDays: { type: integer, nullable: true }
 *
 *     UserWorkshopOfferPurchase:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         userId: { type: string, format: uuid }
 *         offerId: { type: string, format: uuid }
 *         workshopId: { type: string, format: uuid }
 *         totalSlots: { type: integer }
 *         usedSlots: { type: integer }
 *         expiresAt: { type: string, format: date-time }
 *         status:
 *           type: string
 *           enum: [PENDING_PAYMENT, ACTIVE, DEPLETED, EXPIRED, CANCELLED]
 *         purchaseBookingId: { type: string, format: uuid, nullable: true }
 *         invoiceId: { type: string, format: uuid, nullable: true }
 */
