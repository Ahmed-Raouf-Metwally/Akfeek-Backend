const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const paymentController = require('../controllers/payment.controller');

router.use(authMiddleware);

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: List payments
 *     description: |
 *       عميل يرى مدفوعاته فقط. أدمن أو موظف بصلاحية payments يرى الكل.
 *       Query page, limit, status (e.g. COMPLETED).
 *     tags: [Payments]
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
 *         description: Paginated payments
 *       401:
 *         description: Unauthorized
 */
router.get('/', paymentController.list);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
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
router.get('/:id', paymentController.getById);

module.exports = router;
