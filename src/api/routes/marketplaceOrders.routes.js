const express = require('express');
const router = express.Router();
const orderController = require('../controllers/marketplaceOrder.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/marketplace-orders:
 *   post:
 *     summary: Create new order
 *     tags: [📱 Customer | Marketplace]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     autoPartId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *     responses:
 *       201:
 *         description: Order created
 */
router.post('/', orderController.createOrder);

/**
 * @swagger
 * /api/marketplace-orders/my-orders:
 *   get:
 *     summary: Get my orders (Customer)
 *     tags: [📱 Customer | Marketplace]
 *     responses:
 *       200:
 *         description: List of own orders
 */
router.get('/my-orders', orderController.getMyOrders);

/**
 * @swagger
 * /api/marketplace-orders/vendor-orders:
 *   get:
 *     summary: Get received orders (Vendor)
 *     tags: [📱 Customer | Marketplace]
 *     responses:
 *       200:
 *         description: List of orders containing vendor items
 */
router.get('/vendor-orders', requireRole('VENDOR'), orderController.getVendorOrders);

/**
 * @swagger
 * /api/marketplace-orders:
 *   get:
 *     summary: Get all orders (Admin)
 *     tags: [📱 Customer | Marketplace]
 *     responses:
 *       200:
 *         description: List of all orders
 */
router.get('/', requireRole('ADMIN'), orderController.getAllOrders);

/**
 * @swagger
 * /api/marketplace-orders/{id}:
 *   get:
 *     summary: Get order details
 *     tags: [📱 Customer | Marketplace]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 */
router.get('/:id', orderController.getOrderById);

/**
 * @swagger
 * /api/marketplace-orders/{id}:
 *   put:
 *     summary: Update order details (Customer/Admin)
 *     description: Update shipping address, contact info or items before payment/processing.
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
 *       required: true
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
 *                   name: { type: string }
 *                   phone: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     autoPartId: { type: string }
 *                     quantity: { type: integer }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Order updated
 */
router.put('/:id', orderController.updateOrder);


/**
 * @swagger
 * /api/marketplace-orders/{id}/status:
 *   put:
 *     summary: Update global order status (Admin)
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', requireRole('ADMIN'), orderController.updateOrderStatus);

/**
 * @swagger
 * /api/marketplace-orders/{id}/items/{itemId}/status:
 *   put:
 *     summary: Update item status (Vendor)
 *     tags: [📱 Customer | Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *       - in: path
 *         name: itemId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item status updated
 */
router.put('/:id/items/:itemId/status', requireRole('VENDOR'), orderController.updateOrderItemStatus);

module.exports = router;
