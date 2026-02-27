const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const invoiceController = require('../controllers/invoice.controller');

router.use(authMiddleware);

/**
 * GET /api/invoices - List all invoices (Admin). Paginated.
 * Query: page, limit, status
 */
router.get('/', requireRole('ADMIN'), invoiceController.getAllInvoices);

/**
 * GET /api/invoices/:id - Get one invoice by id (Admin).
 */
router.get('/:id', requireRole('ADMIN'), invoiceController.getInvoiceById);

module.exports = router;
