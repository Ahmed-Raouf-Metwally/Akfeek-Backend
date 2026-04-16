const maintenanceRecordService = require('../../services/vehicleMaintenanceRecord.service');

class VehicleMaintenanceRecordController {
  async getFilters(req, res, next) {
    try {
      const data = await maintenanceRecordService.getFilters();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listAllMy(req, res, next) {
    try {
      const { types, q } = req.query;
      const maintenanceRecords = await maintenanceRecordService.listAllForUser(req.user.id, { types, q });
      res.json({ maintenanceRecords });
    } catch (error) {
      next(error);
    }
  }

  async listUpcoming(req, res, next) {
    try {
      const upcomingMaintenance = await maintenanceRecordService.listUpcoming(req.user.id);
      res.json({ upcomingMaintenance });
    } catch (error) {
      next(error);
    }
  }

  async getNextMaintenance(req, res, next) {
    try {
      const result = await maintenanceRecordService.getNextMaintenance(req.params.vehicleId, req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const { types, q } = req.query;
      const maintenanceRecords = await maintenanceRecordService.list(req.params.vehicleId, req.user.id, {
        types,
        q,
      });
      res.json({ maintenanceRecords });
    } catch (error) {
      next(error);
    }
  }

  async get(req, res, next) {
    try {
      const maintenance = await maintenanceRecordService.get(
        req.params.vehicleId,
        req.params.recordId,
        req.user.id
      );
      res.json({ maintenance });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const maintenance = await maintenanceRecordService.create(req.params.vehicleId, req.user.id, req.body);
      res.status(201).json({ maintenance });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const maintenance = await maintenanceRecordService.update(
        req.params.vehicleId,
        req.params.recordId,
        req.user.id,
        req.body
      );
      res.json({ maintenance });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await maintenanceRecordService.delete(req.params.vehicleId, req.params.recordId, req.user.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VehicleMaintenanceRecordController();
