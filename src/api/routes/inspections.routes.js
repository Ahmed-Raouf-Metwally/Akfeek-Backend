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
 *     summary: List inspection reports (paginated)
 *     description: أدمن أو فني — query page, limit, status
 *     tags: [Inspections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 */
// Admin and Technicians can list. By id: also customer (own booking) — see controller check.
router.get('/', authorize(['ADMIN', 'TECHNICIAN']), inspectionController.list);

/**
 * @swagger
 * /api/inspections/{id}:
 *   get:
 *     summary: Get inspection report by ID
 *     description: أدمن/فني؛ أو عميل إن كان التقرير لحجزه
 *     tags: [Inspections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.get('/:id', authorize(['ADMIN', 'TECHNICIAN', 'CUSTOMER']), inspectionController.getById);

module.exports = router;
