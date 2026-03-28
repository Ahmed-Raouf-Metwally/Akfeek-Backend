const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const workshopService = require('./workshop.service');

const INVOICE_ITEM_TYPES_TO_REPLACE = ['INSPECTION_LINE', 'REPAIR_ESTIMATE'];
const SUPPLEMENTAL_ITEM_TYPES = ['SUPPLEMENTAL_INSPECTION_LINE', 'SUPPLEMENTAL_REPAIR_ESTIMATE'];

/**
 * Recalculate invoice subtotal/total from line items (tax/discount left as-is on invoice row; totals follow lines).
 */
async function recalculateInvoiceFromLines(tx, invoiceId) {
  const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
  const lines = await tx.invoiceLineItem.findMany({ where: { invoiceId } });
  const subtotal = lines.reduce((s, l) => s + Number(l.totalPrice || 0), 0);
  const taxAmt = Number(inv.tax || 0);
  const disc = Number(inv.discount || 0);
  const totalAmount = Math.max(0, Math.round((subtotal + taxAmt - disc) * 100) / 100);
  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      totalAmount,
    },
  });
}

/**
 * After total changes while paidAmount > 0: PAID vs PARTIALLY_PAID.
 */
async function applyInvoiceStatusFromBalance(tx, invoiceId) {
  const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return;
  const paid = Number(inv.paidAmount) || 0;
  const total = Number(inv.totalAmount) || 0;
  if (paid <= 0) return;
  const eps = 0.005;
  const nextStatus = paid >= total - eps ? 'PAID' : 'PARTIALLY_PAID';
  const data = { status: nextStatus };
  if (nextStatus === 'PAID' && !inv.paidAt) {
    data.paidAt = new Date();
  }
  await tx.invoice.update({ where: { id: invoiceId }, data });
}

/**
 * Replace supplemental lines from inspection items (after initial payment / customer approval).
 */
async function syncSupplementalInvoiceLines(tx, bookingId, report) {
  const invoice = await tx.invoice.findUnique({ where: { bookingId } });
  if (!invoice) return;

  await tx.invoiceLineItem.deleteMany({
    where: {
      invoiceId: invoice.id,
      itemType: { in: SUPPLEMENTAL_ITEM_TYPES },
    },
  });

  const items = await tx.inspectionItem.findMany({
    where: { reportId: report.id },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });

  if (items.length > 0) {
    for (const it of items) {
      const price = Number(it.estimatedCost || 0);
      if (price <= 0) continue;
      await tx.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: `${it.category}: ${it.issue}`.slice(0, 500),
          descriptionAr: (it.issueAr || it.issue || '').slice(0, 500),
          itemType: 'SUPPLEMENTAL_INSPECTION_LINE',
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
        },
      });
    }
  }

  const lineCount = await tx.invoiceLineItem.count({
    where: { invoiceId: invoice.id, itemType: 'SUPPLEMENTAL_INSPECTION_LINE' },
  });

  if (lineCount === 0 && report.estimatedCost != null) {
    const price = Number(report.estimatedCost || 0);
    if (price > 0) {
      await tx.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: 'Additional repair estimate (post inspection)',
          descriptionAr: 'تقدير إصلاح إضافي بعد الفحص',
          itemType: 'SUPPLEMENTAL_REPAIR_ESTIMATE',
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
        },
      });
    }
  }

  await recalculateInvoiceFromLines(tx, invoice.id);
  await applyInvoiceStatusFromBalance(tx, invoice.id);
}

/**
 * Replace inspection-based invoice lines and add new ones from report/items. Only if unpaid.
 */
