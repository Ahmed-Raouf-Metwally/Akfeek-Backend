const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const invoiceController = require('../controllers/invoice.controller');

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice management - إدارة الفواتير
 */

router.use(authMiddleware);

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: List all invoices (Admin)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
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
 *         description: List of invoices
 */
router.get('/', requireRole('ADMIN'), invoiceController.getAllInvoices);

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID (Admin)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Invoice details
 */
router.get('/:id', requireRole('ADMIN'), invoiceController.getInvoiceById);

module.exports = router;

