const fs = require('fs');
const path = require('path');
const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const workshopService = require('./workshop.service');

const STEP_ORDER = [
  'INSURANCE_TOW',
  'INSURANCE_DOCS',
  'TOW_TO_WORKSHOP',
  'WORKSHOP_BOOKING',
  'POST_REPAIR_TOW_HOME',
];

const STEP_KEYS = new Set(STEP_ORDER);

function assertStepKey(stepKey) {
  if (!STEP_KEYS.has(stepKey)) {
    throw new AppError(`Invalid step: ${stepKey}`, 400, 'VALIDATION_ERROR');
  }
}

function isTowingLikeBooking(booking) {
  return Boolean(booking?.jobBroadcast);
}

function isWorkshopBooking(booking) {
  return Boolean(booking?.workshopId);
}

async function loadBookingForLink(bookingId, customerId) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId },
    include: { jobBroadcast: { select: { id: true } }, workshop: { select: { id: true } } },
  });
  if (!booking) {
    throw new AppError('Booking not found or not yours', 404, 'NOT_FOUND');
  }
  return booking;
}

function stepResolved(journey, step, workshopInvoicePaid) {
  switch (step) {
    case 'INSURANCE_TOW':
      return journey.insuranceTowSkipped || !!journey.insuranceTowBookingId;
    case 'INSURANCE_DOCS':
      return journey.insuranceDocsSkipped || journey.insuranceDocsCompleted;
    case 'TOW_TO_WORKSHOP':
      return journey.towToWorkshopSkipped || !!journey.towToWorkshopBookingId;
    case 'WORKSHOP_BOOKING':
      if (journey.workshopSkipped) return true;
      if (!journey.workshopBookingId) return false;
      return workshopInvoicePaid;
    case 'POST_REPAIR_TOW_HOME':
      return journey.returnHomeDeclined || !!journey.returnHomeBookingId;
    default:
      return false;
  }
}

function workshopStepBooked(journey) {
  return journey.workshopSkipped || !!journey.workshopBookingId;
}

async function getWorkshopInvoicePaid(workshopBookingId) {
  if (!workshopBookingId) return false;
  const inv = await prisma.invoice.findUnique({
    where: { bookingId: workshopBookingId },
    select: { status: true, paidAmount: true, totalAmount: true },
  });
  if (!inv) return false;
  const paid = Number(inv.paidAmount) || 0;
  const total = Number(inv.totalAmount) || 0;
  const eps = 0.005;
  if (total > 0 && paid >= total - eps) return true;
  return inv.status === 'PAID';
}

function computeCompletion(journey, workshopInvoicePaid) {
  return STEP_ORDER.every((s) => stepResolved(journey, s, workshopInvoicePaid));
}

function nextOpenStep(journey, workshopInvoicePaid) {
  for (const s of STEP_ORDER) {
    if (!stepResolved(journey, s, workshopInvoicePaid)) return s;
  }
  return STEP_ORDER[STEP_ORDER.length - 1];
}

