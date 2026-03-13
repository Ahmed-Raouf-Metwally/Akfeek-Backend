/**
 * Role labels for UI (no technical keys).
 */

const ROLE_LABELS = {
  CUSTOMER:   { en: 'Customer' },
  ADMIN:      { en: 'Admin' },
  EMPLOYEE:   { en: 'Akfeek Employee' },
  VENDOR:     { en: 'Vendor' },
  TECHNICIAN: { en: 'Technician' },
  SUPPLIER:   { en: 'Vendor' },
};

function getRoleLabels(role) {
  if (!role) return { roleLabelEn: '' };
  const labels = ROLE_LABELS[role] || { en: role };
  return { roleLabelEn: labels.en };
}

function withRoleLabels(obj) {
  if (!obj || obj.role == null) return obj;
  const labels = getRoleLabels(obj.role);
  return { ...obj, ...labels };
}

module.exports = { ROLE_LABELS, getRoleLabels, withRoleLabels };
