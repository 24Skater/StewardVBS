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
          <h2 className="text-2xl font-bold text-gray-900">Events</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage VBS events. Only one event can be active at a time.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Event
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Year
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Theme
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Students
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {events.map((event) => {
              const isActive = activeEvent?.id === event.id;
              return (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {event.year}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {event.theme || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {isActive ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {event._count.studentEvents}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {!isActive && (
                        <form action={setActiveEvent.bind(null, event.id)}>
                          <button
                            type="submit"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Set Active
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="text-blue-600 hover:text-blue-900"
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
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
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
