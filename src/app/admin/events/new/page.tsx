import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import { auditLog } from "@/lib/audit-log";
import { MIN_YEAR, MAX_YEAR, MAX_THEME_LENGTH } from "@/lib/constants";

async function createEvent(formData: FormData) {
  "use server";
  const session = await requireRole("ADMIN");

  const yearInput = formData.get("year");
  const year = yearInput ? Number(yearInput) : null;
  const theme = formData.get("theme")?.toString().trim() || null;
  const startDateInput = formData.get("startDate")?.toString();
  const endDateInput = formData.get("endDate")?.toString();
  const startDate = startDateInput ? new Date(startDateInput) : null;
  const endDate = endDateInput ? new Date(endDateInput) : null;
  const setActive = formData.get("setActive") === "on";

  // Validate year
  if (!year || isNaN(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new ValidationError(`Year must be between ${MIN_YEAR} and ${MAX_YEAR}`);
  }

  // Validate dates
  if (startDate && isNaN(startDate.getTime())) {
    throw new ValidationError("Invalid start date");
  }
  if (endDate && isNaN(endDate.getTime())) {
    throw new ValidationError("Invalid end date");
  }
  if (startDate && endDate && endDate < startDate) {
    throw new ValidationError("End date must be after start date");
  }

  // Validate theme length
  if (theme && theme.length > MAX_THEME_LENGTH) {
    throw new ValidationError(`Theme must be ${MAX_THEME_LENGTH} characters or less`);
  }

  // Check if year already exists
  const existing = await prisma.event.findUnique({ where: { year } });
  if (existing) {
    throw new ValidationError(`Event for year ${year} already exists`);
  }

  // If setting as active, deactivate all others first
  if (setActive) {
    await prisma.event.updateMany({
      data: { isActive: false },
    });
  }

  const event = await prisma.event.create({
    data: {
      year,
      theme,
      startDate,
      endDate,
      isActive: setActive,
    },
  });

  // Audit log
  await auditLog({
    userId: session.user.id,
    action: "EVENT_CREATED",
    resourceType: "Event",
    resourceId: String(event.id),
    details: { year, theme, isActive: setActive },
  });

  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export default function NewEventPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--st-fg)]">Create New Event</h2>
        <p className="mt-1 text-sm text-[var(--st-muted)]">
          Create a new VBS event for a specific year.
        </p>
      </div>

      <form action={createEvent} className="space-y-6 rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-[var(--st-fg)]">
            Year <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="year"
            name="year"
            required
            defaultValue={currentYear}
            min="2000"
            max="2100"
            className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
          />
        </div>

        <div>
          <label htmlFor="theme" className="block text-sm font-medium text-[var(--st-fg)]">
            Theme
          </label>
          <input
            type="text"
            id="theme"
            name="theme"
            placeholder="e.g., True North, Adventure Island"
            className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-[var(--st-fg)]">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-[var(--st-fg)]">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="setActive"
            name="setActive"
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--st-border)] text-[var(--st-primary)] focus:ring-[var(--st-primary)]"
          />
          <label htmlFor="setActive" className="ml-2 block text-sm text-[var(--st-fg)]">
            Set as active event (will deactivate current active event)
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="rounded-md bg-[var(--st-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--st-primary)]/90"
          >
            Create Event
          </button>
          <a
            href="/admin/events"
            className="rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2 text-sm font-medium text-[var(--st-fg)] hover:bg-[var(--st-bg)]"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
