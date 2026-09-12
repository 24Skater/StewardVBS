"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveEvent } from "@/lib/event";
import { requireRole } from "@/lib/auth";
import { verifyStudentAccess, validateId } from "@/lib/resource-access";
import { getTodayRange } from "@/lib/date-utils";
import { requireOrgId } from "@/lib/org-resolve";

export async function checkInById(studentId: number) {
  await requireRole("STAFF");

  // Validate studentId
  const validId = validateId(studentId, "Student");

  // Verify student access (IDOR protection)
  await verifyStudentAccess(validId);

  const event = await getActiveEvent();

  const { start, end } = getTodayRange();

  // idempotent: if already checked in today, do nothing
  const already = await prisma.attendance.findFirst({
    where: {
      studentId: validId,
      eventId: event.id,
      date: { gte: start, lt: end },
    },
    select: { id: true },
  });

  if (!already) {
    await prisma.attendance.create({
      data: { orgId: await requireOrgId(), studentId: validId, eventId: event.id },
    });
  }

  revalidatePath("/checkin");
}