/** تفصيل نتيجة كل خطوة للأدمن: تخطٍ، حجز، وثائق، دفع، جاري، لم يبدأ */
function outcomeForStep(journey, stepKey, workshopInvoicePaid) {
  switch (stepKey) {
    case 'INSURANCE_TOW':
      if (journey.insuranceTowSkipped) return { outcome: 'SKIPPED', bookingId: null };
      if (journey.insuranceTowBookingId) {
        return { outcome: 'BOOKING', bookingId: journey.insuranceTowBookingId };
      }
      break;
    case 'INSURANCE_DOCS':
      if (journey.insuranceDocsSkipped) return { outcome: 'SKIPPED', bookingId: null };
      if (journey.insuranceDocsCompleted) return { outcome: 'DOCS_COMPLETED', bookingId: null };
      break;
    case 'TOW_TO_WORKSHOP':
      if (journey.towToWorkshopSkipped) return { outcome: 'SKIPPED', bookingId: null };
      if (journey.towToWorkshopBookingId) {
        return { outcome: 'BOOKING', bookingId: journey.towToWorkshopBookingId };
      }
      break;
    case 'WORKSHOP_BOOKING':
      if (journey.workshopSkipped) return { outcome: 'SKIPPED', bookingId: null };
      if (journey.workshopBookingId) {
        if (workshopInvoicePaid) {
          return { outcome: 'WORKSHOP_PAID', bookingId: journey.workshopBookingId };
        }
        return { outcome: 'WORKSHOP_PENDING_PAYMENT', bookingId: journey.workshopBookingId };
      }
      break;
    case 'POST_REPAIR_TOW_HOME':
      if (journey.returnHomeDeclined) return { outcome: 'RETURN_DECLINED', bookingId: null };
      if (journey.returnHomeBookingId) {
        return { outcome: 'BOOKING', bookingId: journey.returnHomeBookingId };
      }
      break;
    default:
      break;
  }

  const resolved = stepResolved(journey, stepKey, workshopInvoicePaid);
  if (resolved) {
    return { outcome: 'COMPLETED', bookingId: null };
  }
  if (journey.currentStep === stepKey) {
    return { outcome: 'IN_PROGRESS', bookingId: null };
  }
  const si = STEP_ORDER.indexOf(stepKey);
  const ci = STEP_ORDER.indexOf(journey.currentStep);
  if (si > ci) return { outcome: 'NOT_YET', bookingId: null };
  return { outcome: 'PENDING', bookingId: null };
}

async function mergeBookingMetadata(bookingId, journeyId) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { metadata: true },
  });
  const meta = (b?.metadata && typeof b.metadata === 'object' ? b.metadata : {}) || {};
  await prisma.booking.update({
    where: { id: bookingId },
    data: { metadata: { ...meta, akfeekJourneyId: journeyId } },
  });
}

class AkfeekJourneyService {
  async start(customerId, vehicleId) {
    const active = await prisma.akfeekJourney.findFirst({
      where: { customerId, status: 'ACTIVE' },
    });
    if (active) {
      throw new AppError('You already have an active Akfeek journey', 409, 'JOURNEY_ACTIVE');
    }

    if (vehicleId) {
      const v = await prisma.userVehicle.findFirst({
        where: { id: vehicleId, userId: customerId },
        select: { id: true },
      });
      if (!v) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
    }

    return prisma.akfeekJourney.create({
      data: {
        customerId,
        vehicleId: vehicleId || null,
        status: 'ACTIVE',
        currentStep: 'INSURANCE_TOW',
      },
      include: this._include(),
    });
  }

  _include() {
    return {
      documents: { orderBy: { createdAt: 'asc' } },
      vehicle: { include: { vehicleModel: { include: { brand: true } } } },
    };
  }

  async tryAdvanceAfterWorkshopPayment(journeyId) {
    const j = await prisma.akfeekJourney.findUnique({ where: { id: journeyId } });
    if (!j || j.status !== 'ACTIVE') return null;
    if (j.currentStep !== 'WORKSHOP_BOOKING') return null;
    if (!j.workshopBookingId || j.workshopSkipped) return null;
    const paid = await getWorkshopInvoicePaid(j.workshopBookingId);
    if (!paid) return null;
    const next = nextOpenStep(j, true);
    const done = computeCompletion({ ...j, currentStep: next, status: j.status }, true);
    return prisma.akfeekJourney.update({
      where: { id: journeyId },
      data: {
        currentStep: next,
        ...(done ? { status: 'COMPLETED' } : {}),
      },
      include: this._include(),
    });
  }

  async getMe(customerId) {
    let journey = await prisma.akfeekJourney.findFirst({
      where: { customerId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: this._include(),
    });
    if (!journey) {
      return { journey: null, steps: [], workshopInvoice: null };
    }

    const workshopInvoicePaid = await getWorkshopInvoicePaid(journey.workshopBookingId);

    const advanced = await this.tryAdvanceAfterWorkshopPayment(journey.id);
    if (advanced) journey = advanced;

    let inv = null;
    if (journey.workshopBookingId) {
      inv = await prisma.invoice.findUnique({
        where: { bookingId: journey.workshopBookingId },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          paidAmount: true,
          invoiceNumber: true,
        },
      });
    }

    const steps = STEP_ORDER.map((key) => ({
      key,
      resolved: stepResolved(journey, key, workshopInvoicePaid),
      pending: journey.currentStep === key,
    }));

    const completed = computeCompletion(journey, workshopInvoicePaid);
    if (completed && journey.status === 'ACTIVE') {
      journey = await prisma.akfeekJourney.update({
        where: { id: journey.id },
        data: { status: 'COMPLETED' },
        include: this._include(),
      });
    }

    return {
      journey,
      steps,
      workshopInvoice: inv,
      workshopInvoicePaid,
    };
  }

