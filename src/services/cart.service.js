const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const orderService = require('./marketplaceOrder.service');

/**
 * Get or create cart for user (one cart per user).
 * @param {string} userId
 * @returns {Promise<Object>} Cart with items
 */
async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          autoPart: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              sku: true,
              price: true,
              stockQuantity: true,
              isActive: true,
              isApproved: true,
              images: { where: { isPrimary: true }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            autoPart: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                sku: true,
                price: true,
                stockQuantity: true,
                isActive: true,
                isApproved: true,
                images: { where: { isPrimary: true }, take: 1, select: { url: true } },
              },
            },
          },
        },
      },
    });
  }

  return cart;
}

/**
 * Add item to cart or increase quantity. Uses current AutoPart price.
 * @param {string} userId
 * @param {string} autoPartId
 * @param {number} quantity
 */
async function addItem(userId, autoPartId, quantity = 1) {
  const part = await prisma.autoPart.findUnique({
    where: { id: autoPartId },
  });
  if (!part) throw new AppError('Product not found', 404, 'NOT_FOUND');
  if (!part.isActive || !part.isApproved) throw new AppError('Product is not available', 400, 'PART_UNAVAILABLE');
  if (part.stockQuantity < quantity) {
    throw new AppError(`Insufficient stock. Available: ${part.stockQuantity}`, 400, 'INSUFFICIENT_STOCK');
  }

  const cart = await getOrCreateCart(userId);
  const existing = await prisma.cartItem.findUnique({
    where: {
      cartId_autoPartId: { cartId: cart.id, autoPartId },
    },
  });

  const qty = Number(quantity) || 1;
  const price = Number(part.price);

  if (existing) {
    const newQty = existing.quantity + qty;
    if (part.stockQuantity < newQty) {
      throw new AppError(`Insufficient stock. Available: ${part.stockQuantity}`, 400, 'INSUFFICIENT_STOCK');
    }
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty, unitPrice: price, updatedAt: new Date() },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        autoPartId,
        quantity: qty,
        unitPrice: price,
      },
    });
  }

  return getOrCreateCart(userId);
}

/**
 * Update cart item quantity.
 * @param {string} userId
 * @param {string} cartItemId
 * @param {number} quantity
 */
async function updateItemQuantity(userId, cartItemId, quantity) {
  const qty = Math.max(0, Number(quantity) || 0);
  const cart = await getOrCreateCart(userId);
  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cartId: cart.id },
    include: { autoPart: true },
  });
  if (!item) throw new AppError('Cart item not found', 404, 'NOT_FOUND');
  if (qty === 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    return getOrCreateCart(userId);
  }
  if (item.autoPart.stockQuantity < qty) {
    throw new AppError(`Insufficient stock. Available: ${item.autoPart.stockQuantity}`, 400, 'INSUFFICIENT_STOCK');
  }
  await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity: qty, unitPrice: item.autoPart.price, updatedAt: new Date() },
  });
  return getOrCreateCart(userId);
}

/**
 * Remove item from cart.
 * @param {string} userId
 * @param {string} cartItemId
 */
async function removeItem(userId, cartItemId) {
  const cart = await getOrCreateCart(userId);
  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cartId: cart.id },
  });
  if (!item) throw new AppError('Cart item not found', 404, 'NOT_FOUND');
  await prisma.cartItem.delete({ where: { id: cartItemId } });
  return getOrCreateCart(userId);
}

/**
 * Checkout: create MarketplaceOrder from cart and clear cart.
 * @param {string} userId
 * @param {Object} data - { shippingAddress: { address, city, country?, name, phone }, paymentMethod? }
 */
async function checkout(userId, data) {
  const cart = await getOrCreateCart(userId);
  if (!cart.items || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400, 'CART_EMPTY');
  }

  const items = cart.items.map((i) => ({
    autoPartId: i.autoPartId,
    quantity: i.quantity,
  }));

  const order = await orderService.createOrder(userId, {
    items,
    shippingAddress: data.shippingAddress || {},
    paymentMethod: data.paymentMethod || 'CARD',
  });

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  return order;
}

module.exports = {
  getOrCreateCart,
  addItem,
  updateItemQuantity,
  removeItem,
  checkout,
};
