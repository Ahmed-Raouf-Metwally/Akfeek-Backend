const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Get all invoices (Admin). Paginated list with customer/booking summary.
 * GET /api/invoices
 */
async function getAllInvoices(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const status = req.query.status || null;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ issuedAt: 'desc' }],
        select: {
          id: true,
          invoiceNumber: true,
          customerId: true,
          bookingId: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
          issuedAt: true,
          dueDate: true,
          paidAt: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single invoice by id (Admin).
 * GET /api/invoices/:id
 */
async function getInvoiceById(req, res, next) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            scheduledDate: true,
          },
        },
      },
    });
    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    }
    res.json({ success: true, message: '', data: invoice });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllInvoices, getInvoiceById };
