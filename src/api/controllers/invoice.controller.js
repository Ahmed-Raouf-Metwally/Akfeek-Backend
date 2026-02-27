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

/**
 * Manually create invoice for a booking (Admin)
 * POST /api/invoices
 * Body: { bookingId }
 */
async function createInvoiceForBooking(req, res, next) {
  try {
    const { bookingId } = req.body;
    if (!bookingId) throw new AppError('bookingId is required', 400, 'VALIDATION_ERROR');

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { services: { include: { service: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');

    // Check duplicate
    const existing = await prisma.invoice.findUnique({ where: { bookingId } });
    if (existing) {
      return res.json({ success: true, message: 'Invoice already exists', data: existing });
    }

    const subtotal   = Number(booking.subtotal)    || 0;
    const discount   = Number(booking.discount)    || 0;
    const tax        = Number(booking.tax)          || 0;
    const flatbedFee = Number(booking.flatbedFee)  || 0;
    const totalAmount = Number(booking.totalPrice)  || subtotal - discount + tax + flatbedFee;

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const lineItems = booking.services.map((bs) => ({
      description:   bs.service?.name   || 'Service',
      descriptionAr: bs.service?.nameAr || 'خدمة',
      itemType:      'SERVICE',
      quantity:      bs.quantity || 1,
      unitPrice:     Number(bs.unitPrice),
      totalPrice:    Number(bs.totalPrice),
    }));

    if (flatbedFee > 0) {
      lineItems.push({
        description: 'Flatbed Delivery Fee', descriptionAr: 'رسوم النقل بالسطحة',
        itemType: 'DELIVERY', quantity: 1, unitPrice: flatbedFee, totalPrice: flatbedFee,
      });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        bookingId,
        customerId: booking.customerId,
        subtotal,
        tax,
        discount,
        totalAmount,
        paidAmount: 0,
        status: 'ISSUED',
        issuedAt: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lineItems: { create: lineItems },
      },
      include: { lineItems: true },
    });

    res.status(201).json({ success: true, message: 'Invoice created', data: invoice });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark invoice as paid (Admin)
 * PATCH /api/invoices/:id/pay
 * Body: { method, amount? }
 */
async function markInvoicePaid(req, res, next) {
  try {
    const { id } = req.params;
    const { method = 'CASH', amount } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    if (invoice.status === 'PAID') {
      return res.json({ success: true, message: 'Invoice already paid', data: invoice });
    }

    const paidAmount = amount ? Number(amount) : Number(invoice.totalAmount);

    const [updatedInvoice, payment] = await prisma.$transaction([
      prisma.invoice.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAmount,
          paidAt: new Date(),
        },
      }),
      prisma.payment.create({
        data: {
          paymentNumber: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          invoiceId: id,
          customerId: invoice.customerId,
          amount: paidAmount,
          method,
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      }),
    ]);

    res.json({ success: true, message: 'Invoice marked as paid', data: { invoice: updatedInvoice, payment } });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllInvoices, getInvoiceById, createInvoiceForBooking, markInvoicePaid };
