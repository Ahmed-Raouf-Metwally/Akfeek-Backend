const mobileWorkshopRequestService = require('../../services/mobileWorkshopRequest.service');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Customer: create mobile workshop request (broadcast to matching workshops)
 * POST /api/mobile-workshop-requests
 * Body: vehicleId, addressId?, latitude?, longitude?, addressText?, city?, workshopTypeId, workshopTypeServiceId? (الخدمة من النوع), serviceType?
 */
async function createRequest(req, res, next) {
  try {
    const result = await mobileWorkshopRequestService.createRequest(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Request created; workshops notified',
      messageAr: 'تم إنشاء الطلب وإشعار الورش',
      ...result,
    });
  } catch (err) { next(err); }
}

/**
 * Customer: get my requests
 * GET /api/mobile-workshop-requests?status=&page=&limit=
 */
async function getMyRequests(req, res, next) {
  try {
    const result = await mobileWorkshopRequestService.getMyRequests(req.user.id, req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

/**
 * Customer: get single request with offers
 * GET /api/mobile-workshop-requests/:id
 */
async function getRequestById(req, res, next) {
  try {
    const data = await mobileWorkshopRequestService.getRequestById(req.params.id, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Vendor: get pending requests for my mobile workshop
 * GET /api/mobile-workshops/my/requests
 */
async function getRequestsForMyWorkshop(req, res, next) {
  try {
    const result = await mobileWorkshopRequestService.getRequestsForMyWorkshop(req.user.id);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

/**
 * Vendor: submit offer for a request
 * POST /api/mobile-workshops/:workshopId/requests/:requestId/offer
 * Body: price?, message?, mobileWorkshopServiceId?
 */
async function submitOffer(req, res, next) {
  try {
    const { workshopId, requestId } = req.params;
    const result = await mobileWorkshopRequestService.submitOffer(
      workshopId,
      requestId,
      req.user.id,
      req.body
    );
    res.status(201).json({
      success: true,
      message: 'Offer submitted',
      messageAr: 'تم إرسال العرض',
      ...result,
    });
  } catch (err) { next(err); }
}

/**
 * Vendor: reject request (رفض الطلب)
 * POST /api/mobile-workshops/:workshopId/requests/:requestId/reject
 */
async function rejectRequest(req, res, next) {
  try {
    const { workshopId, requestId } = req.params;
    const result = await mobileWorkshopRequestService.rejectRequest(workshopId, requestId, req.user.id);
    res.json({
      success: true,
      message: result.message,
      messageAr: result.messageAr,
    });
  } catch (err) { next(err); }
}

/**
 * Customer: select an offer (وعند "موافقة فقط" يلزم إرسال mobileWorkshopServiceId)
 * POST /api/mobile-workshop-requests/:requestId/select-offer
 * Body: { offerId, mobileWorkshopServiceId? } — إذا الفيندور وافق فقط بدون سعر، العميل يختار خدمة من قائمة الخدمات
 */
async function selectOffer(req, res, next) {
  try {
    const { requestId } = req.params;
    const { offerId, mobileWorkshopServiceId } = req.body;
    if (!offerId) throw new AppError('offerId is required', 400, 'VALIDATION_ERROR');
    const result = await mobileWorkshopRequestService.selectOffer(requestId, offerId, req.user.id, { mobileWorkshopServiceId });
    res.json({
      success: true,
      message: 'Offer selected; booking and invoice created',
      messageAr: 'تم اختيار العرض؛ تم إنشاء الحجز والفاتورة',
      ...result,
    });
  } catch (err) { next(err); }
}

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  getRequestsForMyWorkshop,
  submitOffer,
  rejectRequest,
  selectOffer,
};
