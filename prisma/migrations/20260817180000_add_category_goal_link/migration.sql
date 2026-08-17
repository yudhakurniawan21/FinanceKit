-- AlterTable
ALTER TABLE "category" ADD COLUMN     "goalId" TEXT;

-- CreateIndex
CREATE INDEX "category_goalId_idx" ON "category"("goalId");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
