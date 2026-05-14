import { prisma } from "@/lib/prisma";
import { getActiveEvent } from "@/lib/event";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import { getTodayRange } from "@/lib/date-utils";
import CheckinControls from "@/components/CheckinControls";
import { escapeHtml } from "@/lib/xss-protection";
import { checkInById } from "./actions";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

export default async function CheckInPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const q = (resolvedSearchParams.q ?? "").trim();
  const category = (resolvedSearchParams.category ?? "").trim() || undefined;

  await requireRole("STAFF");

  let event;
  try {
    event = await getActiveEvent();
  } catch (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Check-In</h1>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {error instanceof Error
              ? error.message
              : "No active event found. Please activate an event in the admin panel."}
          </p>
        </div>
      </div>
    );
  }

  const { start, end } = getTodayRange();
  const categories = await getCategories(event.id);

  // Load students enrolled in this event + today's check-in status
  const students = await prisma.student.findMany({
    where: {
      events: { some: { eventId: event.id } },
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      attendances: {
        where: { eventId: event.id, date: { gte: start, lt: end } },
        select: { id: true },
      },
    },
  });

  // Bind actions for each student (required for <form action={...}>)
  const bound = (id: number) => checkInById.bind(null, id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Check-In</h1>

      <CheckinControls categories={categories} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => {
          const present = s.attendances.length > 0;
          const action = bound(s.id);

          return (
            <form
              key={s.id}
              action={action}
              className={`flex items-center justify-between rounded-xl border p-4 ${
                present ? "bg-green-50 border-green-200" : "bg-white"
              }`}
            >
              <div>
                <div className="text-lg font-semibold">{escapeHtml(s.name)}</div>
                <div className="text-sm text-gray-600">
                  {escapeHtml(s.category)} • {escapeHtml(s.size)}
                </div>
              </div>

              <button
                type="submit"
                className={
                  present
                    ? "rounded-md bg-gray-200 px-4 py-2 text-gray-700 cursor-default"
                    : "rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                }
                disabled={present}
                title={present ? "Already checked in today" : "Check in now"}
              >
                {present ? "Present" : "Check In"}
              </button>
            </form>
          );
        })}

        {students.length === 0 && (
          <div className="text-gray-500">No students match your search.</div>
        )}
      </div>
    </div>
  );
}
