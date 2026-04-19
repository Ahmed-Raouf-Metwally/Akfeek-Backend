const vendorWorkshopOfferService = require('../../services/vendorWorkshopOffer.service');

async function listByWorkshop(req, res, next) {
  try {
    const { id: workshopId } = req.params;
    const { vehicleModelId } = req.query;
    const data = await vendorWorkshopOfferService.listPublicOffers(workshopId, { vehicleModelId });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function listMine(req, res, next) {
  try {
    const data = await vendorWorkshopOfferService.listMyOffers(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const created = await vendorWorkshopOfferService.createOffer(req.user.id, req.body);
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const updated = await vendorWorkshopOfferService.updateOffer(req.user.id, req.params.offerId, req.body);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const data = await vendorWorkshopOfferService.deleteOffer(req.user.id, req.params.offerId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function purchaseBundle(req, res, next) {
  try {
    const { id: workshopId, offerId } = req.params;
    const { scheduledDate, vehicleId, addressId, notes } = req.body || {};
    const result = await vendorWorkshopOfferService.purchaseBundle(req.user.id, workshopId, offerId, {
      scheduledDate,
      vehicleId,
      addressId,
      notes,
    });
    res.status(201).json({
      success: true,
      message: 'Bundle purchase created; pay the invoice to activate uses',
      messageAr: 'تم إنشاء شراء الباقة؛ ادفع الفاتورة لتفعيل الاستخدامات',
      data: result,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listByWorkshop,
  listMine,
  create,
  update,
  remove,
  purchaseBundle,
};
