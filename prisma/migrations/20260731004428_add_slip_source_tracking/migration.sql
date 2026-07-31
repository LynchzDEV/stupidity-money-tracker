-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "sourceFileName" TEXT,
ADD COLUMN     "sourceHash" TEXT,
ADD COLUMN     "sourceTakenAt" TIMESTAMP(3),
ADD COLUMN     "uploadSource" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_sourceHash_idx" ON "Transaction"("sourceHash");
