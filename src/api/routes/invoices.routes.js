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
 *     description: |
 *       Get paginated list of invoices. Admin only.
 *       قائمة الفواتير مع الصفحات - للمسؤول فقط.
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         description: Filter by invoice status - تصفية حسب الحالة
 *         schema:
 *           type: string
 *           enum: [DRAFT, PENDING, PAID, PARTIALLY_PAID, CANCELLED]
 *     responses:
 *       200:
 *         description: List of invoices - قائمة الفواتير
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: array, items: { type: object } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/', requireRole('ADMIN'), invoiceController.getAllInvoices);

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     description: |
 *       Get single invoice details by ID or by bookingId. Admin only.
 *       تفاصيل فاتورة بالمعرف أو معرف الحجز - للمسؤول فقط.
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Invoice ID or Booking ID - معرف الفاتورة أو الحجز
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Invoice details - تفاصيل الفاتورة
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object, description: Invoice with booking, lineItems, payments }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', requireRole('ADMIN'), invoiceController.getInvoiceById);

/**
 * @swagger
 * /api/invoices/{id}/mark-paid:
 *   patch:
 *     summary: Mark invoice as paid (Admin)
 *     description: |
 *       Mark an invoice as paid. Creates payment record, credits vendor wallet, awards customer points.
 *       تحديد الفاتورة كمدفوعة - يسجل الدفع ويودع رصيد الفيندور ويمنح النقاط للعميل.
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Invoice ID - معرف الفاتورة
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [CARD, MADA, CASH, WALLET, BANK_TRANSFER]
 *                 description: Payment method - طريقة الدفع
 *               paidAt:
 *                 type: string
 *                 format: date-time
 *                 description: Payment date - تاريخ الدفع
 *     responses:
 *       200:
 *         description: Invoice marked as paid - تم تحديد الفاتورة كمدفوعة
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *                 payment: { type: object }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.patch('/:id/mark-paid', requireRole('ADMIN'), invoiceController.markInvoicePaid);

module.exports = router;
