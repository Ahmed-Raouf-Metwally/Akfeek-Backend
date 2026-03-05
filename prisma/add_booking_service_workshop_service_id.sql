-- إضافة عمود workshopServiceId لجدول BookingService (ربط بخدمة الورشة المعتمدة)
-- شغّل مرة واحدة:
--   mysql -u root -p autoservice < prisma/add_booking_service_workshop_service_id.sql
-- أو نفّذ المحتوى في MySQL client.

-- 1) إضافة العمود
ALTER TABLE `BookingService`
ADD COLUMN `workshopServiceId` CHAR(36) NULL;

-- 2) المفتاح الأجنبي
ALTER TABLE `BookingService`
ADD CONSTRAINT `BookingService_workshopServiceId_fkey`
FOREIGN KEY (`workshopServiceId`) REFERENCES `CertifiedWorkshopService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) فهرس للبحث
CREATE INDEX `BookingService_workshopServiceId_idx` ON `BookingService`(`workshopServiceId`);
