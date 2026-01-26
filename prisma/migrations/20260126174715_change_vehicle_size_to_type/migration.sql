/*
  Warnings:

  - You are about to drop the column `vehicleSize` on the `servicepricing` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `vehiclemodel` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[serviceId,vehicleType]` on the table `ServicePricing` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `vehicleType` to the `ServicePricing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `VehicleModel` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add new columns with temporary default values
ALTER TABLE `vehiclemodel` 
    ADD COLUMN `type` ENUM('SEDAN', 'HATCHBACK', 'COUPE', 'SMALL_SUV', 'LARGE_SEDAN', 'SUV', 'CROSSOVER', 'TRUCK', 'VAN', 'BUS') NULL;

ALTER TABLE `servicepricing` 
    ADD COLUMN `vehicleType` ENUM('SEDAN', 'HATCHBACK', 'COUPE', 'SMALL_SUV', 'LARGE_SEDAN', 'SUV', 'CROSSOVER', 'TRUCK', 'VAN', 'BUS') NULL;

-- Step 2: Migrate data from old to new (map old sizes to new types)
-- Since the old system was generic (SMALL, MEDIUM, LARGE, EXTRA_LARGE), 
-- we'll map them to reasonable defaults. Admin can update later if needed.

UPDATE `vehiclemodel` 
SET `type` = CASE 
    WHEN `size` = 'SMALL' THEN 'SEDAN'
    WHEN `size` = 'MEDIUM' THEN 'SUV'
    WHEN `size` = 'LARGE' THEN 'TRUCK'
    WHEN `size` = 'EXTRA_LARGE' THEN 'BUS'
    ELSE 'SEDAN'
END
WHERE `type` IS NULL;

UPDATE `servicepricing` 
SET `vehicleType` = CASE 
    WHEN `vehicleSize` = 'SMALL' THEN 'SEDAN'
    WHEN `vehicleSize` = 'MEDIUM' THEN 'SUV'
    WHEN `vehicleSize` = 'LARGE' THEN 'TRUCK'
    WHEN `vehicleSize` = 'EXTRA_LARGE' THEN 'BUS'
    ELSE 'SEDAN'
END
WHERE `vehicleType` IS NULL;

-- Step 3: Make new columns NOT NULL
ALTER TABLE `vehiclemodel` 
    MODIFY COLUMN `type` ENUM('SEDAN', 'HATCHBACK', 'COUPE', 'SMALL_SUV', 'LARGE_SEDAN', 'SUV', 'CROSSOVER', 'TRUCK', 'VAN', 'BUS') NOT NULL;

ALTER TABLE `servicepricing` 
    MODIFY COLUMN `vehicleType` ENUM('SEDAN', 'HATCHBACK', 'COUPE', 'SMALL_SUV', 'LARGE_SEDAN', 'SUV', 'CROSSOVER', 'TRUCK', 'VAN', 'BUS') NOT NULL;

-- Step 4: Drop old unique constraint
DROP INDEX `ServicePricing_serviceId_vehicleSize_key` ON `servicepricing`;

-- Step 5: Create new unique constraint
CREATE UNIQUE INDEX `ServicePricing_serviceId_vehicleType_key` ON `ServicePricing`(`serviceId`, `vehicleType`);

-- Step 6: Drop old columns
ALTER TABLE `vehiclemodel` DROP COLUMN `size`;
ALTER TABLE `servicepricing` DROP COLUMN `vehicleSize`;
