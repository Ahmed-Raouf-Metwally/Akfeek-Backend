-- Insert Certified Workshops
INSERT INTO `CertifiedWorkshop` (
  `id`, `name`, `nameAr`, `description`, `descriptionAr`,
  `address`, `addressAr`, `city`, `cityAr`,
  `latitude`, `longitude`, `phone`, `email`,
  `workingHours`, `services`,
  `averageRating`, `totalReviews`, `totalBookings`,
  `isActive`, `isVerified`, `verifiedAt`,
  `createdAt`, `updatedAt`
) VALUES
(
  UUID(), 'Al-Salam Auto Center', 'مركز السلام للسيارات',
  'Professional auto repair and maintenance center with certified technicians.',
  'مركز صيانة وإصلاح سيارات احترافي مع فنيين معتمدين.',
  'King Fahd Road, Al-Olaya District', 'طريق الملك فهد، حي العليا',
  'Riyadh', 'الرياض',
  24.7136, 46.6753,
  '+966112345001', 'info@alsalam-auto.sa',
  '{"sunday":{"open":"08:00","close":"18:00"},"monday":{"open":"08:00","close":"18:00"},"tuesday":{"open":"08:00","close":"18:00"},"wednesday":{"open":"08:00","close":"18:00"},"thursday":{"open":"08:00","close":"18:00"},"saturday":{"open":"09:00","close":"15:00"}}',
  '["Engine Repair","Brake Service","Oil Change","Transmission Repair","AC Repair"]',
  4.7, 128, 450,
  1, 1, NOW(),
  NOW(), NOW()
),
(
  UUID(), 'Elite Motors Workshop', 'ورشة إيليت موتورز',
  'Specialized in luxury vehicles maintenance and repair.',
  'متخصصون في صيانة وإصلاح المركبات الفاخرة.',
  'Tahlia Street', 'شارع التحلية',
  'Jeddah', 'جدة',
  21.5433, 39.1728,
  '+966122345002', 'contact@elitemotors.sa',
  '{"sunday":{"open":"09:00","close":"19:00"},"monday":{"open":"09:00","close":"19:00"},"tuesday":{"open":"09:00","close":"19:00"},"wednesday":{"open":"09:00","close":"19:00"},"thursday":{"open":"09:00","close":"19:00"},"saturday":{"open":"10:00","close":"16:00"}}',
  '["Engine Repair","Brake Service","Oil Change","AC Repair","Tire Service"]',
  4.9, 210, 680,
  1, 1, NOW(),
  NOW(), NOW()
),
(
  UUID(), 'Quick Fix Auto Service', 'كويك فكس لخدمات السيارات',
  'Fast and reliable auto service for all car brands.',
  'خدمة سيارات سريعة وموثوقة لجميع العلامات التجارية.',
  'King Abdul Aziz Road', 'طريق الملك عبدالعزيز',
  'Dammam', 'الدمام',
  26.4207, 50.0888,
  '+966133345003', 'service@quickfix.sa',
  '{"sunday":{"open":"07:00","close":"17:00"},"monday":{"open":"07:00","close":"17:00"},"tuesday":{"open":"07:00","close":"17:00"},"wednesday":{"open":"07:00","close":"17:00"},"thursday":{"open":"07:00","close":"17:00"},"saturday":{"open":"08:00","close":"14:00"}}',
  '["Oil Change","Brake Service","Tire Rotation","Battery Replacement","AC Service"]',
  4.5, 95, 320,
  1, 1, NOW(),
  NOW(), NOW()
),
(
  UUID(), 'Pro Auto Care', 'برو أوتو كير',
  'Comprehensive auto care services with modern equipment.',
  'خدمات رعاية سيارات شاملة بمعدات حديثة.',
  'Prince Sultan Road', 'طريق الأمير سلطان',
  'Riyadh', 'الرياض',
  24.6900, 46.6850,
  '+966112345004', 'info@proautocare.sa',
  '{"sunday":{"open":"08:30","close":"18:30"},"monday":{"open":"08:30","close":"18:30"},"tuesday":{"open":"08:30","close":"18:30"},"wednesday":{"open":"08:30","close":"18:30"},"thursday":{"open":"08:30","close":"18:30"},"saturday":{"open":"09:00","close":"15:00"}}',
  '["Engine Diagnostic","Transmission Service","Brake System","Electrical Repair","Body Work"]',
  4.3, 67, 180,
  1, 0, NULL,
  NOW(), NOW()
);

-- Check results
SELECT COUNT(*) as total_workshops FROM `CertifiedWorkshop`;
SELECT name, city, isVerified, averageRating FROM `CertifiedWorkshop`;
