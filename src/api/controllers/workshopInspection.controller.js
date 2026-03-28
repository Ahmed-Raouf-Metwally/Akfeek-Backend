const workshopInspectionService = require('../../services/workshopInspection.service');

async function getMyBookingInspection(req, res, next) {
  try {
    const { bookingId } = req.params;
    const report = await workshopInspectionService.getForVendor(req.user.id, bookingId);
    res.json({ success: true, data: report });
  } catch (e) {
    next(e);
  }
}

async function upsertMyBookingInspection(req, res, next) {
  try {
    const { bookingId } = req.params;
    const result = await workshopInspectionService.upsertForVendor(req.user.id, bookingId, req.body || {});
    res.json({
      success: true,
      message: 'Inspection report saved',
      messageAr: 'تم حفظ تقرير التقييم',
      data: result,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getMyBookingInspection,
  upsertMyBookingInspection,
};
