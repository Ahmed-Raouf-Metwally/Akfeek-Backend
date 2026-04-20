const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

function normalizePlatform(v) {
  const p = String(v || '').trim().toUpperCase();
  if (!p) return 'OTHER';
  if (['ANDROID', 'IOS', 'WEB', 'OTHER'].includes(p)) return p;
  return 'OTHER';
}

/**
 * POST /api/notifications/device-token
 * Body: { token, platform?, deviceId? }
 */
async function upsertMyDeviceToken(req, res, next) {
  try {
    const token = String(req.body?.token || req.body?.fcm_token || req.body?.fcmToken || '').trim();
    if (!token) throw new AppError('token is required', 400, 'VALIDATION_ERROR');

    const platform = normalizePlatform(req.body?.platform);
    const deviceId = req.body?.deviceId != null && String(req.body.deviceId).trim() ? String(req.body.deviceId).trim() : null;

    const row = await prisma.userDeviceToken.upsert({
      where: { token },
      update: {
        userId: req.user.id,
        isActive: true,
        platform,
        deviceId,
        lastSeenAt: new Date(),
        lastError: null,
      },
      create: {
        userId: req.user.id,
        token,
        platform,
        deviceId,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });

    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/notifications/device-token
 * Body: { token }
 */
async function deactivateMyDeviceToken(req, res, next) {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) throw new AppError('token is required', 400, 'VALIDATION_ERROR');

    const existing = await prisma.userDeviceToken.findUnique({ where: { token } });
    if (!existing || existing.userId !== req.user.id) {
      throw new AppError('Device token not found', 404, 'NOT_FOUND');
    }

    await prisma.userDeviceToken.update({
      where: { token },
      data: { isActive: false, lastSeenAt: new Date() },
    });

    res.json({ success: true, data: { deactivated: true } });
  } catch (e) {
    next(e);
  }
}

module.exports = { upsertMyDeviceToken, deactivateMyDeviceToken };

