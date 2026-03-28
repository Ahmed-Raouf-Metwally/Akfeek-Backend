const express = require('express');
const router = express.Router();
const supplyController = require('../controllers/supply.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

/**
 * @swagger
 * /api/supplies:
 *   get:
 *     summary: List supply requests
 *     description: أدمن، مورد، أو فني — حسب منطق المتحكم
 *     tags: [Supply Requests]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', authorize('ADMIN', 'SUPPLIER', 'TECHNICIAN'), supplyController.list);

/**
 * @swagger
 * /api/supplies/{id}:
 *   get:
 *     summary: Get supply request by ID
 *     tags: [Supply Requests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not found
 */
router.get('/:id', authorize('ADMIN', 'SUPPLIER', 'TECHNICIAN'), supplyController.getById);

module.exports = router;
