-- CreateEnum
CREATE TYPE "BudgetTier" AS ENUM ('NEEDS', 'WANTS', 'SAVINGS');

-- AlterTable
ALTER TABLE "category" ADD COLUMN "budgetTier" "BudgetTier";

-- Backfill: kategori tabungan yang sudah ada diberi tier SAVINGS.
UPDATE "category" SET "budgetTier" = 'SAVINGS' WHERE "isSavings" = true;