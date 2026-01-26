const vehicleService = require('../../services/vehicle.service');

/**
 * Vehicle Controller
 * Handles HTTP requests for vehicle management
 */
class VehicleController {
  /**
   * Get all vehicles for current user
   * GET /api/vehicles
   */
  async getMyVehicles(req, res, next) {
    try {
      const vehicles = await vehicleService.getUserVehicles(req.user.id);

      res.json({
        success: true,
        data: vehicles
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vehicle by ID
   * GET /api/vehicles/:id
   */
  async getVehicleById(req, res, next) {
    try {
      const vehicle = await vehicleService.getVehicleById(req.params.id, req.user.id);

      res.json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add new vehicle
   * POST /api/vehicles
   */
  async addVehicle(req, res, next) {
    try {
      const vehicle = await vehicleService.addVehicle(req.user.id, req.body);

      res.status(201).json({
        success: true,
        message: 'Vehicle added successfully',
        messageAr: 'تمت إضافة المركبة بنجاح',
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update vehicle
   * PUT /api/vehicles/:id
   */
  async updateVehicle(req, res, next) {
    try {
      const vehicle = await vehicleService.updateVehicle(req.params.id, req.user.id, req.body);

      res.json({
        success: true,
        message: 'Vehicle updated successfully',
        messageAr: 'تم تحديث المركبة بنجاح',
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete vehicle
   * DELETE /api/vehicles/:id
   */
  async deleteVehicle(req, res, next) {
    try {
      await vehicleService.deleteVehicle(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Vehicle deleted successfully',
        messageAr: 'تم حذف المركبة بنجاح'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set vehicle as primary
   * PATCH /api/vehicles/:id/primary
   */
  async setPrimary(req, res, next) {
    try {
      const vehicle = await vehicleService.setPrimaryVehicle(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Primary vehicle updated',
        messageAr: 'تم تحديث المركبة الرئيسية',
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vehicle brands catalog
   * GET /api/vehicles/brands
   */
  async getVehicleBrands(req, res, next) {
    try {
      const brands = await vehicleService.getVehicleBrands();

      res.json({
        success: true,
        data: brands
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vehicle models for a specific brand
   * GET /api/vehicles/brands/:brandId/models
   */
  async getVehicleModels(req, res, next) {
    try {
      const { brandId } = req.params;
      const { year, size } = req.query;

      const models = await vehicleService.getVehicleModels(brandId, { year, size });

      res.json({
        success: true,
        data: models
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vehicle masters catalog (DEPRECATED - use getVehicleBrands instead)
   * GET /api/vehicles/masters
   */
  async getVehicleMasters(req, res, next) {
    try {
      const { make, model, yearFrom, yearTo, size } = req.query;
      const masters = await vehicleService.getVehicleMasters({ make, model, yearFrom, yearTo, size });

      res.json({
        success: true,
        data: masters
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VehicleController();
