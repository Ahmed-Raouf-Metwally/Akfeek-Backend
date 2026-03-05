-- إضافة عمود status لجدول JobOffer (مطلوب لفلو الوينش)
-- شغّل مرة واحدة من مجلد المشروع:
--   mysql -u root -p autoservice < prisma/add_job_offer_status.sql
-- أو نفّذ الأمر التالي في MySQL client (phpMyAdmin, DBeaver, إلخ).

ALTER TABLE `JobOffer`
ADD COLUMN `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING';
