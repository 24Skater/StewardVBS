-- Make students event-independent and add StudentEvent enrollment table

-- Step 1: Create StudentEvent table
CREATE TABLE "StudentEvent" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentEvent_pkey" PRIMARY KEY ("id")
);

-- Step 2: Migrate existing student-event relationships
INSERT INTO "StudentEvent" ("studentId", "eventId", "enrolledAt")
SELECT "id", "eventId", "createdAt"
FROM "Student"
WHERE "eventId" IS NOT NULL;

-- Step 3: Add FK constraints and indexes on StudentEvent
ALTER TABLE "StudentEvent" ADD CONSTRAINT "StudentEvent_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentEvent" ADD CONSTRAINT "StudentEvent_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "StudentEvent_studentId_eventId_key" ON "StudentEvent"("studentId", "eventId");
CREATE INDEX "StudentEvent_studentId_idx" ON "StudentEvent"("studentId");
CREATE INDEX "StudentEvent_eventId_idx" ON "StudentEvent"("eventId");

-- Step 4: Drop old Student indexes and FK that reference eventId
DROP INDEX IF EXISTS "Student_eventId_name_key";
DROP INDEX IF EXISTS "Student_eventId_idx";
DROP INDEX IF EXISTS "Student_eventId_category_idx";
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_eventId_fkey";

-- Step 5: Remove eventId column from Student
ALTER TABLE "Student" DROP COLUMN IF EXISTS "eventId";

-- Step 6: Add name index
CREATE INDEX "Student_name_idx" ON "Student"("name");
