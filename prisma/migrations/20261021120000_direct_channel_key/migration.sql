ALTER TABLE "Channel" ADD COLUMN "directKey" TEXT;

CREATE UNIQUE INDEX "Channel_directKey_key" ON "Channel"("directKey");
