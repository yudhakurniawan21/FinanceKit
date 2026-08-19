-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('CREDIT_CARD', 'PAYLATER', 'MORTGAGE', 'VEHICLE', 'PERSONAL_LOAN');

-- AlterTable: kewajiban metadata
ALTER TABLE "net_worth_item" ADD COLUMN "debtType" "DebtType",
ADD COLUMN "dueDay" INTEGER,
ADD COLUMN "interestRate" DOUBLE PRECISION,
ADD COLUMN "minPayment" INTEGER;

-- AlterTable: tautan pembayaran cicilan -> kewajiban
ALTER TABLE "transaction" ADD COLUMN "netWorthItemId" TEXT;

-- CreateIndex
CREATE INDEX "transaction_netWorthItemId_idx" ON "transaction"("netWorthItemId");

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_netWorthItemId_fkey" FOREIGN KEY ("netWorthItemId") REFERENCES "net_worth_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;