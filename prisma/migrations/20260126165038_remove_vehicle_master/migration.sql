/*
  Warnings:

  - You are about to drop the column `vehicleMasterId` on the `productcompatibility` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleMasterId` on the `uservehicle` table. All the data in the column will be lost.
  - You are about to drop the `vehiclemaster` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `vehicleModelId` on table `productcompatibility` required. This step will fail if there are existing NULL values in that column.
  - Made the column `vehicleModelId` on table `uservehicle` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `productcompatibility` DROP FOREIGN KEY `ProductCompatibility_vehicleMasterId_fkey`;

-- DropForeignKey
ALTER TABLE `productcompatibility` DROP FOREIGN KEY `ProductCompatibility_vehicleModelId_fkey`;

-- DropForeignKey
ALTER TABLE `uservehicle` DROP FOREIGN KEY `UserVehicle_vehicleMasterId_fkey`;

-- DropForeignKey
ALTER TABLE `uservehicle` DROP FOREIGN KEY `UserVehicle_vehicleModelId_fkey`;

-- DropIndex
DROP INDEX `ProductCompatibility_productId_vehicleMasterId_key` ON `productcompatibility`;

-- AlterTable
ALTER TABLE `productcompatibility` DROP COLUMN `vehicleMasterId`,
    MODIFY `vehicleModelId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `uservehicle` DROP COLUMN `vehicleMasterId`,
    MODIFY `vehicleModelId` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `vehiclemaster`;

-- AddForeignKey
ALTER TABLE `UserVehicle` ADD CONSTRAINT `UserVehicle_vehicleModelId_fkey` FOREIGN KEY (`vehicleModelId`) REFERENCES `VehicleModel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCompatibility` ADD CONSTRAINT `ProductCompatibility_vehicleModelId_fkey` FOREIGN KEY (`vehicleModelId`) REFERENCES `VehicleModel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
