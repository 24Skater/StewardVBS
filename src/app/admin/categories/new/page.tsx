import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createCategory } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import { auditLog } from "@/lib/audit-log";
import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_URL_LENGTH,
} from "@/lib/constants";
import ColorPicker from "@/components/ColorPicker";

async function createCategoryAction(formData: FormData) {
  "use server";
  const session = await requireRole("ADMIN");

  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const color = formData.get("color")?.toString().trim() || null;
  const orderInput = formData.get("order");
  const order = orderInput ? Number(orderInput) : 0;
  const eventIdInput = formData.get("eventId")?.toString();

  // Validate name
  if (!name || name.length === 0) {
    throw new ValidationError("Name is required");
  }
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    throw new ValidationError(`Name must be ${MAX_CATEGORY_NAME_LENGTH} characters or less`);
  }

  // Validate description
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
  }

  // Validate color (hex format)
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new ValidationError("Color must be a valid hex color (e.g., #FF0000)");
  }

  // Validate order
  if (isNaN(order) || order < 0 || order > 10000) {
    throw new ValidationError("Order must be between 0 and 10000");
  }

  // Note: Order validation could use a constant, but 10000 is reasonable for display order

  // Validate eventId if provided
  let eventId: number | null = null;
  if (eventIdInput) {
    const parsed = Number(eventIdInput);
    if (isNaN(parsed) || parsed <= 0) {
      throw new ValidationError("Invalid event ID");
    }
    // Verify event exists
    const event = await prisma.event.findUnique({ where: { id: parsed } });
    if (!event) {
      throw new ValidationError("Event not found");
    }
    eventId = parsed;
  }

  const category = await createCategory({
    name,
    description: description || undefined,
    color: color || undefined,
    order,
    eventId,
  });

  // Audit log
  await auditLog({
    userId: session.user.id,
    action: "CATEGORY_CREATED",
    resourceType: "Category",
    resourceId: String(category.id),
    details: { name, eventId },
  });

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export default async function NewCategoryPage() {
  const events = await prisma.event.findMany({
    select: { id: true, year: true, theme: true },
    orderBy: { year: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--st-fg)]">Create Category</h2>
        <p className="mt-1 text-sm text-[var(--st-muted)]">
          Create a new student category. Leave event blank for a global category.
        </p>
      </div>

      <form
        action={createCategoryAction}
        className="space-y-6 rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--st-fg)]">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="e.g., Preschool, Elementary, Teens"
            className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[var(--st-fg)]">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Optional description of this category"
            className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-[var(--st-fg)]">
              Color (Hex)
            </label>
            <ColorPicker name="color" />
          </div>

          <div>
            <label htmlFor="order" className="block text-sm font-medium text-[var(--st-fg)]">
              Display Order
            </label>
            <input
              type="number"
              id="order"
              name="order"
              defaultValue="0"
              min="0"
              className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
            />
            <p className="mt-1 text-xs text-[var(--st-muted)]">Lower numbers appear first</p>
          </div>
        </div>

        <div>
          <label htmlFor="eventId" className="block text-sm font-medium text-[var(--st-fg)]">
            Event (Optional)
          </label>
          <select
            id="eventId"
            name="eventId"
            className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
          >
            <option value="">Global (all events)</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.year} {event.theme ? `• ${event.theme}` : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--st-muted)]">
            Leave blank to make this category available for all events
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="rounded-md bg-[var(--st-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--st-primary)]/90"
          >
            Create Category
          </button>
          <a
            href="/admin/categories"
            className="rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2 text-sm font-medium text-[var(--st-fg)] hover:bg-[var(--st-bg)]"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
