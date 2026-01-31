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
 */
