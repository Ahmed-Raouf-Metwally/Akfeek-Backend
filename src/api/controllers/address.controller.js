const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Address Controller
 * CRUD for user addresses
 */
class AddressController {
  /**
   * Get current user's addresses
   * GET /api/addresses
   */
  async getMyAddresses(req, res, next) {
    try {
      const userId = req.user.id;

      const addresses = await prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      res.json({ success: true, message: '', data: addresses });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get address by id (must belong to user)
   * GET /api/addresses/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const address = await prisma.address.findFirst({
        where: { id, userId },
      });

      if (!address) {
        throw new AppError('Address not found', 404, 'NOT_FOUND');
      }

      res.json({ success: true, message: '', data: address });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create address
   * POST /api/addresses
   */
  async create(req, res, next) {
    try {
      const userId = req.user.id;
      const body = req.body;

      const { label, labelAr, street, streetAr, city, cityAr, state, stateAr, postalCode, country, latitude, longitude, isDefault } = body;

      if (!label || !street || !city || latitude == null || longitude == null) {
        throw new AppError('label, street, city, latitude, longitude are required', 400, 'VALIDATION_ERROR');
      }

      if (isDefault) {
        await prisma.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const address = await prisma.address.create({
        data: {
          userId,
          label,
          labelAr: labelAr ?? null,
          street,
          streetAr: streetAr ?? null,
          city,
          cityAr: cityAr ?? null,
          state: state ?? null,
          stateAr: stateAr ?? null,
          postalCode: postalCode ?? null,
          country: country ?? 'SA',
          latitude: Number(latitude),
          longitude: Number(longitude),
          isDefault: Boolean(isDefault),
        },
      });

      res.status(201).json({
        success: true,
        message: 'Address created successfully',
        messageAr: 'تم إنشاء العنوان بنجاح',
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update address
   * PUT /api/addresses/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const body = req.body;

      const existing = await prisma.address.findFirst({ where: { id, userId } });
      if (!existing) {
        throw new AppError('Address not found', 404, 'NOT_FOUND');
      }

      const { isDefault } = body;
      if (isDefault) {
        await prisma.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const allow = ['label', 'labelAr', 'street', 'streetAr', 'city', 'cityAr', 'state', 'stateAr', 'postalCode', 'country', 'latitude', 'longitude', 'isDefault'];
      const data = {};
      for (const k of allow) {
        if (body[k] !== undefined) data[k] = body[k];
      }
      if (data.latitude != null) data.latitude = Number(data.latitude);
      if (data.longitude != null) data.longitude = Number(data.longitude);

      const address = await prisma.address.update({
        where: { id },
        data,
      });

      res.json({
        success: true,
        message: 'Address updated successfully',
        messageAr: 'تم تحديث العنوان بنجاح',
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete address
   * DELETE /api/addresses/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const existing = await prisma.address.findFirst({ where: { id, userId } });
      if (!existing) {
        throw new AppError('Address not found', 404, 'NOT_FOUND');
      }

      await prisma.address.delete({ where: { id } });

      res.json({
        success: true,
        message: 'Address deleted successfully',
        messageAr: 'تم حذف العنوان بنجاح',
        data: {},
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AddressController();
