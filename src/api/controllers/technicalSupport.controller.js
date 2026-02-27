const technicalSupportService = require('../../services/technicalSupport.service');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Technical Support Request Controller (طلب دعم فني)
 * Customer: create, get my requests, get one. Admin: list, get one, assign technician, update status.
 */
class TechnicalSupportController {
  /** Customer: submit new request */
  async create(req, res, next) {
    try {
      const request = await technicalSupportService.create(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Technical support request submitted successfully',
        messageAr: 'تم تقديم طلب الدعم الفني بنجاح',
        data: request
      });
    } catch (err) {
      next(err);
    }
  }

  /** Customer: get my requests */
  async getMyRequests(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const result = await technicalSupportService.getMyRequests(req.user.id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status: status || undefined
      });
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  /** Get tracking info (customer: own, admin: any) - للعميل لمتابعة الفني */
  async getTrack(req, res, next) {
    try {
      const data = await technicalSupportService.getTrackingInfo(
        req.params.id,
        req.user.id,
        req.user.role
      );
      res.json({
        success: true,
        message: 'Tracking info',
        messageAr: 'معلومات التتبع',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  /** Get single request (customer: own, admin: any) */
  async getById(req, res, next) {
    try {
      const request = await technicalSupportService.getById(
        req.params.id,
        req.user.id,
        req.user.role
      );
      res.json({
        success: true,
        data: request
      });
    } catch (err) {
      next(err);
    }
  }

  /** Admin: list all requests */
  async adminList(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const result = await technicalSupportService.adminList({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status: status || undefined
      });
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  /** Admin: assign technician to request */
  async assignTechnician(req, res, next) {
    try {
      const { id } = req.params;
      const { technicianId } = req.body;
      if (!technicianId) {
        throw new AppError('technicianId is required', 400, 'VALIDATION_ERROR');
      }
      const request = await technicalSupportService.assignTechnician(
        id,
        technicianId,
        req.user.id
      );
      res.json({
        success: true,
        message: 'Technician assigned successfully',
        messageAr: 'تم تعيين الفني بنجاح',
        data: request
      });
    } catch (err) {
      next(err);
    }
  }

  /** Technician: list technical support requests assigned to me (طلبات الدعم الفني المعينة لي) */
  async getMyAssignedRequests(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const result = await technicalSupportService.getAssignedToTechnician(req.user.id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status: status || undefined
      });
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  /** Admin: list technicians (for assign dropdown) */
  async getTechnicians(req, res, next) {
    try {
      const list = await technicalSupportService.getTechnicians();
      res.json({
        success: true,
        data: list
      });
    } catch (err) {
      next(err);
    }
  }

  /** Admin: update request status */
  async adminUpdateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const request = await technicalSupportService.adminUpdateStatus(
        id,
        status,
        req.user.id,
        notes
      );
      res.json({
        success: true,
        message: 'Request status updated',
        messageAr: 'تم تحديث حالة الطلب',
        data: request
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TechnicalSupportController();
