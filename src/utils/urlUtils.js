/**
 * Utility for constructing full URLs for uploaded files
 * Returns full URL including domain (e.g., https://akfeek-backend.developteam.site/uploads/...)
 */

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Get full URL for an uploaded file path
 * @param {string} path - The relative path (e.g., '/uploads/vendors/abc/image.jpg')
 * @returns {string} Full URL with domain
 */
function getFullUrl(path) {
  if (!path) return null;
  // If already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${PUBLIC_BASE_URL}${normalizedPath}`;
}

module.exports = {
  PUBLIC_BASE_URL,
  getFullUrl,
};