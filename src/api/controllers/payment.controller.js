const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Payment Controller
 * List payments for current user (customer) or all for admin
 */
class PaymentController {
  /**
   * Get payments - customer: own payments; admin: all (paginated)
   * GET /api/payments?page=1&limit=10&status=COMPLETED
   */
  async list(req, res, next) {
    try {
      const user = req.user;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
      const status = req.query.status || null;
      const skip = (page - 1) * limit;

      const where = {};
      if (user.role !== 'ADMIN') {
        where.customerId = user.id;
      }
      if (status) where.status = status;

      const [items, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            paymentNumber: true,
            invoiceId: true,
            amount: true,
            method: true,
            status: true,
            processedAt: true,
            createdAt: true,
            invoice: { select: { invoiceNumber: true, totalAmount: true } },
          },
        }),
        prisma.payment.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      res.json({
        success: true,
        message: '',
        data: items,
        pagination: { page, limit, total, totalPages },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single payment by id (owner or admin)
   * GET /api/payments/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      const where = { id };
      if (user.role !== 'ADMIN') where.customerId = user.id;

      const payment = await prisma.payment.findFirst({
        where,
        include: {
          invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, bookingId: true } },
          customer: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
        },
      });

      if (!payment) {
        throw new AppError('Payment not found', 404, 'NOT_FOUND');
      }

      res.json({ success: true, message: '', data: payment });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
