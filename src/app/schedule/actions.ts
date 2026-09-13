"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveEvent } from "@/lib/event";
import { requireRole } from "@/lib/auth";
import { scheduleSessionSchema } from "@/lib/validation";
import { verifySessionAccess, validateId } from "@/lib/resource-access";
import { MAX_FUTURE_YEARS } from "@/lib/constants";
import { requireOrgId } from "@/lib/org-resolve";

export async function createSession(formData: FormData) {
  await requireRole("STAFF");

  const event = await getActiveEvent();

  const rawData = {
    title: formData.get("title"),
    start: formData.get("start"),
    end: formData.get("end"),
    location: formData.get("location"),
    group: formData.get("group"),
    notes: formData.get("notes"),
    eventId: event.id,
  };

  const validation = scheduleSessionSchema.safeParse(rawData);
  if (!validation.success) {
    // Don't expose detailed validation errors to users
    throw new Error("Invalid session data. Please check all fields.");
  }

  const data = validation.data;
  if (data.end <= data.start) {
    throw new Error("End time must be after start time.");
  }

  // Additional validation: ensure dates are reasonable
  const now = new Date();
  const maxFuture = new Date(now.getFullYear() + MAX_FUTURE_YEARS, 11, 31);
  if (data.start > maxFuture || data.end > maxFuture) {
    throw new Error(`Session dates cannot be more than ${MAX_FUTURE_YEARS} years in the future.`);
  }

  await prisma.scheduleSession.create({
    data: {
      orgId: await requireOrgId(),
      title: data.title,
      start: data.start,
      end: data.end,
      location: data.location ?? null,
      group: data.group ?? null,
      notes: data.notes ?? null,
      eventId: data.eventId,
    },
  });

  revalidatePath("/schedule");
}

export async function deleteSession(formData: FormData) {
  await requireRole("STAFF");

  const idInput = formData.get("id");

  // Validate and verify access (IDOR protection)
  const id = validateId(idInput, "Session");
  await verifySessionAccess(id);

  await prisma.scheduleSession.delete({ where: { id } });
  revalidatePath("/schedule");
}

