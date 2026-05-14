import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import { auditLog } from "@/lib/audit-log";
import { MIN_YEAR, MAX_YEAR, MAX_THEME_LENGTH } from "@/lib/constants";
import DeleteButton from "@/components/DeleteButton";

async function updateEvent(id: number, formData: FormData) {
  "use server";
  const session = await requireRole("ADMIN");

  // Validate ID
  if (!id || !Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid event ID");
  }

  // Verify event exists
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    throw new ValidationError("Event not found");
  }

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

  // Check if year is taken by another event
  const existing = await prisma.event.findFirst({
    where: { year, NOT: { id } },
  });
  if (existing) {
    throw new ValidationError(`Event for year ${year} already exists`);
  }

  // If setting as active, deactivate all others first
  if (setActive) {
    await prisma.event.updateMany({
      where: { NOT: { id } },
      data: { isActive: false },
    });
  }

  await prisma.event.update({
    where: { id },
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
    action: "EVENT_UPDATED",
    resourceType: "Event",
    resourceId: String(id),
    details: { year, theme, isActive: setActive },
  });

  revalidatePath("/admin/events");
  redirect("/admin/events");
}

async function deleteEvent(id: number) {
  "use server";
  const session = await requireRole("ADMIN");

  // Validate ID
  if (!id || !Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid event ID");
  }

  // Verify event exists
  const event = await prisma.event.findUnique({ 
    where: { id },
    select: { id: true, year: true, theme: true },
  });
  if (!event) {
    throw new ValidationError("Event not found");
  }

  await prisma.event.delete({ where: { id } });

  // Audit log
  await auditLog({
    userId: session.user.id,
    action: "EVENT_DELETED",
    resourceType: "Event",
    resourceId: String(id),
    details: { year: event.year, theme: event.theme },
  });

  revalidatePath("/admin/events");
  redirect("/admin/events");
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: Props) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (isNaN(id)) return notFound();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          studentEvents: true,
          attendances: true,
          payments: true,
          sessions: true,
        },
      },
    },
  });

  if (!event) return notFound();

  const updateAction = updateEvent.bind(null, id);
  const deleteAction = deleteEvent.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
        <p className="mt-1 text-sm text-gray-600">Update event details.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form action={updateAction} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="year"
                name="year"
                required
                defaultValue={event.year}
                min="2000"
                max="2100"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                Theme
              </label>
              <input
                type="text"
                id="theme"
                name="theme"
                defaultValue={event.theme || ""}
                placeholder="e.g., True North, Adventure Island"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  defaultValue={
                    event.startDate ? event.startDate.toISOString().split("T")[0] : ""
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  defaultValue={
                    event.endDate ? event.endDate.toISOString().split("T")[0] : ""
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="setActive"
                name="setActive"
                type="checkbox"
                defaultChecked={event.isActive}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="setActive" className="ml-2 block text-sm text-gray-900">
                Set as active event
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
              <a
                href="/admin/events"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </a>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Event Statistics</h3>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Students</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {event._count.studentEvents}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Attendance Records</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {event._count.attendances}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Payments</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {event._count.payments}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Sessions</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {event._count.sessions}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h3 className="text-lg font-semibold text-red-900">Danger Zone</h3>
            <p className="mt-2 text-sm text-red-700">
              Deleting this event will also delete all associated students, attendance records,
              payments, and sessions. This action cannot be undone.
            </p>
            <div className="mt-4">
              <DeleteButton
                action={deleteAction}
                confirmMessage="Are you sure you want to delete this event? This cannot be undone."
              >
                Delete Event
              </DeleteButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
