-- Add eventId to Student table (required by Prisma schema)
-- Set all existing students to event ID 1 (the active 2026 event)
ALTER TABLE "Student" ADD COLUMN "eventId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Student" ALTER COLUMN "eventId" DROP DEFAULT;

-- Add FK constraint
ALTER TABLE "Student" ADD CONSTRAINT "Student_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint (Student name must be unique within an event)
ALTER TABLE "Student" ADD CONSTRAINT "Student_eventId_name_key" UNIQUE ("eventId", "name");

-- Add performance indexes
CREATE INDEX "Student_eventId_idx" ON "Student"("eventId");
CREATE INDEX "Student_eventId_category_idx" ON "Student"("eventId", "category");
