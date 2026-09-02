-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "safety" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_filePath_key" ON "Card"("filePath");

-- CreateIndex
CREATE INDEX "Card_mode_idx" ON "Card"("mode");

-- CreateIndex
CREATE INDEX "Card_safety_idx" ON "Card"("safety");

-- CreateIndex
CREATE INDEX "Card_updatedAt_idx" ON "Card"("updatedAt");
