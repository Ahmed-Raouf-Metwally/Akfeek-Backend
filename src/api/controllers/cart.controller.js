const cartService = require('../../services/cart.service');

/**
 * GET /api/cart - Get my cart (with items)
 */
async function getCart(req, res, next) {
  try {
    const cart = await cartService.getOrCreateCart(req.user.id);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/cart/items - Add item to cart
 * Body: { autoPartId, quantity? }
 */
async function addItem(req, res, next) {
  try {
    const { autoPartId, quantity = 1 } = req.body;
    if (!autoPartId) {
      return res.status(400).json({ success: false, error: 'autoPartId is required' });
    }
    const cart = await cartService.addItem(req.user.id, autoPartId, quantity);
    res.status(201).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/cart/items/:id - Update cart item quantity
 * Body: { quantity }
 */
async function updateItem(req, res, next) {
  try {
    const { id: cartItemId } = req.params;
    const { quantity } = req.body;
    const cart = await cartService.updateItemQuantity(req.user.id, cartItemId, quantity);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/cart/items/:id - Remove item from cart
 */
async function removeItem(req, res, next) {
  try {
    const { id: cartItemId } = req.params;
    const cart = await cartService.removeItem(req.user.id, cartItemId);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/cart/checkout - Create order from cart
 * Body: { shippingAddress: { address, city, country?, name, phone }, paymentMethod? }
 */
async function checkout(req, res, next) {
  try {
    const order = await cartService.checkout(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      messageAr: 'تم إنشاء الطلب بنجاح',
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  checkout,
};
