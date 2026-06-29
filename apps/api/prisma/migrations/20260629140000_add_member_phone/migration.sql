-- AlterTable: optional phone on Member for guest cross-event lookup
ALTER TABLE "Member" ADD COLUMN "phone" TEXT;

-- CreateIndex
CREATE INDEX "Member_phone_idx" ON "Member"("phone");
