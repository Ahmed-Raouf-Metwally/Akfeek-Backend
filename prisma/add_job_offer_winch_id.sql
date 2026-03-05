-- إضافة عمود winchId لجدول JobOffer (مطلوب لفلو الوينش)
-- شغّل مرة واحدة من مجلد المشروع:
--   mysql -u root -p autoservice < prisma/add_job_offer_winch_id.sql
-- أو نفّذ المحتوى في MySQL client (phpMyAdmin, DBeaver, إلخ).
-- إذا لم يكن عمود status موجوداً، شغّل أولاً: prisma/add_job_offer_status.sql

-- 1) إضافة العمود
ALTER TABLE `JobOffer`
ADD COLUMN `winchId` CHAR(36) NULL;

-- 2) المفتاح الأجنبي (يُنشئ فهرساً تلقائياً)
ALTER TABLE `JobOffer`
ADD CONSTRAINT `JobOffer_winchId_fkey` FOREIGN KEY (`winchId`) REFERENCES `Winch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
