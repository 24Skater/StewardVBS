"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getActiveEvent } from "@/lib/event";
import { verifyStudentAccess, validateId } from "@/lib/resource-access";
import { getTodayRange } from "@/lib/date-utils";
import { requireOrgId } from "@/lib/org-resolve";

export async function checkInAction(studentId: number) {
  await requireRole("STAFF");

  // Validate studentId
  const validId = validateId(studentId, "Student");

  // Verify student access (IDOR protection)
  await verifyStudentAccess(validId);

  const event = await getActiveEvent();

  // Check if already checked in today (idempotent)
  const { start, end } = getTodayRange();

  const existing = await prisma.attendance.findFirst({
    where: {
      studentId: validId,
      eventId: event.id,
      date: { gte: start, lt: end },
    },
  });

  if (!existing) {
    await prisma.attendance.create({
      data: { orgId: await requireOrgId(), studentId: validId, eventId: event.id },
    });
  }

  revalidatePath(`/students/${validId}`);
}

export async function togglePaidAction(studentId: number) {
  await requireRole("STAFF");

  // Validate studentId
  const validId = validateId(studentId, "Student");

  // Verify student access (IDOR protection)
  await verifyStudentAccess(validId);

  const event = await getActiveEvent();

  const existing = await prisma.payment.findFirst({
    where: { studentId: validId, eventId: event.id },
  });

  if (existing) {
    await prisma.payment.delete({ where: { id: existing.id } });
  } else {
    await prisma.payment.create({
      data: { orgId: await requireOrgId(), studentId: validId, eventId: event.id, amount: 0 },
    });
  }

  revalidatePath(`/students/${validId}`);
}

