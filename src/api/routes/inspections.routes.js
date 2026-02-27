const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

/**
 * @swagger
 * /api/inspections:
 *   get:
 *     summary: List all inspections
 *     description: Retrieve a list of vehicle inspections (Admin/Technician only)
 *     tags: [📱 Customer | Inspections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of inspections
 */
router.get('/', authorize('ADMIN', 'TECHNICIAN'), inspectionController.list);

/**
 * @swagger
 * /api/inspections:
 *   post:
 *     summary: Create inspection report
 *     description: Create a new vehicle inspection report (Technician only)
 *     tags: [📱 Customer | Inspections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId, mileage]
 *             properties:
 *               bookingId:
 *                 type: string
 *               mileage:
 *                 type: integer
 *               overallCondition:
 *                 type: string
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Inspection created
 */
router.post('/', authorize('TECHNICIAN', 'ADMIN'), inspectionController.create);

/**
 * @swagger
 * /api/inspections/{id}:
 *   put:
 *     summary: Update inspection report
 *     description: Update an existing inspection report or respond as customer
 *     tags: [📱 Customer | Inspections]
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
 *     responses:
 *       200:
 *         description: Inspection updated
 */
router.put('/:id', authorize('TECHNICIAN', 'ADMIN', 'CUSTOMER'), inspectionController.update);

/**
 * @swagger
 * /api/inspections/{id}:
 *   get:
 *     summary: Get inspection by ID
 *     description: Retrieve details of a specific inspection
 *     tags: [📱 Customer | Inspections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Inspection details
 *       404:
 *         description: Inspection not found
 */
router.get('/:id', authorize('ADMIN', 'TECHNICIAN', 'CUSTOMER'), inspectionController.getById);

module.exports = router;

