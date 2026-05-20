/*
  Warnings:

  - You are about to drop the column `eventId` on the `Student` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_eventId_fkey";

-- DropIndex
DROP INDEX "Student_eventId_category_idx";

-- DropIndex
DROP INDEX "Student_eventId_idx";

-- DropIndex (was a unique constraint, must be dropped as constraint not index)
ALTER TABLE "Student" DROP CONSTRAINT "Student_eventId_name_key";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "eventId";