  async getByIdForCustomer(journeyId, customerId) {
    const j = await prisma.akfeekJourney.findFirst({
      where: { id: journeyId, customerId },
      include: this._include(),
    });
    if (!j) throw new AppError('Journey not found', 404, 'NOT_FOUND');
    return j;
  }

  async skipStep(journeyId, customerId, stepKey) {
    assertStepKey(stepKey);
    const journey = await this.getByIdForCustomer(journeyId, customerId);
    if (journey.status !== 'ACTIVE') {
      throw new AppError('Journey is not active', 400, 'INVALID_STATE');
    }
    if (journey.currentStep !== stepKey) {
      throw new AppError('Can only skip the current step', 400, 'WRONG_STEP');
    }

    if (stepKey === 'POST_REPAIR_TOW_HOME') {
      return prisma.akfeekJourney.update({
        where: { id: journeyId },
        data: { returnHomeDeclined: true, status: 'COMPLETED' },
        include: this._include(),
      });
    }

    const patch = {};
    switch (stepKey) {
      case 'INSURANCE_TOW':
        patch.insuranceTowSkipped = true;
        break;
      case 'INSURANCE_DOCS':
        patch.insuranceDocsSkipped = true;
        break;
      case 'TOW_TO_WORKSHOP':
        patch.towToWorkshopSkipped = true;
        break;
      case 'WORKSHOP_BOOKING':
        patch.workshopSkipped = true;
        break;
      default:
        break;
    }

    const merged = { ...journey, ...patch };
    const workshopInvoicePaid = await getWorkshopInvoicePaid(merged.workshopBookingId);
    patch.currentStep = nextOpenStep(merged, workshopInvoicePaid);

    const updated = await prisma.akfeekJourney.update({
      where: { id: journeyId },
      data: patch,
      include: this._include(),
    });

    const paid = await getWorkshopInvoicePaid(updated.workshopBookingId);
    if (computeCompletion(updated, paid)) {
      return prisma.akfeekJourney.update({
        where: { id: journeyId },
        data: { status: 'COMPLETED' },
        include: this._include(),
      });
    }

    return updated;
  }

  async completeDocsStep(journeyId, customerId) {
    const journey = await this.getByIdForCustomer(journeyId, customerId);
    if (journey.status !== 'ACTIVE') {
      throw new AppError('Journey is not active', 400, 'INVALID_STATE');
    }
    if (journey.currentStep !== 'INSURANCE_DOCS') {
      throw new AppError('Insurance documents step is not current', 400, 'WRONG_STEP');
    }

    const workshopInvoicePaid = await getWorkshopInvoicePaid(journey.workshopBookingId);
    const updated = await prisma.akfeekJourney.update({
      where: { id: journeyId },
      data: {
        insuranceDocsCompleted: true,
        currentStep: nextOpenStep(
          { ...journey, insuranceDocsCompleted: true },
          workshopInvoicePaid
        ),
      },
      include: this._include(),
    });

    const paid = await getWorkshopInvoicePaid(updated.workshopBookingId);
    if (computeCompletion(updated, paid)) {
      return prisma.akfeekJourney.update({
        where: { id: journeyId },
        data: { status: 'COMPLETED' },
        include: this._include(),
      });
    }
    return updated;
  }

