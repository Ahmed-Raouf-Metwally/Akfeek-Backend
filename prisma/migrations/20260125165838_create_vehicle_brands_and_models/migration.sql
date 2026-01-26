/*
  Warnings:

  - A unique constraint covering the columns `[productId,vehicleModelId]` on the table `ProductCompatibility` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `uservehicle` DROP FOREIGN KEY `UserVehicle_vehicleMasterId_fkey`;

-- AlterTable
ALTER TABLE `productcompatibility` ADD COLUMN `vehicleModelId` VARCHAR(191) NULL,
    MODIFY `vehicleMasterId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `uservehicle` ADD COLUMN `vehicleModelId` VARCHAR(191) NULL,
    MODIFY `vehicleMasterId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `VehicleBrand` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VehicleBrand_name_key`(`name`),
    INDEX `VehicleBrand_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleModel` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameAr` VARCHAR(191) NULL,
    `year` INTEGER NOT NULL,
    `size` ENUM('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE') NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VehicleModel_brandId_idx`(`brandId`),
    INDEX `VehicleModel_name_idx`(`name`),
    UNIQUE INDEX `VehicleModel_brandId_name_year_key`(`brandId`, `name`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ProductCompatibility_vehicleModelId_idx` ON `ProductCompatibility`(`vehicleModelId`);

-- CreateIndex
CREATE UNIQUE INDEX `ProductCompatibility_productId_vehicleModelId_key` ON `ProductCompatibility`(`productId`, `vehicleModelId`);

-- CreateIndex
CREATE INDEX `UserVehicle_vehicleModelId_idx` ON `UserVehicle`(`vehicleModelId`);

-- AddForeignKey
ALTER TABLE `VehicleModel` ADD CONSTRAINT `VehicleModel_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `VehicleBrand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserVehicle` ADD CONSTRAINT `UserVehicle_vehicleMasterId_fkey` FOREIGN KEY (`vehicleMasterId`) REFERENCES `VehicleMaster`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserVehicle` ADD CONSTRAINT `UserVehicle_vehicleModelId_fkey` FOREIGN KEY (`vehicleModelId`) REFERENCES `VehicleModel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCompatibility` ADD CONSTRAINT `ProductCompatibility_vehicleModelId_fkey` FOREIGN KEY (`vehicleModelId`) REFERENCES `VehicleModel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
