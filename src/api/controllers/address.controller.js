const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Address Controller
 * CRUD for user addresses
 */
class AddressController {
  /**
   * @swagger
   * /api/addresses:
   *   get:
   *     summary: Get user addresses - جلب عناوين المستخدم
   *     description: Retrieve all addresses for the authenticated user
   *     tags: [Addresses]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of user addresses
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Address'
   *       401:
   *         description: Unauthorized - Authentication required
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
   * @swagger
   * /api/addresses/{id}:
   *   get:
   *     summary: Get address by ID - جلب عنوان بالمعرف
   *     description: Retrieve a specific address by ID (must belong to authenticated user)
   *     tags: [Addresses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Address ID
   *     responses:
   *       200:
   *         description: Address details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Address'
   *       404:
   *         description: Address not found
   *       401:
   *         description: Unauthorized
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const address = await prisma.address.findFirst({
        where: { id, userId },
      });

      if (!address) {
        throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
      }

      res.json({ success: true, message: '', data: address });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/addresses:
   *   post:
   *     summary: Create address - إضافة عنوان جديد
   *     description: Create a new address for the authenticated user
   *     tags: [Addresses]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AddressInput'
   *     responses:
   *       201:
   *         description: Address created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 messageAr:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Address'
   *       400:
   *         description: Validation error - Missing required fields
   *       401:
   *         description: Unauthorized
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
   * @swagger
   * /api/addresses/{id}:
   *   put:
   *     summary: Update address - تعديل عنوان
   *     description: Update an existing address (must belong to authenticated user)
   *     tags: [Addresses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Address ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AddressInput'
   *     responses:
   *       200:
   *         description: Address updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 messageAr:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Address'
   *       404:
   *         description: Address not found
   *       401:
   *         description: Unauthorized
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const body = req.body;

      const existing = await prisma.address.findFirst({ where: { id, userId } });
      if (!existing) {
        throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
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
   * @swagger
   * /api/addresses/{id}:
   *   delete:
   *     summary: Delete address - حذف عنوان
   *     description: Delete an address (must belong to authenticated user)
   *     tags: [Addresses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Address ID
   *     responses:
   *       200:
   *         description: Address deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 messageAr:
   *                   type: string
   *                 data:
   *                   type: object
   *       404:
   *         description: Address not found
   *       401:
   *         description: Unauthorized
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const existing = await prisma.address.findFirst({ where: { id, userId } });
      if (!existing) {
        throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
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