  async linkBooking(journeyId, customerId, stepKey, bookingId) {
    assertStepKey(stepKey);
    if (!['INSURANCE_TOW', 'TOW_TO_WORKSHOP', 'WORKSHOP_BOOKING', 'POST_REPAIR_TOW_HOME'].includes(stepKey)) {
      throw new AppError('This step does not accept bookingId', 400, 'VALIDATION_ERROR');
    }

    const journey = await this.getByIdForCustomer(journeyId, customerId);
    if (journey.status !== 'ACTIVE') {
      throw new AppError('Journey is not active', 400, 'INVALID_STATE');
    }
    if (journey.currentStep !== stepKey) {
      throw new AppError('This step is not current', 400, 'WRONG_STEP');
    }

    const booking = await loadBookingForLink(bookingId, customerId);

    if (stepKey === 'WORKSHOP_BOOKING') {
      if (!isWorkshopBooking(booking)) {
        throw new AppError('Booking must be a certified workshop booking', 400, 'INVALID_BOOKING');
      }
    } else {
      if (!isTowingLikeBooking(booking)) {
        throw new AppError('Booking must be a towing request (with broadcast)', 400, 'INVALID_BOOKING');
      }
    }

    const inUse = await prisma.akfeekJourney.findFirst({
      where: {
        OR: [
          { insuranceTowBookingId: bookingId },
          { towToWorkshopBookingId: bookingId },
          { workshopBookingId: bookingId },
          { returnHomeBookingId: bookingId },
        ],
        NOT: { id: journeyId },
      },
    });
    if (inUse) {
      throw new AppError('This booking is already linked to another journey', 409, 'DUPLICATE');
    }

    const field =
      stepKey === 'INSURANCE_TOW'
        ? 'insuranceTowBookingId'
        : stepKey === 'TOW_TO_WORKSHOP'
          ? 'towToWorkshopBookingId'
          : stepKey === 'WORKSHOP_BOOKING'
            ? 'workshopBookingId'
            : 'returnHomeBookingId';

    await mergeBookingMetadata(bookingId, journeyId);

    const merged = { ...journey, [field]: bookingId };
    const workshopPaidAfterLink = await getWorkshopInvoicePaid(merged.workshopBookingId);

    const data = { [field]: bookingId };

    if (stepKey === 'POST_REPAIR_TOW_HOME') {
      data.status = 'COMPLETED';
    } else if (stepKey === 'WORKSHOP_BOOKING') {
      data.currentStep = workshopPaidAfterLink
        ? nextOpenStep(merged, true)
        : 'WORKSHOP_BOOKING';
    } else {
      data.currentStep = nextOpenStep(merged, workshopPaidAfterLink);
    }

    const updated = await prisma.akfeekJourney.update({
      where: { id: journeyId },
      data,
      include: this._include(),
    });

    const paid = await getWorkshopInvoicePaid(updated.workshopBookingId);
    if (computeCompletion(updated, paid)) {
      return prisma.akfeekJourney.update({
        where: { id: journeyId },
        data: { status: 'COMPLETED' },
        include: this._include(),
      });
    }

    return updated;
  }

  async addDocuments(journeyId, customerId, files, labels) {
    const journey = await this.getByIdForCustomer(journeyId, customerId);
    if (journey.status !== 'ACTIVE') {
      throw new AppError('Journey is not active', 400, 'INVALID_STATE');
    }
    if (journey.currentStep !== 'INSURANCE_DOCS') {
      throw new AppError('Upload documents only during the insurance documents step', 400, 'WRONG_STEP');
    }
    if (!files?.length) {
      throw new AppError('No files uploaded', 400, 'VALIDATION_ERROR');
    }

    const rows = files.map((file, i) => ({
      journeyId,
      fileUrl: `/uploads/akfeek-journey/${journeyId}/${file.filename}`,
      mimeType: file.mimetype,
      originalName: file.originalname,
      label: (labels && labels[i]) || 'other',
    }));

    await prisma.akfeekJourneyDocument.createMany({ data: rows });

    const workshopInvoicePaid = await getWorkshopInvoicePaid(journey.workshopBookingId);
    return prisma.akfeekJourney.update({
      where: { id: journeyId },
      data: {
        insuranceDocsCompleted: true,
        currentStep: nextOpenStep(
          { ...journey, insuranceDocsCompleted: true },
          workshopInvoicePaid
        ),
      },
      include: this._include(),
    });
  }

