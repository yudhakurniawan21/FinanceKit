-- CreateIndex
CREATE INDEX "recurring_transaction_isActive_nextRunDate_idx" ON "recurring_transaction"("isActive", "nextRunDate");
