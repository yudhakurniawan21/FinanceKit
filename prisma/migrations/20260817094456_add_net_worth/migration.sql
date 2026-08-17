-- CreateEnum
CREATE TYPE "NetWorthType" AS ENUM ('ASSET', 'LIABILITY');

-- CreateTable
CREATE TABLE "net_worth_item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "NetWorthType" NOT NULL,
    "value" INTEGER NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "net_worth_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "net_worth_snapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalAssets" INTEGER NOT NULL,
    "totalLiabilities" INTEGER NOT NULL,
    "netWorth" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "net_worth_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "net_worth_item_userId_idx" ON "net_worth_item"("userId");

-- CreateIndex
CREATE INDEX "net_worth_snapshot_userId_date_idx" ON "net_worth_snapshot"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "net_worth_snapshot_userId_date_key" ON "net_worth_snapshot"("userId", "date");

-- AddForeignKey
ALTER TABLE "net_worth_item" ADD CONSTRAINT "net_worth_item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "net_worth_snapshot" ADD CONSTRAINT "net_worth_snapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
