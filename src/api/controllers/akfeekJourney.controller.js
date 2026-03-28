const akfeekJourneyService = require('../../services/akfeekJourney.service');
const { AppError } = require('../middlewares/error.middleware');

async function start(req, res, next) {
  try {
    const { vehicleId } = req.body || {};
    const journey = await akfeekJourneyService.start(req.user.id, vehicleId || null);
    res.status(201).json({ success: true, data: journey });
  } catch (e) {
    next(e);
  }
}

async function getMe(req, res, next) {
  try {
    const payload = await akfeekJourneyService.getMe(req.user.id);
    res.json({ success: true, data: payload });
  } catch (e) {
    next(e);
  }
}

async function skipStep(req, res, next) {
  try {
    const { id, stepKey } = req.params;
    const journey = await akfeekJourneyService.skipStep(id, req.user.id, stepKey);
    res.json({ success: true, data: journey });
  } catch (e) {
    next(e);
  }
}

async function completeDocs(req, res, next) {
  try {
    const { id } = req.params;
    const journey = await akfeekJourneyService.completeDocsStep(id, req.user.id);
    res.json({ success: true, data: journey });
  } catch (e) {
    next(e);
  }
}

async function completeDocsIfInsurance(req, res, next) {
  try {
    if (req.params.stepKey !== 'INSURANCE_DOCS') {
      throw new AppError(
        'complete is only for INSURANCE_DOCS; use skip or link for other steps',
        400,
        'VALIDATION_ERROR'
      );
    }
    const { id } = req.params;
    const journey = await akfeekJourneyService.completeDocsStep(id, req.user.id);
    res.json({ success: true, data: journey });
  } catch (e) {
    next(e);
  }
}

async function linkBooking(req, res, next) {
  try {
    const { id, stepKey } = req.params;
    const { bookingId } = req.body || {};
    if (!bookingId) throw new AppError('bookingId is required', 400, 'VALIDATION_ERROR');
    const journey = await akfeekJourneyService.linkBooking(id, req.user.id, stepKey, bookingId);
    res.json({ success: true, data: journey });
  } catch (e) {
    next(e);
  }
}

async function downloadCustomerDocument(req, res, next) {
  try {
    const { id, documentId } = req.params;
    const { absolutePath, mimeType, downloadName } = await akfeekJourneyService.streamDocumentForCustomer(
      req.user.id,
      id,
      documentId
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );
    res.sendFile(absolutePath, (err) => {
      if (err) next(err);
    });
  } catch (e) {
    next(e);
  }
}

async function uploadDocuments(req, res, next) {
  try {
    const { id } = req.params;
    const files = req.files || [];
    const labelsRaw = req.body?.labels;
    let labels;
    if (typeof labelsRaw === 'string') {
      try {
        labels = JSON.parse(labelsRaw);
      } catch {
        labels = [labelsRaw];
      }
    } else if (Array.isArray(labelsRaw)) {
      labels = labelsRaw;
    }
    const journey = await akfeekJourneyService.addDocuments(id, req.user.id, files, labels);
    res.status(201).json({ success: true, data: journey });
  } catch (e) {
    next(e);
  }
}

async function abandon(req, res, next) {
  try {
    const { id } = req.params;
    const journey = await akfeekJourneyService.abandon(id, req.user.id);
    res.json({ success: true, data: journey });
  } catch (e) {
    next(e);
  }
}

async function adminList(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status || undefined;
    const result = await akfeekJourneyService.listForAdmin({ page, limit, status });
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

async function adminGetById(req, res, next) {
  try {
    const payload = await akfeekJourneyService.getDetailForAdmin(req.params.id);
    res.json({ success: true, data: payload });
  } catch (e) {
    next(e);
  }
}

async function adminDownloadDocument(req, res, next) {
  try {
    const { id, documentId } = req.params;
    const { absolutePath, mimeType, downloadName } = await akfeekJourneyService.streamDocumentForAdmin(
      id,
      documentId
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );
    res.sendFile(absolutePath, (err) => {
      if (err) next(err);
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  start,
  getMe,
  skipStep,
  completeDocs,
  completeDocsIfInsurance,
  linkBooking,
  downloadCustomerDocument,
  uploadDocuments,
  abandon,
  adminList,
  adminGetById,
  adminDownloadDocument,
};
