const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const productController = require('../controllers/product.controller');

router.use(authMiddleware);

/**
 * GET /api/products - List all products (Admin). Paginated.
 * Query: page, limit, category, activeOnly
 */
router.get('/', requireRole('ADMIN'), productController.getAllProducts);

/**
 * GET /api/products/:id - Get one product by id (Admin).
 */
router.get('/:id', requireRole('ADMIN'), productController.getProductById);

module.exports = router;
