-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "splitMode" TEXT;

-- CreateTable
CREATE TABLE "BookMember" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookInvite" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "invitedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseShare" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountOwed" INTEGER NOT NULL,
    "slipAssetId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookMember_userId_idx" ON "BookMember"("userId");

-- CreateIndex
CREATE INDEX "BookMember_bookId_idx" ON "BookMember"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "BookMember_bookId_userId_key" ON "BookMember"("bookId", "userId");

-- CreateIndex
CREATE INDEX "BookInvite_email_idx" ON "BookInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BookInvite_bookId_email_key" ON "BookInvite"("bookId", "email");

-- CreateIndex
CREATE INDEX "ExpenseShare_userId_idx" ON "ExpenseShare"("userId");

-- CreateIndex
CREATE INDEX "ExpenseShare_transactionId_idx" ON "ExpenseShare"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseShare_transactionId_userId_key" ON "ExpenseShare"("transactionId", "userId");

-- AddForeignKey
ALTER TABLE "BookMember" ADD CONSTRAINT "BookMember_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookMember" ADD CONSTRAINT "BookMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookInvite" ADD CONSTRAINT "BookInvite_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseShare" ADD CONSTRAINT "ExpenseShare_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseShare" ADD CONSTRAINT "ExpenseShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing book's creator becomes its owner member.
INSERT INTO "BookMember" ("id", "bookId", "userId", "role", "createdAt")
SELECT 'owner_' || "id", "id", "userId", 'owner', now()
FROM "Book";
