const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const cartController = require('../controllers/cart.controller');

router.use(authMiddleware);

/**
 * GET /api/cart - Get my cart (with items)
 */
router.get('/', cartController.getCart);

/**
 * POST /api/cart/checkout - Create order from cart
 * Body: { shippingAddress: { address, city, country?, name, phone }, paymentMethod? }
 */
router.post('/checkout', cartController.checkout);

/**
 * POST /api/cart/items - Add item to cart
 * Body: { autoPartId, quantity? }
 */
router.post('/items', cartController.addItem);

/**
 * PATCH /api/cart/items/:id - Update cart item quantity
 * Body: { quantity }
 */
router.patch('/items/:id', cartController.updateItem);

/**
 * DELETE /api/cart/items/:id - Remove item from cart
 */
router.delete('/items/:id', cartController.removeItem);

module.exports = router;
