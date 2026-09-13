/**
 * Event utilities - Get active event or specific event
 */
import "server-only";
import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { cache } from "react";
import { requireOrgId } from '@/lib/org-resolve';

/**
 * Get the currently active event
 * Cached per request to avoid multiple database queries
 */
export const getActiveEvent = cache(async () => {
  const event = await prisma.event.findFirst({
    where: { isActive: true },
    orderBy: { year: "desc" },
  });

  if (!event) {
    throw new NotFoundError(
      "No active event found. Please activate an event in the admin panel."
    );
  }

  return event;
});

/**
 * Get event by year
 */
export async function getEventByYear(year: number) {
  const event = await prisma.event.findUnique({
    where: { orgId_year: { orgId: await requireOrgId(), year } },
  });

  if (!event) {
    throw new NotFoundError(`Event for year ${year} not found`);
  }

  return event;
}

/**
 * Get event by ID
 */
export async function getEventById(id: number) {
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    throw new NotFoundError(`Event with ID ${id} not found`);
  }

  return event;
}
