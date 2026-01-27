const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Get all products (Admin). Paginated list.
 * GET /api/products
 */
async function getAllProducts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const category = req.query.category || null;
    const activeOnly = req.query.activeOnly !== 'false';
    const skip = (page - 1) * limit;

    const where = {};
    if (category) where.category = category;
    if (activeOnly) where.isActive = true;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          sku: true,
          name: true,
          nameAr: true,
          category: true,
          brand: true,
          price: true,
          stockQuantity: true,
          isActive: true,
          isFeatured: true,
          imageUrl: true,
          createdAt: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single product by id (Admin).
 * GET /api/products/:id
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }
    res.json({ success: true, message: '', data: product });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllProducts, getProductById };
