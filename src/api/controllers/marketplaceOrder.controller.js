const orderService = require('../../services/marketplaceOrder.service');
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } = require('../../constants/marketplaceOrderStatus');

exports.getStatusOptions = (req, res) => {
  res.json({
    success: true,
    data: {
      orderStatus: ORDER_STATUS,
      paymentStatus: PAYMENT_STATUS,
      paymentMethod: PAYMENT_METHOD,
    },
  });
};

exports.createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.user.id, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrders(req.query);
    res.status(200).json({ success: true, data: result.orders, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

exports.getVendorOrders = async (req, res, next) => {
  try {
    const result = await orderService.getVendorOrders(req.user.id, req.query);
    res.status(200).json({ success: true, data: result.orders, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const result = await orderService.getCustomerOrders(req.user.id, req.query);
    res.status(200).json({ success: true, data: result.orders, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderItemStatus = async (req, res, next) => {
  try {
    const { itemId } = req.params; // /orders/:id/items/:itemId/status
    const item = await orderService.updateOrderItemStatus(req.params.id, itemId, req.body.status, req.user);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};
