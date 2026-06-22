import { prisma } from "@/lib/prisma";
import { getActiveEvent } from "@/lib/event";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function setActiveEvent(eventId: number) {
  "use server";
  // Set all events to inactive
  await prisma.event.updateMany({
    data: { isActive: false },
  });
  // Set the selected event to active
  await prisma.event.update({
    where: { id: eventId },
    data: { isActive: true },
  });
  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
}

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { year: "desc" },
    include: {
      _count: {
        select: { studentEvents: true, attendances: true },
      },
    },
  });

  let activeEvent = null;
  try {
    activeEvent = await getActiveEvent();
  } catch {
    // No active event
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--st-fg)]">Events</h2>
          <p className="mt-1 text-sm text-[var(--st-muted)]">
            Manage VBS events. Only one event can be active at a time.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="rounded-md bg-[var(--st-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--st-primary)]/90"
        >
          Create Event
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]">
        <table className="min-w-full divide-y divide-[var(--st-border)]">
          <thead className="bg-[var(--st-bg)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Year
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Theme
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Students
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--st-border)] bg-[var(--st-surface)]">
            {events.map((event) => {
              const isActive = activeEvent?.id === event.id;
              return (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--st-fg)]">
                    {event.year}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--st-muted)]">
                    {event.theme || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {isActive ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-[var(--st-bg)] px-2 py-1 text-xs font-semibold text-gray-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--st-muted)]">
                    {event._count.studentEvents}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {!isActive && (
                        <form action={setActiveEvent.bind(null, event.id)}>
                          <button
                            type="submit"
                            className="text-[var(--st-primary)] hover:text-blue-900"
                          >
                            Set Active
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="text-[var(--st-primary)] hover:text-blue-900"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-[var(--st-muted)]">
                  No events yet. Create your first event to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
