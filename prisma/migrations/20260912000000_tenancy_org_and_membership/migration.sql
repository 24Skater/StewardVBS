-- VBS learns what a church is.
--
-- Written by hand rather than generated. `prisma migrate diff` emits a bare
-- `ADD COLUMN "orgId" TEXT NOT NULL` for each table, which fails immediately on
-- any database that already has a row in it - which is every developer's, and
-- every existing self-hosted install.
--
-- The shape below is the one recorded in the decision record: add the column
-- nullable, fill it, give it a default, then make it NOT NULL. The default is
-- what makes the constraint survivable: without it, every INSERT already in
-- flight that does not name the column starts failing the moment NOT NULL
-- lands.
--
-- Unlike the recipe, the default is then DROPPED at the end. A permanent
-- default belongs to a single-tenant app being migrated; here it would be a
-- loaded gun, quietly filing a row under one church because some future insert
-- forgot to say which church it belonged to. After this migration the tenancy
-- guard supplies the value on every write, and an insert that reaches the
-- database without one is a bug that should fail loudly.

-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Org_slug_key" ON "Org"("slug");
CREATE INDEX "Org_slug_idx" ON "Org"("slug");
CREATE INDEX "Membership_orgId_idx" ON "Membership"("orgId");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE UNIQUE INDEX "Membership_userId_orgId_key" ON "Membership"("userId", "orgId");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The church every existing row belongs to.
--
-- Created only when there is something to adopt. A genuinely empty database -
-- CI, a fresh install - gets no church here and creates its own through the
-- first-run wizard or through provisioning, so neither inherits a placeholder
-- named "Our Church" that nobody chose.
DO $$
DECLARE
  existing_org TEXT;
  has_data BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM "User"
    UNION ALL SELECT 1 FROM "Student"
    UNION ALL SELECT 1 FROM "Event"
    UNION ALL SELECT 1 FROM "AppSettings"
  ) INTO has_data;

  IF has_data THEN
    SELECT id INTO existing_org FROM "Org" LIMIT 1;
    IF existing_org IS NULL THEN
      INSERT INTO "Org" ("id", "slug", "name", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'primary', 'Our Church', NOW(), NOW());
    END IF;
  END IF;
END $$;

-- Roles move from the login to the membership, before the column is dropped.
INSERT INTO "Membership" ("id", "userId", "orgId", "role", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", o."id", u."role", NOW(), NOW()
FROM "User" u
CROSS JOIN (SELECT id FROM "Org" ORDER BY "createdAt" LIMIT 1) o
ON CONFLICT ("userId", "orgId") DO NOTHING;

-- Add, fill, default, constrain - once per tenanted table.
DO $$
DECLARE
  target_org TEXT;
  t TEXT;
  tenanted TEXT[] := ARRAY[
    'AppSettings', 'Attendance', 'AuditLog', 'Event', 'Invitation', 'Payment',
    'ScheduleSession', 'Student', 'StudentCategory', 'StudentEmergencyContact',
    'StudentEvent', 'StudentParent', 'StudentTeacher', 'Teacher'
  ];
BEGIN
  SELECT id INTO target_org FROM "Org" ORDER BY "createdAt" LIMIT 1;

  FOREACH t IN ARRAY tenanted LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN "orgId" TEXT', t);

    IF target_org IS NOT NULL THEN
      EXECUTE format('UPDATE %I SET "orgId" = %L WHERE "orgId" IS NULL', t, target_org);
      EXECUTE format('ALTER TABLE %I ALTER COLUMN "orgId" SET DEFAULT %L', t, target_org);
    END IF;

    EXECUTE format('ALTER TABLE %I ALTER COLUMN "orgId" SET NOT NULL', t);

    -- See the note at the top: the default exists only to get the constraint
    -- on, and is a hazard the moment a second church arrives.
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "orgId" DROP DEFAULT', t);

    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE',
      t, t || '_orgId_fkey'
    );
  END LOOP;
END $$;

-- Uniqueness that tenancy changes the meaning of.
--
-- Each of these would otherwise mean "across every church on the pool": one
-- church creating its 2026 event would stop every other church from having one.
DROP INDEX "Event_year_key";
DROP INDEX "Invitation_email_key";
CREATE UNIQUE INDEX "Event_orgId_year_key" ON "Event"("orgId", "year");
CREATE UNIQUE INDEX "Invitation_orgId_email_key" ON "Invitation"("orgId", "email");
CREATE UNIQUE INDEX "AppSettings_orgId_key" ON "AppSettings"("orgId");

-- Access paths, composite on orgId rather than a bare orgId index - a lone
-- orgId index is nearly useless once most rows in the table share the value.
DROP INDEX "AuditLog_createdAt_idx";
DROP INDEX "Student_name_idx";
DROP INDEX "Teacher_isActive_idx";
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");
CREATE INDEX "Student_orgId_name_idx" ON "Student"("orgId", "name");
CREATE INDEX "Teacher_orgId_isActive_idx" ON "Teacher"("orgId", "isActive");
CREATE INDEX "Event_orgId_isActive_idx" ON "Event"("orgId", "isActive");

CREATE INDEX "Attendance_orgId_idx" ON "Attendance"("orgId");
CREATE INDEX "AuditLog_orgId_idx" ON "AuditLog"("orgId");
CREATE INDEX "Invitation_orgId_idx" ON "Invitation"("orgId");
CREATE INDEX "Payment_orgId_idx" ON "Payment"("orgId");
CREATE INDEX "ScheduleSession_orgId_idx" ON "ScheduleSession"("orgId");
CREATE INDEX "Student_orgId_idx" ON "Student"("orgId");
CREATE INDEX "StudentCategory_orgId_idx" ON "StudentCategory"("orgId");
CREATE INDEX "StudentEmergencyContact_orgId_idx" ON "StudentEmergencyContact"("orgId");
CREATE INDEX "StudentEvent_orgId_idx" ON "StudentEvent"("orgId");
CREATE INDEX "StudentParent_orgId_idx" ON "StudentParent"("orgId");
CREATE INDEX "StudentTeacher_orgId_idx" ON "StudentTeacher"("orgId");
CREATE INDEX "Teacher_orgId_idx" ON "Teacher"("orgId");

-- The role now lives on the membership.
ALTER TABLE "User" DROP COLUMN "role";

-- AppSettings is no longer a singleton: one row per church, keyed by orgId.
ALTER TABLE "AppSettings" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "AppSettings" ALTER COLUMN "siteName" SET DEFAULT 'Steward · VBS';
ALTER TABLE "AppSettings" ALTER COLUMN "primaryColor" SET DEFAULT '#E8B847';
ALTER TABLE "AppSettings" ALTER COLUMN "secondaryColor" SET DEFAULT '#C49A2E';
