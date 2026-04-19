const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');
const { getFullUrl } = require('../../utils/urlUtils');

function normalizePosition(pos) {
  if (!pos) return null;
  const p = String(pos).trim().toUpperCase();
  const validPositions = ['TOP', 'BOTTOM', 'AUTO_PARTS', 'CAR_WASH'];
  if (!validPositions.includes(p)) return null;
  return p;
}

function mapBannersWithAbsoluteImageUrls(banners) {
  return banners.map((b) => ({
    ...b,
    images: (b.images || []).map((img) => ({
      ...img,
      imageUrl: getFullUrl(img.imageUrl),
    })),
  }));
}

const bannerSelect = {
  id: true,
  position: true,
  title: true,
  titleAr: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  images: {
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      imageUrl: true,
      linkUrl: true,
      sortOrder: true,
      createdAt: true,
    },
  },
};

// GET /api/banners?position=TOP|BOTTOM
async function getPublic(req, res, next) {
  try {
    const position = normalizePosition(req.query.position);
    const whereBase = { isActive: true };

    if (position) {
      const items = await prisma.banner.findMany({
        where: { ...whereBase, position },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: bannerSelect,
      });
      return res.json({ success: true, data: mapBannersWithAbsoluteImageUrls(items) });
    }

    const [top, bottom, autoParts, carWash] = await Promise.all([
      prisma.banner.findMany({
        where: { ...whereBase, position: 'TOP' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: bannerSelect,
      }),
      prisma.banner.findMany({
        where: { ...whereBase, position: 'BOTTOM' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: bannerSelect,
      }),
      prisma.banner.findMany({
        where: { ...whereBase, position: 'AUTO_PARTS' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: bannerSelect,
      }),
      prisma.banner.findMany({
        where: { ...whereBase, position: 'CAR_WASH' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: bannerSelect,
      }),
    ]);

    res.json({
      success: true,
      data: {
        top: mapBannersWithAbsoluteImageUrls(top),
        bottom: mapBannersWithAbsoluteImageUrls(bottom),
        autoParts: mapBannersWithAbsoluteImageUrls(autoParts),
        carWash: mapBannersWithAbsoluteImageUrls(carWash),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/banners?position=TOP|BOTTOM
async function adminList(req, res, next) {
  try {
    const position = normalizePosition(req.query.position);
    const items = await prisma.banner.findMany({
      where: {
        ...(position ? { position } : {}),
      },
      orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: bannerSelect,
    });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/banners
async function adminCreate(req, res, next) {
  try {
    const position = normalizePosition(req.body.position);
    if (!position) throw new AppError('position is required (TOP/BOTTOM/AUTO_PARTS/CAR_WASH)', 400, 'VALIDATION_ERROR');

    const { title, titleAr, isActive, sortOrder } = req.body;

    const item = await prisma.banner.create({
      data: {
        position,
        title: title ?? null,
        titleAr: titleAr ?? null,
        isActive: isActive === undefined ? true : Boolean(isActive),
        sortOrder: sortOrder === undefined || sortOrder === null ? 0 : parseInt(sortOrder),
      },
      select: bannerSelect,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/banners/:id
async function adminUpdate(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new AppError('Banner not found', 404, 'NOT_FOUND');

    const position = req.body.position !== undefined ? normalizePosition(req.body.position) : undefined;
    if (position === null) throw new AppError('Invalid position (TOP/BOTTOM/AUTO_PARTS/CAR_WASH)', 400, 'VALIDATION_ERROR');

    const { title, titleAr, isActive, sortOrder } = req.body;

    const item = await prisma.banner.update({
      where: { id },
      data: {
        ...(position !== undefined && { position }),
        ...(title !== undefined && { title: title ?? null }),
        ...(titleAr !== undefined && { titleAr: titleAr ?? null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(sortOrder !== undefined && { sortOrder: sortOrder === null ? 0 : parseInt(sortOrder) }),
      },
      select: bannerSelect,
    });

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/banners/:id
async function adminRemove(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new AppError('Banner not found', 404, 'NOT_FOUND');
    await prisma.banner.delete({ where: { id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/banners/:id/images (multipart)
async function adminUploadImages(req, res, next) {
  try {
    const { id: bannerId } = req.params;
    const banner = await prisma.banner.findUnique({ where: { id: bannerId } });
    if (!banner) throw new AppError('Banner not found', 404, 'NOT_FOUND');
    // Detailed diagnostic logging
    const logger = require('../../utils/logger/logger');
    logger.info(`[Upload] BodyKeys: ${JSON.stringify(Object.keys(req.body))}`);
    logger.info(`[Upload] Content-Type Header: ${req.headers['content-type']}`);

    // Better file detection
    let files = [];
    if (Array.isArray(req.files)) {
      files = req.files;
    } else if (req.file) {
      files = [req.file];
    } else if (req.files && typeof req.files === 'object') {
      files = Object.values(req.files).flat();
    }

    logger.info(`[Upload] Detected ${files.length} images for banner ${bannerId}`);

    if (files.length === 0) {
      const bodyKeys = Object.keys(req.body || {}).join(', ');
      const headerType = req.headers['content-type'];
      logger.warn(`[Upload] Rejected: Absolutely no files found for banner ${bannerId}. BodyKeys: [${bodyKeys}], ContentType: ${headerType}`);
      throw new AppError(`No images found in request. (Found body keys: ${bodyKeys || 'none'}). Content-Type was: ${headerType}`, 400, 'VALIDATION_ERROR');
    }

    const linkUrl = req.body?.linkUrl ? String(req.body.linkUrl).trim() : null;

    const last = await prisma.bannerImage.findFirst({
      where: { bannerId },
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
      select: { sortOrder: true },
    });
    let nextOrder = (last?.sortOrder ?? -1) + 1;

    const imagesData = files.map((f) => {
      const imageUrl = `/uploads/banners/${bannerId}/${f.filename}`;
      const row = {
        bannerId,
        imageUrl,
        linkUrl,
        sortOrder: nextOrder,
      };
      nextOrder += 1;
      return row;
    });

    await prisma.bannerImage.createMany({ data: imagesData });

    const updated = await prisma.banner.findUnique({ where: { id: bannerId }, select: bannerSelect });
    res.status(201).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/banners/:id/images/:imageId
async function adminDeleteImage(req, res, next) {
  try {
    const { id: bannerId, imageId } = req.params;
    const img = await prisma.bannerImage.findUnique({ where: { id: imageId } });
    if (!img || img.bannerId !== bannerId) throw new AppError('Image not found', 404, 'NOT_FOUND');
    await prisma.bannerImage.delete({ where: { id: imageId } });
    const updated = await prisma.banner.findUnique({ where: { id: bannerId }, select: bannerSelect });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPublic,
  adminList,
  adminCreate,
  adminUpdate,
  adminRemove,
  adminUploadImages,
  adminDeleteImage,
};



