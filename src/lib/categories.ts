/**
 * Student category management
 */
import "server-only";
import { prisma } from "./prisma";
import { requireOrgId } from '@/lib/org-resolve';

export type StudentCategory = {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  order: number;
  eventId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get categories for an event (includes global categories)
 */
export async function getCategories(eventId?: number): Promise<StudentCategory[]> {
  const categories = await prisma.studentCategory.findMany({
    where: {
      OR: [
        { eventId: eventId ?? null },
        { eventId: null }, // Global categories
      ],
    },
    orderBy: [{ eventId: "asc" }, { order: "asc" }, { name: "asc" }],
  });

  return categories;
}

/**
 * Get category names as array (for backward compatibility)
 */
export async function getCategoryNames(eventId?: number): Promise<string[]> {
  const categories = await getCategories(eventId);
  return categories.map((c) => c.name);
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(id: number): Promise<StudentCategory | null> {
  return await prisma.studentCategory.findUnique({
    where: { id },
  });
}

/**
 * Create a new category
 */
export async function createCategory(data: {
  name: string;
  description?: string;
  color?: string;
  order?: number;
  eventId?: number | null;
}): Promise<StudentCategory> {
  return await prisma.studentCategory.create({
    data: {
      orgId: await requireOrgId(),
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? null,
      order: data.order ?? 0,
      eventId: data.eventId ?? null,
    },
  });
}

/**
 * Update a category
 */
export async function updateCategory(
  id: number,
  data: Partial<Omit<StudentCategory, "id" | "createdAt" | "updatedAt">>
): Promise<StudentCategory> {
  return await prisma.studentCategory.update({
    where: { id },
    data,
  });
}

/**
 * Delete a category
 */
export async function deleteCategory(id: number): Promise<void> {
  await prisma.studentCategory.delete({
    where: { id },
  });
}

/**
 * Initialize default categories if none exist
 */
export async function initializeDefaultCategories(): Promise<void> {
  const count = await prisma.studentCategory.count();
  if (count === 0) {
    const orgId = await requireOrgId();
    await prisma.studentCategory.createMany({
      data: [
        { orgId, name: "Youth", order: 1, eventId: null },
        { orgId, name: "Jovenes", order: 2, eventId: null },
        { orgId, name: "Teacher/Assistant", order: 3, eventId: null },
      ],
    });
  }
}
