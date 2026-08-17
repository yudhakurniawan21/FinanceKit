-- AlterTable
ALTER TABLE "category" ADD COLUMN     "isSavings" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "goalId" TEXT;

-- CreateIndex
CREATE INDEX "transaction_goalId_idx" ON "transaction"("goalId");

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
