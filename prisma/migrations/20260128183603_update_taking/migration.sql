-- CreateTable
CREATE TABLE `TechnicianLocation` (
    `id` VARCHAR(191) NOT NULL,
    `technicianId` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `heading` DOUBLE NULL,
    `speed` DOUBLE NULL,
    `accuracy` DOUBLE NULL,
    `bookingId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ONLINE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TechnicianLocation_technicianId_idx`(`technicianId`),
    INDEX `TechnicianLocation_bookingId_idx`(`bookingId`),
    INDEX `TechnicianLocation_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TechnicianLocation` ADD CONSTRAINT `TechnicianLocation_technicianId_fkey` FOREIGN KEY (`technicianId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TechnicianLocation` ADD CONSTRAINT `TechnicianLocation_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
