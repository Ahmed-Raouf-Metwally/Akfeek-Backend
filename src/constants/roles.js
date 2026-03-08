/**
 * تسميات أدوار المستخدمين للعرض في الواجهة (بدون مفاتيح تقنية مثل users.roles.EMPLOYEE)
 */

const ROLE_LABELS = {
  CUSTOMER:   { ar: 'عميل',       en: 'Customer' },
  ADMIN:      { ar: 'مسؤول',      en: 'Admin' },
  EMPLOYEE:   { ar: 'موظف اكفيك', en: 'Akfeek Employee' },
  VENDOR:     { ar: 'مورد',       en: 'Vendor' },
  TECHNICIAN: { ar: 'فني',        en: 'Technician' },
  SUPPLIER:   { ar: 'مورد',       en: 'Vendor' }, // legacy — display as vendor
};

function getRoleLabels(role) {
  if (!role) return { roleLabelAr: '', roleLabelEn: '' };
  const labels = ROLE_LABELS[role] || { ar: role, en: role };
  return { roleLabelAr: labels.ar, roleLabelEn: labels.en };
}

function withRoleLabels(obj) {
  if (!obj || obj.role == null) return obj;
  const labels = getRoleLabels(obj.role);
  return { ...obj, ...labels };
}

module.exports = { ROLE_LABELS, getRoleLabels, withRoleLabels };
