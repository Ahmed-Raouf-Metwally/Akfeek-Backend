const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const { requireAdminOrPermission } = require('../middlewares/permission.middleware');
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
router.get('/', requireAdminOrPermission('invoices'), invoiceController.getAllInvoices);

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     description: |
 *       Get single invoice details by ID or by bookingId. Admin only.
 *       تفاصيل فاتورة بالمعرف أو معرف الحجز - للمسؤول فقط. تتضمن بيانات الفاتورة وبيان الفيندور صاحبها (vendor, vendorSummary) — ورشة أو خدمة أو ونش سحب.
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
 *         description: Invoice details - تفاصيل الفاتورة (مع vendor و vendorSummary)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object, description: Invoice with booking, lineItems, payments, vendor, vendorSummary (بيان الفيندور صاحب الفاتورة) }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/invoices/my/{id}:
 *   get:
 *     summary: Get my invoice (Customer) — جلب فاتورتي
 *     description: |
 *       العميل يجلب فاتورته بالمعرف (invoice id أو booking id). يُستخدم في فلو العناية الشاملة وورش الغسيل بعد الحجز.
 *       Customer retrieves their invoice by id or bookingId. Used after booking in Comprehensive Care and Car Wash flows.
 *     tags: [Invoices, 2. ورش الغسيل (Car Wash), 3. العناية الشاملة (Comprehensive Care)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Invoice ID or Booking ID — معرف الفاتورة أو الحجز
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Invoice details with vendorSummary
 *       403:
 *         description: Not authorized to view this invoice
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/my/:id', invoiceController.getMyInvoice);

/**
 * @swagger
 * /api/invoices/my/{id}/pay:
 *   patch:
 *     summary: Pay my invoice (Customer) — دفع فاتورتي
 *     description: |
 *       العميل يدفع فاتورته (method: CARD أو WALLET). يُستخدم في فلو العناية الشاملة وورش الغسيل بعد الحجز.
 *       Customer pays their invoice. Used in Comprehensive Care and Car Wash flows after booking.
 *     tags: [Invoices, 2. ورش الغسيل (Car Wash), 3. العناية الشاملة (Comprehensive Care)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Invoice ID — معرف الفاتورة
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [CARD, WALLET]
 *                 description: طريقة الدفع
 *     responses:
 *       200:
 *         description: Payment successful — تم الدفع بنجاح
 *       400:
 *         description: Invalid amount or method
 *       403:
 *         description: Not authorized to pay this invoice
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch('/my/:id/pay', invoiceController.customerPayInvoice);

/**
 * @swagger
 * /api/invoices/vendor/mine:
 *   get:
 *     summary: List my invoices (Vendor) — فواتير الفيندور
 *     description: |
 *       الفيندور يجلب قائمة الفواتير المرتبطة بحجوزاته فقط (ورشة معتمدة، ورشة متنقلة، خدمات عناية/غسيل، ونش).
 *       Vendor gets paginated list of invoices for bookings that belong to them.
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
 *         schema: { type: string, enum: [DRAFT, PENDING, PAID, PARTIALLY_PAID, CANCELLED] }
 *     responses:
 *       200:
 *         description: List of vendor invoices with customer, booking, pagination
 *       403:
 *         description: Vendor profile not found
 */
router.get('/vendor/mine', requireRole('VENDOR'), invoiceController.getMyInvoicesAsVendor);
router.get('/vendor/mine/:id', requireRole('VENDOR'), invoiceController.getInvoiceByIdForVendor);

router.get('/:id', requireAdminOrPermission('invoices'), invoiceController.getInvoiceById);

/**
 * @swagger
 * /api/invoices/{id}/mark-paid:
 *   patch:
 *     summary: Mark invoice as paid (Admin) — إيداع حصة الفيندور وخصم عمولة المنصة
 *     description: |
 *       تحديد الفاتورة كمدفوعة. يسجل الدفع، يودع حصة الفيندور في محفظته ويخصم عمولة المنصة (نسبة مسجلة وقت الحجز — لا تتأثر الحجوزات القديمة بتغيير النسبة)، ويمنح النقاط للعميل.
 *       لحجز السحب/الوينش: بعد الدفع يُرسل حدث booking:ready للعميل وفيندور الوينش فيفتح السوكت للتتبع والمحادثة.
 *     tags: [Invoices, 4. Towing]
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
router.patch('/:id/mark-paid', requireAdminOrPermission('invoices'), invoiceController.markInvoicePaid);

module.exports = router;
