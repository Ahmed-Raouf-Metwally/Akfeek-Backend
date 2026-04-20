/**
 * Utility for constructing full URLs for uploaded files
 * Returns full URL including domain (e.g., https://akfeek-backend.developteam.site/uploads/...)
 */

const DEFAULT_PUBLIC_BASE_URL = 'https://akfeek-backend.developteam.site';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || DEFAULT_PUBLIC_BASE_URL).replace(/\/+$/, '');

/**
 * Get full URL for an uploaded file path
 * @param {string} path - The relative path (e.g., '/uploads/vendors/abc/image.jpg')
 * @returns {string} Full URL with domain
 */
function getFullUrl(path) {
  if (!path) return null;
  let p = String(path).trim();
  // Fix mistaken double-origin storage (e.g. http://hosthttp://host/uploads/...)
  const dupOrigin = p.match(/^(https?:\/\/[^/]+)(https?:\/\/.+)/i);
  if (dupOrigin) p = dupOrigin[2];
  // If already a full URL, return as-is
  if (p.startsWith('http://') || p.startsWith('https://')) {
    return p;
  }
  // Ensure path starts with /
  const normalizedPath = p.startsWith('/') ? p : `/${p}`;
  return `${PUBLIC_BASE_URL}${normalizedPath}`;
}

module.exports = {
  PUBLIC_BASE_URL,
  getFullUrl,
};