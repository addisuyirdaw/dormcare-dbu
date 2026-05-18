-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "studentId" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "dormBlockId" TEXT,
    "roomId" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_dormBlockId_fkey" FOREIGN KEY ("dormBlockId") REFERENCES "DormBlock" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DormRoom" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DormBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "latitude" REAL NOT NULL DEFAULT 0,
    "longitude" REAL NOT NULL DEFAULT 0,
    "geofenceRadius" REAL NOT NULL DEFAULT 100,
    "capacity" INTEGER NOT NULL DEFAULT 200,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DormRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomNumber" TEXT NOT NULL,
    "dormBlockId" TEXT NOT NULL,
    "keyCustodianId" TEXT,
    CONSTRAINT "DormRoom_dormBlockId_fkey" FOREIGN KEY ("dormBlockId") REFERENCES "DormBlock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DormRoom_keyCustodianId_fkey" FOREIGN KEY ("keyCustodianId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'GOOD',
    CONSTRAINT "RoomAsset_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "DormRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftRegistry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "primaryBlockId" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL DEFAULT 'Standard Shift',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" DATETIME,
    "geofenceVerified" BOOLEAN NOT NULL DEFAULT false,
    "latitude" REAL,
    "longitude" REAL,
    "distanceDelta" REAL,
    "selfieImage" TEXT,
    "selfieTimestamp" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftRegistry_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftRegistry_primaryBlockId_fkey" FOREIGN KEY ("primaryBlockId") REFERENCES "DormBlock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmergencyTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "dormBlockId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedStaffId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "EmergencyTicket_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmergencyTicket_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmergencyTicket_dormBlockId_fkey" FOREIGN KEY ("dormBlockId") REFERENCES "DormBlock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenanceTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceTicket_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTicket_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "RoomAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GateClearanceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "flaggedMissingAssets" TEXT,
    "personalItems" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GateClearanceRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GateClearanceRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IssueReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "dormBlockId" TEXT NOT NULL,
    "scannedById" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'QR_SCAN',
    CONSTRAINT "AttendanceLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceLog_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceLog_dormBlockId_fkey" FOREIGN KEY ("dormBlockId") REFERENCES "DormBlock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetTag" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "roomNumber" TEXT NOT NULL,
    "custodianId" TEXT,
    CONSTRAINT "InventoryItem_roomNumber_fkey" FOREIGN KEY ("roomNumber") REFERENCES "DormRoom" ("roomNumber") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_custodianId_fkey" FOREIGN KEY ("custodianId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_BlockManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_BlockManagers_A_fkey" FOREIGN KEY ("A") REFERENCES "DormBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_BlockManagers_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ShiftBlocks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ShiftBlocks_A_fkey" FOREIGN KEY ("A") REFERENCES "DormBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ShiftBlocks_B_fkey" FOREIGN KEY ("B") REFERENCES "ShiftRegistry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DormBlock_number_key" ON "DormBlock"("number");

-- CreateIndex
CREATE UNIQUE INDEX "DormRoom_roomNumber_key" ON "DormRoom"("roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DormRoom_keyCustodianId_key" ON "DormRoom"("keyCustodianId");

-- CreateIndex
CREATE UNIQUE INDEX "GateClearanceRequest_verificationToken_key" ON "GateClearanceRequest"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_assetTag_key" ON "InventoryItem"("assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "_BlockManagers_AB_unique" ON "_BlockManagers"("A", "B");

-- CreateIndex
CREATE INDEX "_BlockManagers_B_index" ON "_BlockManagers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ShiftBlocks_AB_unique" ON "_ShiftBlocks"("A", "B");

-- CreateIndex
CREATE INDEX "_ShiftBlocks_B_index" ON "_ShiftBlocks"("B");