async function syncInvoiceWithInspection(tx, bookingId, report) {
  const invoice = await tx.invoice.findUnique({ where: { bookingId } });
  if (!invoice) return;

  const paid = Number(invoice.paidAmount || 0);
  if (paid > 0) {
    throw new AppError(
      'Invoice already has payments; cannot update repair estimate lines',
      400,
      'INVOICE_LOCKED'
    );
  }

  await tx.invoiceLineItem.deleteMany({
    where: {
      invoiceId: invoice.id,
      itemType: { in: INVOICE_ITEM_TYPES_TO_REPLACE },
    },
  });

  const items = await tx.inspectionItem.findMany({
    where: { reportId: report.id },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });

  if (items.length > 0) {
    for (const it of items) {
      const price = Number(it.estimatedCost || 0);
      if (price <= 0) continue;
      await tx.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: `${it.category}: ${it.issue}`.slice(0, 500),
          descriptionAr: (it.issueAr || it.issue || '').slice(0, 500),
          itemType: 'INSPECTION_LINE',
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
        },
      });
    }
  }

  const lineCount = await tx.invoiceLineItem.count({
    where: { invoiceId: invoice.id, itemType: 'INSPECTION_LINE' },
  });

  if (lineCount === 0 && report.estimatedCost != null) {
    const price = Number(report.estimatedCost || 0);
    if (price > 0) {
      await tx.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: 'Repair estimate (post inspection)',
          descriptionAr: 'تقدير تكلفة الإصلاح بعد التقييم',
          itemType: 'REPAIR_ESTIMATE',
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
        },
      });
    }
  }

  await recalculateInvoiceFromLines(tx, invoice.id);

  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      status: invoice.status === 'DRAFT' ? 'PENDING' : invoice.status,
    },
  });
}

