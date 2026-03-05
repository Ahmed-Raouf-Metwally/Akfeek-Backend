/**
 * مفاتيح صلاحيات موظف أكفيك — الأدمن يتحكم فيها ديناميكياً.
 * الموظف يرى في الداشبورد فقط الأقسام التي له فيها صلاحية.
 */

const PERMISSION_KEYS = [
  'bookings',         // الحجوزات
  'vendors',          // الفيندورات
  'vehicles',         // المركبات
  'workshops',        // الورش المعتمدة
  'winches',          // الوينشات
  'mobile_workshops', // الورش المتنقلة
  'invoices',         // الفواتير
  'payments',         // المدفوعات
  'users',            // المستخدمين
  'settings',         // إعدادات النظام
  'finance',          // التقارير المالية / عمولة المنصة
  'feedback',         // الشكاوى والاقتراحات
];

/** وصف عربي لكل صلاحية (للعرض في واجهة الأدمن) */
const PERMISSION_LABELS = {
  bookings: 'الحجوزات',
  vendors: 'الفيندورات',
  vehicles: 'المركبات',
  workshops: 'الورش المعتمدة',
  winches: 'الوينشات',
  mobile_workshops: 'الورش المتنقلة',
  invoices: 'الفواتير',
  payments: 'المدفوعات',
  users: 'المستخدمين',
  settings: 'إعدادات النظام',
  finance: 'التقارير المالية',
  feedback: 'الشكاوى والاقتراحات',
};

function isValidPermissionKey(key) {
  return typeof key === 'string' && PERMISSION_KEYS.includes(key);
}

module.exports = {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  isValidPermissionKey,
};
