const svc = require('../../services/mobileWorkshopSimpleBooking.service');
const { success } = require('../../utils/response');
const { AppError } = require('../middlewares/error.middleware');

async function getCatalog(req, res, next) {
  try {
    const data = await svc.getCatalog();
    return success(res, data, {
      message: 'Mobile workshop catalog retrieved',
      messageAr: 'تم استرجاع كاتالوج الورش المتنقلة',
    });
  } catch (err) {
    next(err);
  }
}

async function createBooking(req, res, next) {
  try {
    const customerId = req.user?.id;
    if (!customerId) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

    const data = await svc.createBooking(customerId, req.body);
    return success(res, data, {
      message: 'Mobile workshop booking created and assigned',
      messageAr: 'تم إنشاء حجز الورشة المتنقلة وتعيين أقرب ورشة',
      statusCode: 201,
    });
  } catch (err) {
    next(err);
  }
}

async function getBookingById(req, res, next) {
  try {
    const customerId = req.user?.id;
    const data = await svc.getBookingById(req.params.id, customerId);
    return success(res, data, {
      message: 'Booking retrieved',
      messageAr: 'تم استرجاع الحجز',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCatalog,
  createBooking,
  getBookingById,
};