class WorkshopInspectionService {
  async assertWorkshopBooking(vendorUserId, bookingId) {
    const workshop = await workshopService.getWorkshopByVendorUserId(vendorUserId);
    if (!workshop) {
      throw new AppError('No workshop linked to your account', 404, 'NOT_FOUND');
    }
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, workshopId: workshop.id },
      select: { id: true, workshopId: true, customerId: true },
    });
    if (!booking) {
      throw new AppError('Booking not found for your workshop', 404, 'NOT_FOUND');
    }
    return { workshop, booking };
  }

  async getForVendor(vendorUserId, bookingId) {
    await this.assertWorkshopBooking(vendorUserId, bookingId);
    const report = await prisma.inspectionReport.findUnique({
      where: { bookingId },
      include: { items: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] } },
    });
    return report;
  }

  /**
   * Customer / admin: read inspection for a booking (ownership check outside).
   */
  async getByBookingId(bookingId) {
    return prisma.inspectionReport.findUnique({
      where: { bookingId },
      include: {
        items: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] },
        technician: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async upsertForVendor(vendorUserId, bookingId, body) {
    const { booking } = await this.assertWorkshopBooking(vendorUserId, bookingId);

    const {
      mileage,
      overallCondition,
      notes,
      images,
      videos,
      estimatedCost,
      estimatedDuration,
      status = 'IN_PROGRESS',
      items = [],
    } = body;

    const allowedStatus = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED'];
    if (!allowedStatus.includes(status)) {
      throw new AppError('Invalid inspection status', 400, 'VALIDATION_ERROR');
    }

    const existing = await prisma.inspectionReport.findUnique({ where: { bookingId } });

    if (!existing && (mileage === undefined || mileage === null)) {
      throw new AppError('mileage is required when creating an inspection report', 400, 'VALIDATION_ERROR');
    }

    const report = await prisma.$transaction(async (tx) => {
      let rep;
      if (existing) {
        rep = await tx.inspectionReport.update({
          where: { id: existing.id },
          data: {
            ...(mileage != null ? { mileage: parseInt(mileage, 10) } : {}),
            ...(overallCondition !== undefined ? { overallCondition } : {}),
            ...(notes !== undefined ? { notes } : {}),
            ...(images !== undefined ? { images } : {}),
            ...(videos !== undefined ? { videos } : {}),
            ...(estimatedCost !== undefined && estimatedCost !== null
              ? { estimatedCost: String(estimatedCost) }
              : {}),
            ...(estimatedDuration !== undefined ? { estimatedDuration: estimatedDuration != null ? parseInt(estimatedDuration, 10) : null } : {}),
            status,
          },
        });
      } else {
        rep = await tx.inspectionReport.create({
          data: {
            bookingId,
            technicianId: vendorUserId,
            mileage: parseInt(mileage, 10),
            overallCondition: overallCondition || null,
            notes: notes || null,
            images: images !== undefined ? images : undefined,
            videos: videos !== undefined ? videos : undefined,
            estimatedCost: estimatedCost != null ? String(estimatedCost) : '0',
            estimatedDuration: estimatedDuration != null ? parseInt(estimatedDuration, 10) : null,
            status,
          },
        });
      }

      if (Object.prototype.hasOwnProperty.call(body, 'items') && Array.isArray(items)) {
        await tx.inspectionItem.deleteMany({ where: { reportId: rep.id } });
        if (items.length > 0) {
          await tx.inspectionItem.createMany({
            data: items.map((it, idx) => ({
              reportId: rep.id,
              category: String(it.category || 'General'),
              issue: String(it.issue || ''),
              issueAr: it.issueAr != null ? String(it.issueAr) : null,
              severity: String(it.severity || 'MEDIUM'),
              recommendedAction: String(it.recommendedAction || ''),
              estimatedCost: String(it.estimatedCost != null ? it.estimatedCost : 0),
              requiresPart: Boolean(it.requiresPart),
              partName: it.partName || null,
              partSku: it.partSku || null,
              priority: it.priority != null ? parseInt(it.priority, 10) : idx + 1,
            })),
          });
        }
      }

      const full = await tx.inspectionReport.findUnique({
        where: { id: rep.id },
        include: { items: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] } },
      });

      if (status === 'COMPLETED' || status === 'APPROVED') {
        const inv = await tx.invoice.findUnique({ where: { bookingId } });
        const paid = Number(inv?.paidAmount || 0);
        if (paid > 0 && inv) {
          await tx.invoiceLineItem.deleteMany({
            where: {
              invoiceId: inv.id,
              itemType: { in: SUPPLEMENTAL_ITEM_TYPES },
            },
          });
          await recalculateInvoiceFromLines(tx, inv.id);
          await applyInvoiceStatusFromBalance(tx, inv.id);
          await tx.inspectionReport.update({
            where: { id: rep.id },
            data: {
              status: 'PENDING_CUSTOMER',
              customerResponse: null,
              customerComment: null,
              respondedAt: null,
            },
          });
        } else {
          await syncInvoiceWithInspection(tx, booking.id, full);
        }
      }

      return tx.inspectionReport.findUnique({
        where: { id: rep.id },
        include: { items: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] } },
      });
    });

    const invoice = await prisma.invoice.findUnique({
      where: { bookingId },
      include: { lineItems: true },
    });

    return { report, invoice };
  }

  /**
   * Customer approves supplemental estimate after initial invoice payment; adds supplemental lines to invoice.
   */
  async approveSupplementalForCustomer(customerUserId, bookingId) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, customerId: customerUserId },
        select: { id: true },
      });
      if (!booking) {
        throw new AppError('Booking not found', 404, 'NOT_FOUND');
      }

      const report = await tx.inspectionReport.findUnique({ where: { bookingId } });
      if (!report) {
        throw new AppError('Inspection report not found', 404, 'NOT_FOUND');
      }
      if (report.status !== 'PENDING_CUSTOMER') {
        throw new AppError('No supplemental estimate awaiting your approval', 400, 'INVALID_STATE');
      }

      const withItems = await tx.inspectionReport.findUnique({
        where: { bookingId },
        include: { items: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] } },
      });

      await syncSupplementalInvoiceLines(tx, bookingId, withItems);

      const updated = await tx.inspectionReport.update({
        where: { bookingId },
        data: {
          status: 'APPROVED',
          customerResponse: 'APPROVED',
          customerComment: null,
          respondedAt: new Date(),
        },
        include: { items: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] } },
      });

      const invoice = await tx.invoice.findUnique({
        where: { bookingId },
        include: { lineItems: true },
      });

      return { report: updated, invoice };
    });
  }

  /**
   * Customer declines supplemental charges; invoice is unchanged (no supplemental lines while pending).
   */
  async rejectSupplementalForCustomer(customerUserId, bookingId, body = {}) {
    const comment = body.customerComment ?? body.comment ?? null;
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, customerId: customerUserId },
        select: { id: true },
      });
      if (!booking) {
        throw new AppError('Booking not found', 404, 'NOT_FOUND');
      }

      const report = await tx.inspectionReport.findUnique({ where: { bookingId } });
      if (!report) {
        throw new AppError('Inspection report not found', 404, 'NOT_FOUND');
      }
      if (report.status !== 'PENDING_CUSTOMER') {
        throw new AppError('No supplemental estimate awaiting your response', 400, 'INVALID_STATE');
      }

      const updated = await tx.inspectionReport.update({
        where: { bookingId },
        data: {
          status: 'APPROVED',
          customerResponse: 'REJECTED',
          customerComment: comment != null ? String(comment).slice(0, 5000) : null,
          respondedAt: new Date(),
        },
        include: { items: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] } },
      });

      return { report: updated };
    });
  }
}

module.exports = new WorkshopInspectionService();
