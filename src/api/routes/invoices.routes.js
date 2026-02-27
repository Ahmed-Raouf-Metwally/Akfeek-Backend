const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const invoiceController = require('../controllers/invoice.controller');

router.use(authMiddleware);

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: List all invoices (Admin)
 *     tags: [📱 Customer | Invoices]
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
 *     tags: [📱 Customer | Invoices]
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

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Manually create invoice for a booking (Admin)
 *     tags: [⚙️ Admin | Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId]
 *             properties:
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Invoice created with subtotal, tax (VAT), discount, and total
 */
router.post('/', requireRole('ADMIN'), invoiceController.createInvoiceForBooking);

/**
 * @swagger
 * /api/invoices/{id}/pay:
 *   patch:
 *     summary: Mark invoice as paid (Admin)
 *     tags: [⚙️ Admin | Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [CASH, CARD, WALLET, APPLE_PAY, MADA, BANK_TRANSFER]
 *                 default: CASH
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Invoice marked as paid and Payment record created
 */
router.patch('/:id/pay', requireRole('ADMIN'), invoiceController.markInvoicePaid);

module.exports = router;

