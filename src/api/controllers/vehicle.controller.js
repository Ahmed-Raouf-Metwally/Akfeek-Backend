const vehicleService = require('../../services/vehicle.service');
const vehicleDocumentService = require('../../services/vehicleDocument.service');

/**
 * Vehicle Controller
 * Handles HTTP requests for vehicle management
 */
class VehicleController {
  /**
   * Get all vehicles (admin only, paginated)
   * GET /api/vehicles/admin/all?page=1&limit=20&userId=xxx&userSearch=...&search=...
   */
  async getAllVehicles(req, res, next) {
    try {
      const { page, limit, userId, userSearch, search } = req.query;
      const result = await vehicleService.getAllVehicles({
        page: page ? parseInt(String(page), 10) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        userId: userId || undefined,
        userSearch: userSearch && String(userSearch).trim() ? String(userSearch).trim() : undefined,
        search: search && String(search).trim() ? String(search).trim() : undefined,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

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
   * Get car profile UI data from provided mobile screens.
   * GET /api/vehicles/car-profile-ui
   */
async getCarProfileUi(req, res, next) {
    try {
      res.json({
        drivingLicense: {
          status: 'expiring',
          expiryDate: '2020-03-15',
        },
        insurance: {
          status: 'expired',
          expiryDate: '2020-03-15',
        },
        maintenanceRecords: [
          {
            date: '2025-05-10',
            type: 'تغيير زيت + فلتر',
            workshopName: 'اسم الورشة',
            cost: 24,
          },
          {
            date: '2025-05-10',
            type: 'تغيير زيت + فلتر',
            workshopName: 'اسم الورشة',
            cost: 24,
          },
          {
            date: '2025-05-10',
            type: 'تغيير زيت + فلتر',
            workshopName: 'اسم الورشة',
            cost: 24,
          },
          {
            date: '2025-05-10',
            type: 'تغيير زيت + فلتر',
            workshopName: 'اسم الورشة',
            cost: 24,
          },
        ],
        maintenanceForm: {
          date: '2026-08-21',
          type: 'تغيير زيت + فلتر',
          notes: '',
        },
        car: {
          brand: 'هونداي',
          model: 'إلنترا',
          year: 2012,
          plateNumber: 'م ص ح 7/15',
          mileage: 125200,
          nextMaintenance: {
            type: 'تغيير زيت + فلتر',
            date: '2026-08-21',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getVehicleDocuments(req, res, next) {
    try {
      const { vehicleId } = req.params;
      const result = await vehicleDocumentService.list(vehicleId, req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createVehicleDocument(req, res, next) {
    try {
      const { vehicleId } = req.params;
      const result = await vehicleDocumentService.create(vehicleId, req.user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateVehicleDocument(req, res, next) {
    try {
      const { vehicleId, type } = req.params;
      const result = await vehicleDocumentService.update(vehicleId, req.user.id, type, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteVehicleDocument(req, res, next) {
    try {
      const { vehicleId, type } = req.params;
      const result = await vehicleDocumentService.remove(vehicleId, req.user.id, type);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async uploadVehicleDocument(req, res, next) {
    try {
      const { vehicleId, type } = req.params;
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded', code: 'VALIDATION_ERROR' });
      }
      const fileUrl = `/uploads/vehicle-documents/${req.file.filename}`;
      const result = await vehicleDocumentService.upload(vehicleId, req.user.id, type, fileUrl);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vehicle by ID
   * GET /api/vehicles/:id (admin can get any vehicle)
   */
  async getVehicleById(req, res, next) {
    try {
      const isAdmin = req.user.role === 'ADMIN';
      const vehicle = await vehicleService.getVehicleById(req.params.id, isAdmin ? null : req.user.id);

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
   * POST /api/vehicles (admin can pass body.userId to add for any user)
   */
  async addVehicle(req, res, next) {
    try {
      const isAdmin = req.user.role === 'ADMIN';
      const userId = isAdmin && req.body.userId ? req.body.userId : req.user.id;
      const vehicle = await vehicleService.addVehicle(userId, req.body);

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
   * PUT /api/vehicles/:id (admin can update any vehicle)
   */
  async updateVehicle(req, res, next) {
    try {
      const isAdmin = req.user.role === 'ADMIN';
      const vehicle = await vehicleService.updateVehicle(req.params.id, isAdmin ? null : req.user.id, req.body);

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
   * DELETE /api/vehicles/:id (admin can delete any vehicle)
   */
  async deleteVehicle(req, res, next) {
    try {
      const isAdmin = req.user.role === 'ADMIN';
      await vehicleService.deleteVehicle(req.params.id, isAdmin ? null : req.user.id);

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
