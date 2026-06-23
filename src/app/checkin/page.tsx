import { prisma } from "@/lib/prisma";
import { getActiveEvent } from "@/lib/event";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import { getTodayRange } from "@/lib/date-utils";
import CheckinControls from "@/components/CheckinControls";
import { escapeHtml } from "@/lib/xss-protection";
import { checkInById } from "./actions";
import { Button } from "@steward-apps/ui";

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
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Check-In</h1>
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

  // Require at least a 2-char search query or a category filter before hitting the DB —
  // prevents loading the entire roster on every page load.
  const hasFilter = q.length >= 2 || !!category;

  const students = hasFilter
    ? await prisma.student.findMany({
        where: {
          events: { some: { eventId: event.id } },
          ...(q.length >= 2
            ? { name: { contains: q, mode: "insensitive" } }
            : {}),
          ...(category ? { category } : {}),
        },
        orderBy: { name: "asc" },
        include: {
          attendances: {
            where: { eventId: event.id, date: { gte: start, lt: end } },
            select: { id: true },
          },
        },
      })
    : [];

  // Bind actions for each student (required for <form action={...}>)
  const bound = (id: number) => checkInById.bind(null, id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Check-In</h1>

      <CheckinControls categories={categories} />

      {!hasFilter && (
        <div className="rounded-md bg-[var(--st-primary)]/10 border border-[var(--st-border)] p-4 text-sm text-[var(--st-fg)]">
          Search by name (2+ characters) or select a category to load students.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => {
          const present = s.attendances.length > 0;
          const hasAlert = !!(s.allergies || s.medicalNotes);
          const action = bound(s.id);

          return (
            <form
              key={s.id}
              action={action}
              className={`flex items-center justify-between rounded-xl border p-4 ${
                present ? "bg-green-50 border-green-200" : "bg-[var(--st-surface)]"
              }`}
            >
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold truncate">
                    {escapeHtml(s.name)}
                  </span>
                  {hasAlert && (
                    <span
                      title={[s.allergies, s.medicalNotes]
                        .filter(Boolean)
                        .join(" | ")}
                      className="shrink-0 rounded-full bg-amber-100 border border-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-800"
                    >
                      ⚠ Alert
                    </span>
                  )}
                </div>
                <div className="text-sm text-[var(--st-muted)]">
                  {escapeHtml(s.category)} • {escapeHtml(s.size)}
                </div>
                {hasAlert && (
                  <div className="mt-1 text-xs text-amber-700 truncate">
                    {[s.allergies, s.medicalNotes].filter(Boolean).join(" | ")}
                  </div>
                )}
              </div>

              {present ? (
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled
                  title="Already checked in today"
                >
                  Present
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  title="Check in now"
                >
                  Check In
                </Button>
              )}
            </form>
          );
        })}

        {hasFilter && students.length === 0 && (
          <div className="text-[var(--st-muted)]">No students match your search.</div>
        )}
      </div>
    </div>
  );
}