  async abandon(journeyId, customerId) {
    await this.getByIdForCustomer(journeyId, customerId);
    return prisma.akfeekJourney.update({
      where: { id: journeyId },
      data: { status: 'ABANDONED' },
      include: this._include(),
    });
  }

  /**
   * تأكيد أن الحجز تابع لورشة الفيندور (CERTIFIED_WORKSHOP).
   */
  async _assertVendorWorkshopBooking(vendorUserId, bookingId) {
    const workshop = await workshopService.getWorkshopByVendorUserId(vendorUserId);
    if (!workshop) {
      throw new AppError('No workshop linked to your account', 404, 'NOT_FOUND');
    }
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, workshopId: workshop.id },
      select: { id: true, metadata: true, workshopId: true },
    });
    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }
    return { workshop, booking };
  }

  /**
   * رحلة أكفيك المرتبطة بحجز الورشة: workshopBookingId أو metadata.akfeekJourneyId (مع التحقق من تطابق الحجز).
   */
  async _findJourneyForWorkshopBooking(bookingId, metadata) {
    let journey = await prisma.akfeekJourney.findFirst({
      where: { workshopBookingId: bookingId },
      include: { documents: { orderBy: { createdAt: 'asc' } } },
    });
    if (journey) return journey;

    const meta = metadata && typeof metadata === 'object' ? metadata : {};
    const jid = meta.akfeekJourneyId;
    if (typeof jid === 'string' && jid.length > 0) {
      journey = await prisma.akfeekJourney.findUnique({
        where: { id: jid },
        include: { documents: { orderBy: { createdAt: 'asc' } } },
      });
      if (journey && journey.workshopBookingId !== bookingId) {
        return null;
      }
    }
    return journey;
  }

  /**
   * فيندور الورشة: قائمة مستندات التأمين لرحلة أكفيك مرتبطة بالحجز (بدون fileUrl عام).
   */
  async getJourneyDocumentsForWorkshopBooking(vendorUserId, bookingId) {
    const { booking } = await this._assertVendorWorkshopBooking(vendorUserId, bookingId);
    const journey = await this._findJourneyForWorkshopBooking(booking.id, booking.metadata);

    if (!journey) {
      return {
        hasAkfeekJourney: false,
        journey: null,
        documents: [],
      };
    }

    const documents = (journey.documents || []).map((d) => ({
      id: d.id,
      label: d.label,
      originalName: d.originalName,
      mimeType: d.mimeType,
      createdAt: d.createdAt,
    }));

    return {
      hasAkfeekJourney: true,
      journey: {
        id: journey.id,
        status: journey.status,
        currentStep: journey.currentStep,
      },
      documents,
    };
  }

  /**
   * فيندور الورشة: مسار ملف مستند للإرسال عبر sendFile بعد التحقق.
   */
  async streamDocumentForWorkshopBooking(vendorUserId, bookingId, documentId) {
    const { booking } = await this._assertVendorWorkshopBooking(vendorUserId, bookingId);
    const journey = await this._findJourneyForWorkshopBooking(booking.id, booking.metadata);
    if (!journey) {
      throw new AppError('No Akfeek journey linked to this booking', 404, 'NOT_FOUND');
    }

    const doc = await prisma.akfeekJourneyDocument.findFirst({
      where: { id: documentId, journeyId: journey.id },
    });
    if (!doc) {
      throw new AppError('Document not found', 404, 'NOT_FOUND');
    }

    const relative = String(doc.fileUrl || '').replace(/^\/+/, '');
    if (!relative || relative.includes('..')) {
      throw new AppError('Invalid file path', 400, 'VALIDATION_ERROR');
    }
    const absolutePath = path.join(process.cwd(), relative);
    if (!fs.existsSync(absolutePath)) {
      throw new AppError('File not found on disk', 404, 'NOT_FOUND');
    }

    const mimeType = doc.mimeType || 'application/octet-stream';
    const downloadName = doc.originalName || `document-${documentId}`;

    return { absolutePath, mimeType, downloadName };
  }

  /** عميل: تنزيل مستند رحلته (بديل عن المسار العام المحظور). */
  async streamDocumentForCustomer(customerId, journeyId, documentId) {
    const journey = await prisma.akfeekJourney.findFirst({
      where: { id: journeyId, customerId },
      select: { id: true },
    });
    if (!journey) {
      throw new AppError('Journey not found', 404, 'NOT_FOUND');
    }
    const doc = await prisma.akfeekJourneyDocument.findFirst({
      where: { id: documentId, journeyId },
    });
    if (!doc) {
      throw new AppError('Document not found', 404, 'NOT_FOUND');
    }
    const relative = String(doc.fileUrl || '').replace(/^\/+/, '');
    if (!relative || relative.includes('..')) {
      throw new AppError('Invalid file path', 400, 'VALIDATION_ERROR');
    }
    const absolutePath = path.join(process.cwd(), relative);
    if (!fs.existsSync(absolutePath)) {
      throw new AppError('File not found on disk', 404, 'NOT_FOUND');
    }
    const mimeType = doc.mimeType || 'application/octet-stream';
    const downloadName = doc.originalName || `document-${documentId}`;
    return { absolutePath, mimeType, downloadName };
  }

  async listForAdmin({ page = 1, limit = 20, status } = {}) {
    const where = {};
    if (status && ['ACTIVE', 'COMPLETED', 'ABANDONED'].includes(status)) {
      where.status = status;
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.akfeekJourney.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, email: true, phone: true } },
          vehicle: { select: { id: true, plateDigits: true } },
          documents: true,
        },
      }),
      prisma.akfeekJourney.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  /** تفاصيل رحلة واحدة للأدمن: خطوات + نتيجة كل خطوة + فاتورة الورشة إن وُجدت */
  async getDetailForAdmin(journeyId) {
    const journey = await prisma.akfeekJourney.findUnique({
      where: { id: journeyId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        vehicle: { include: { vehicleModel: { include: { brand: true } } } },
        documents: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!journey) {
      throw new AppError('Journey not found', 404, 'NOT_FOUND');
    }

    const workshopInvoicePaid = await getWorkshopInvoicePaid(journey.workshopBookingId);
    let workshopInvoice = null;
    if (journey.workshopBookingId) {
      workshopInvoice = await prisma.invoice.findUnique({
        where: { bookingId: journey.workshopBookingId },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          paidAmount: true,
          invoiceNumber: true,
        },
      });
    }

    const steps = STEP_ORDER.map((key) => {
      const resolved = stepResolved(journey, key, workshopInvoicePaid);
      const isCurrent = journey.currentStep === key;
      const { outcome, bookingId } = outcomeForStep(journey, key, workshopInvoicePaid);
      return { key, resolved, isCurrent, outcome, bookingId };
    });

    return {
      journey,
      steps,
      workshopInvoice,
      workshopInvoicePaid,
    };
  }

  /** تنزيل مستند رحلة — الأدمن (بدون تقييد عميل) */
  async streamDocumentForAdmin(journeyId, documentId) {
    const journey = await prisma.akfeekJourney.findUnique({
      where: { id: journeyId },
      select: { id: true },
    });
    if (!journey) {
      throw new AppError('Journey not found', 404, 'NOT_FOUND');
    }
    const doc = await prisma.akfeekJourneyDocument.findFirst({
      where: { id: documentId, journeyId },
    });
    if (!doc) {
      throw new AppError('Document not found', 404, 'NOT_FOUND');
    }
    const relative = String(doc.fileUrl || '').replace(/^\/+/, '');
    if (!relative || relative.includes('..')) {
      throw new AppError('Invalid file path', 400, 'VALIDATION_ERROR');
    }
    const absolutePath = path.join(process.cwd(), relative);
    if (!fs.existsSync(absolutePath)) {
      throw new AppError('File not found on disk', 404, 'NOT_FOUND');
    }
    const mimeType = doc.mimeType || 'application/octet-stream';
    const downloadName = doc.originalName || `document-${documentId}`;
    return { absolutePath, mimeType, downloadName };
  }
}

module.exports = new AkfeekJourneyService();
module.exports.STEP_ORDER = STEP_ORDER;
