const packageService = require('../../services/package.service');
const { success } = require('../../utils/response');

class PackagesController {
  async getAllPackages(req, res, next) {
    try {
      const packages = await packageService.getAllPackages({
        isActive: req.query.activeOnly !== 'false',
        includeServices: true,
        dealType: req.query.dealType,
      });
      return success(res, packages, { message: 'Packages retrieved successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getPackageById(req, res, next) {
    try {
      const pkg = await packageService.getPackageById(req.params.id, true);
      return success(res, pkg, { message: 'Package retrieved successfully' });
    } catch (error) {
      next(error);
    }
  }

  async createPackage(req, res, next) {
    try {
      const pkg = await packageService.createPackage(req.body);
      return success(res, pkg, { message: 'Package created successfully', statusCode: 201 });
    } catch (error) {
      next(error);
    }
  }

  async updatePackage(req, res, next) {
    try {
      const pkg = await packageService.updatePackage(req.params.id, req.body);
      return success(res, pkg, { message: 'Package updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  async deletePackage(req, res, next) {
    try {
      await packageService.deletePackage(req.params.id);
      return success(res, null, { message: 'Package deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getAllServices(req, res, next) {
    try {
      const services = await packageService.getAllServices();
      return success(res, services, { message: 'Services retrieved successfully' });
    } catch (error) {
      next(error);
    }
  }

  async purchasePackage(req, res, next) {
    try {
      const userId = req.user.id;
      const { packageId } = req.body;
      
      if (!packageId) {
        return res.status(400).json({ success: false, message: 'Package ID is required' });
      }

      const userPackage = await packageService.purchasePackage(userId, packageId);
      return success(res, userPackage, { message: 'Package purchased successfully', statusCode: 201 });
    } catch (error) {
      next(error);
    }
  }

  async getUserPackages(req, res, next) {
    try {
      const userId = req.user.id;
      const includeExpired = req.query.includeExpired === 'true';
      
      const packages = await packageService.getUserPackages(userId, includeExpired);
      return success(res, packages, { message: 'User packages retrieved successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getUserPackageById(req, res, next) {
    try {
      const userId = req.user.id;
      const userPackage = await packageService.getUserPackageById(userId, req.params.id);
      return success(res, userPackage, { message: 'Package details retrieved successfully' });
    } catch (error) {
      next(error);
    }
  }

  async applyPackageToBooking(req, res, next) {
    try {
      const userId = req.user.id;
      const { bookingId, userPackageId, serviceId } = req.body;
      
      if (!bookingId || !userPackageId || !serviceId) {
        return res.status(400).json({ success: false, message: 'bookingId, userPackageId, and serviceId are required' });
      }

      const result = await packageService.applyPackageToBooking(userId, bookingId, userPackageId, serviceId);
      return success(res, result, { message: 'Package applied successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getEligiblePackages(req, res, next) {
    try {
      const { serviceIds } = req.query;
      
      if (!serviceIds) {
        return res.status(400).json({ success: false, message: 'serviceIds query parameter is required' });
      }

      const ids = serviceIds.split(',');
      const packages = await packageService.getEligiblePackages(ids);
      return success(res, packages, { message: 'Eligible packages retrieved successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getUserEligiblePackages(req, res, next) {
    try {
      const userId = req.user.id;
      const { serviceIds } = req.query;
      
      if (!serviceIds) {
        return res.status(400).json({ success: false, message: 'serviceIds query parameter is required' });
      }

      const ids = serviceIds.split(',');
      const packages = await packageService.getUserEligiblePackages(userId, ids);
      return success(res, packages, { message: 'User eligible packages retrieved successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getAllSubscriptions(req, res, next) {
    try {
      const { packageId, isActive, search } = req.query;
      const subscriptions = await packageService.getAllSubscriptions({
        packageId,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        search
      });
      return success(res, subscriptions, { message: 'Subscriptions retrieved successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PackagesController();
