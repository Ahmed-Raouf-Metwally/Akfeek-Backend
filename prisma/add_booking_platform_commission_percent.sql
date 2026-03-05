-- إضافة عمود platformCommissionPercent لجدول Booking (نسبة عمولة المنصة المسجلة وقت الحجز)
-- تغيير النسبة لاحقاً يؤثر على الحجوزات القادمة فقط.
-- شغّل مرة واحدة: mysql -u root -p autoservice < prisma/add_booking_platform_commission_percent.sql

ALTER TABLE `Booking`
ADD COLUMN `platformCommissionPercent` DOUBLE NULL;
