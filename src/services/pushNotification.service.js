const axios = require('axios');
const prisma = require('../utils/database/prisma');
const logger = require('../utils/logger/logger');

const FCM_LEGACY_URL = 'https://fcm.googleapis.com/fcm/send';

function isConfigured() {
  const key = process.env.FIREBASE_SERVER_KEY;
  return Boolean(key && String(key).trim());
}

async function sendToToken({ token, title, body, data }) {
  const key = process.env.FIREBASE_SERVER_KEY;
  if (!key) return { ok: false, skipped: true, reason: 'missing FIREBASE_SERVER_KEY' };

  const payload = {
    to: token,
    priority: 'high',
    notification: {
      title: title || 'Akfeek',
      body: body || '',
    },
    data: data || {},
  };

  const res = await axios.post(FCM_LEGACY_URL, payload, {
    headers: {
      Authorization: `key=${String(key).trim()}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  const ok = res?.data?.success === 1 || res?.data?.failure === 0;
  const error = res?.data?.results?.[0]?.error || null;
  return { ok, error, response: res.data };
}

/**
 * Send push notification to all active device tokens for a user.
 * Non-blocking in callers (catch errors).
 */
async function sendToUser(userId, { title, titleAr, message, messageAr, data }) {
  if (!isConfigured()) return { skipped: true, reason: 'not_configured' };
  if (!userId) return { skipped: true, reason: 'missing_userId' };

  const tokens = await prisma.userDeviceToken.findMany({
    where: { userId: String(userId), isActive: true },
    select: { token: true },
    take: 20, // safety
  });
  if (!tokens.length) return { skipped: true, reason: 'no_tokens' };

  const titleToSend = titleAr || title || 'Akfeek';
  const bodyToSend = messageAr || message || '';
  const results = [];

  for (const t of tokens) {
    try {
      const r = await sendToToken({
        token: t.token,
        title: titleToSend,
        body: bodyToSend,
        data: data || {},
      });
      results.push({ token: t.token, ...r });

      await prisma.userDeviceToken.update({
        where: { token: t.token },
        data: {
          lastSentAt: r.ok ? new Date() : undefined,
          lastError: r.ok ? null : (r.error || 'FCM_ERROR'),
          isActive: r.error === 'NotRegistered' || r.error === 'InvalidRegistration' ? false : undefined,
        },
      }).catch(() => null);
    } catch (e) {
      results.push({ token: t.token, ok: false, error: e.message || 'FCM_EXCEPTION' });
      await prisma.userDeviceToken.update({
        where: { token: t.token },
        data: { lastError: e.message || 'FCM_EXCEPTION' },
      }).catch(() => null);
    }
  }

  logger.info(`Push sent to user ${userId}: ${results.filter(r => r.ok).length}/${results.length}`);
  return { ok: true, results };
}

module.exports = { sendToUser, isConfigured };

