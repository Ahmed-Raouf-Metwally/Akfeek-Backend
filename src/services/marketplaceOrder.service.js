const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { AppError } = require('../api/middlewares/error.middleware');

exports.createOrder = async (userId, data) => {
  const { items, shippingAddress, paymentMethod } = data;

  if (!items || items.length === 0) {
    throw new AppError('Order must contain at least one item', 400);
  }

  // 1. Calculate totals and validate stock
  let subtotal = 0;
  const orderItemsData = [];

  // Fetch all parts to validate price and stock
  for (const item of items) {
    const part = await prisma.autoPart.findUnique({
      where: { id: item.autoPartId },
      include: { vendor: true }
    });

    if (!part) {
      throw new AppError(`Product not found: ${item.autoPartId}`, 404);
    }

    if (part.stockQuantity < item.quantity) {
      throw new AppError(`Insufficient stock for ${part.name}. Available: ${part.stockQuantity}`, 400);
    }

    const itemTotal = Number(part.price) * item.quantity;
    subtotal += itemTotal;

    orderItemsData.push({
      autoPartId: part.id,
      vendorId: part.vendorId, // Can be null for platform items
      quantity: item.quantity,
      unitPrice: part.price,
      totalPrice: itemTotal,
      status: 'PENDING'
    });
  }

  const shippingCost = 25.00; // Flat rate for now
  const tax = subtotal * 0.15; // 15% VAT
  const totalAmount = subtotal + tax + shippingCost;
  const discount = 0;

  // 2. Create Order Transaction
  const order = await prisma.$transaction(async (tx) => {
    // Generate Order Number
    const count = await tx.marketplaceOrder.count();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Create Order
    const newOrder = await tx.marketplaceOrder.create({
      data: {
        orderNumber,
        customerId: userId,
        subtotal,
        tax,
        shippingCost,
        discount,
        totalAmount,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod,
        shippingAddress: shippingAddress?.address,
        shippingCity: shippingAddress?.city,
        shippingCountry: shippingAddress?.country || 'SA',
        recipientName: shippingAddress?.name,
        recipientPhone: shippingAddress?.phone,
        items: {
          create: orderItemsData
        }
      },
      include: {
        items: true
      }
    });

    // Decrement Stock
    for (const item of items) {
      await tx.autoPart.update({
        where: { id: item.autoPartId },
        data: { stockQuantity: { decrement: item.quantity } }
      });
    }

    return newOrder;
  });

  return order;
};

exports.getAllOrders = async (query) => {
  const { page = 1, limit = 10, status, search } = query;
  const skip = (page - 1) * limit;

  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { recipientName: { contains: search } }
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.marketplaceOrder.findMany({
      where,
      skip: Number(skip),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, email: true, phone: true, profile: { select: { firstName: true, lastName: true } } } },
        items: { include: { autoPart: { select: { name: true, sku: true } } } }
      }
    }),
    prisma.marketplaceOrder.count({ where })
  ]);

  return {
    orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

exports.getVendorOrders = async (userId, query) => {
  // Find vendor profile for this user
  const vendorProfile = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendorProfile) throw new AppError('Vendor profile not found', 404);

  const { page = 1, limit = 10, status } = query;
  const skip = (page - 1) * limit;

  // We need to find orders that have items belonging to this vendor
  // Prisma doesn't support complex deep filtering easily on the parent based on child conditions for pagination count effectively sometimes, 
  // but let's try direct approach.

  const where = {
    items: {
      some: {
         vendorId: vendorProfile.id
      }
    }
  };
  
  if (status) where.status = status; // Filter by global order status, or maybe item status? Usually vendors care about their item status.

  const [orders, total] = await Promise.all([
    prisma.marketplaceOrder.findMany({
      where,
      skip: Number(skip),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, email: true, phone: true } },
        items: {
          where: { vendorId: vendorProfile.id }, // Only return items for this vendor
          include: { autoPart: { select: { name: true, sku: true, images: true } } }
        }
      }
    }),
    prisma.marketplaceOrder.count({ where })
  ]);

  return {
    orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

exports.getCustomerOrders = async (userId, query) => {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.marketplaceOrder.findMany({
      where: { customerId: userId },
      skip: Number(skip),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { autoPart: { select: { name: true, images: true } } } }
      }
    }),
    prisma.marketplaceOrder.count({ where: { customerId: userId } })
  ]);

  return {
    orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

exports.getOrderById = async (id, currentUser) => {
  const order = await prisma.marketplaceOrder.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, email: true, phone: true, profile: true } },
      items: {
        include: {
          autoPart: { select: { id: true, name: true, sku: true, images: true } },
          vendor: { select: { id: true, businessName: true } }
        }
      }
    }
  });

  if (!order) throw new AppError('Order not found', 404);

  // Authorization check
  if (currentUser.role === 'CUSTOMER' && order.customerId !== currentUser.id) {
    throw new AppError('Unauthorized', 403);
  }

  if (currentUser.role === 'VENDOR') {
    const vendorProfile = await prisma.vendorProfile.findUnique({ where: { userId: currentUser.id } });
    // Filter items to only show this vendor's items
    order.items = order.items.filter(item => item.vendorId === vendorProfile.id);
    if (order.items.length === 0) throw new AppError('Unauthorized', 403);
  }

  return order;
};

exports.updateOrderStatus = async (id, status, currentUser) => {
  // Admin can update global status
  if (currentUser.role === 'ADMIN') {
    return await prisma.marketplaceOrder.update({
      where: { id },
      data: { status }
    });
  } 
  
  throw new AppError('Unauthorized', 403);
};

exports.updateOrderItemStatus = async (orderId, itemId, status, currentUser) => {
  // Vendor can update their own item status
  const item = await prisma.marketplaceOrderItem.findUnique({
    where: { id: itemId },
    include: { vendor: true }
  });

  if (!item) throw new AppError('Item not found', 404);

  if (currentUser.role === 'VENDOR') {
    const vendorProfile = await prisma.vendorProfile.findUnique({ where: { userId: currentUser.id } });
    if (item.vendorId !== vendorProfile.id) {
      throw new AppError('Unauthorized to update this item', 403);
    }
  } else if (currentUser.role !== 'ADMIN') {
    throw new AppError('Unauthorized', 403);
  }

  return await prisma.marketplaceOrderItem.update({
    where: { id: itemId },
    data: { status }
  });
};
