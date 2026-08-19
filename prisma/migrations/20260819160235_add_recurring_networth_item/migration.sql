-- AlterTable
ALTER TABLE "recurring_transaction" ADD COLUMN     "netWorthItemId" TEXT;

-- CreateIndex
CREATE INDEX "recurring_transaction_netWorthItemId_idx" ON "recurring_transaction"("netWorthItemId");

-- AddForeignKey
ALTER TABLE "recurring_transaction" ADD CONSTRAINT "recurring_transaction_netWorthItemId_fkey" FOREIGN KEY ("netWorthItemId") REFERENCES "net_worth_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
