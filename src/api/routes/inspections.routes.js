const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

/**
 * @swagger
 * tags:
 *   name: Inspections
 *   description: Vehicle inspections (Ekfik model) - فحص المركبات
 */

router.use(authenticate);

/**
 * @swagger
 * /api/inspections:
 *   get:
 *     summary: List all inspections
 *     description: Retrieve a list of vehicle inspections (Admin/Technician only)
 *     tags: [Inspections]
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
 * /api/inspections/{id}:
 *   get:
 *     summary: Get inspection by ID
 *     description: Retrieve details of a specific inspection
 *     tags: [Inspections]
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

