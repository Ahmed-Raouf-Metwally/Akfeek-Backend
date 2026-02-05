const express = require('express');
const router = express.Router();
const workshopController = require('../controllers/workshop.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

router.use(authMiddleware);

// Customer endpoints
/**
 * @swagger
 * /api/workshops:
 *   get:
 *     summary: Get all certified workshops
 *     description: Retrieve a list of active and verified workshops with optional filtering
 *     tags: [Certified Workshops]
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
 */
router.get('/', workshopController.getAllWorkshops);

/**
 * @swagger
 * /api/workshops/{id}:
 *   get:
 *     summary: Get workshop details by ID
 *     description: Retrieve detailed information about a specific certified workshop
 *     tags: [Certified Workshops]
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
 *     tags: [Certified Workshops - Admin]
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
 *     tags: [Certified Workshops - Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, city, address, phone, latitude, longitude, services]
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
 *               latitude:
 *                 type: number
 *                 example: 24.7136
 *               longitude:
 *                 type: number
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
 *     tags: [Certified Workshops - Admin]
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
 *     tags: [Certified Workshops - Admin]
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
 *     tags: [Certified Workshops - Admin]
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

module.exports = router;
