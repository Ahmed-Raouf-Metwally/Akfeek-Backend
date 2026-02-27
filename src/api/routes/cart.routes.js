const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const cartController = require('../controllers/cart.controller');

router.use(authMiddleware);

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get my cart (with items)
 *     tags: [📱 Customer | Marketplace]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user cart with items
 */
router.get('/', cartController.getCart);

/**
 * @swagger
 * /api/cart/checkout:
 *   post:
 *     summary: Create order from cart (Customer)
 *     tags: [📱 Customer | Marketplace]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   address: { type: string }
 *                   city: { type: string }
 *                   country: { type: string }
 *                   name: { type: string }
 *                   phone: { type: string }
 *               paymentMethod: { type: string }
 *     responses:
 *       201:
 *         description: Order created from cart
 */
router.post('/checkout', cartController.checkout);

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Add auto part to cart
 *     tags: [📱 Customer | Marketplace]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [autoPartId]
 *             properties:
 *               autoPartId: { type: string }
 *               quantity: { type: integer, default: 1 }
 *     responses:
 *       201:
 *         description: Item added to cart
 */
router.post('/items', cartController.addItem);

/**
 * @swagger
 * /api/cart/items/{id}:
 *   patch:
 *     summary: Update cart item quantity
 *     tags: [📱 Customer | Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity: { type: integer }
 *     responses:
 *       200:
 *         description: Cart updated
 *   delete:
 *     summary: Remove item from cart
 *     tags: [📱 Customer | Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed
 */
router.patch('/items/:id', cartController.updateItem);
router.delete('/items/:id', cartController.removeItem);

module.exports = router;
