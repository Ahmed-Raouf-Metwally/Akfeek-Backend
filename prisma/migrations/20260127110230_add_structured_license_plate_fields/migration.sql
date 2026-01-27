/*
  Warnings:

  - Added the required column `plateDigits` to the `UserVehicle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `uservehicle` ADD COLUMN `plateDigits` VARCHAR(191) NOT NULL,
    ADD COLUMN `plateLettersAr` VARCHAR(191) NULL,
    ADD COLUMN `plateLettersEn` VARCHAR(191) NULL,
    ADD COLUMN `plateRegion` VARCHAR(191) NULL;
