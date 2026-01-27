-- AlterTable
ALTER TABLE `booking` ADD COLUMN `destinationAddress` VARCHAR(191) NULL,
    ADD COLUMN `destinationLat` DOUBLE NULL,
    ADD COLUMN `destinationLng` DOUBLE NULL,
    ADD COLUMN `metadata` JSON NULL;
