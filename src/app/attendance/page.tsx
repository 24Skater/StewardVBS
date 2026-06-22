import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveEvent } from "@/lib/event";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import { getDayRange } from "@/lib/date-utils";
import AttendanceControls from "../../components/AttendanceControls";
import { undoAttendance } from "./actions";
import { Button } from "@steward-apps/ui";

/* ------------------------------ Helpers ------------------------------ */
function rangeForDate(iso?: string) {
  // iso = "YYYY-MM-DD" (from <input type="date">)
  const base = iso ? new Date(iso) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
  return { start, end };
}

type PageProps = {
  searchParams: Promise<{
    date?: string; // yyyy-mm-dd
    q?: string;
    category?: string;
  }>;
};

export default async function AttendancePage({ searchParams }: PageProps) {
  await requireRole("STAFF");

  const resolvedSearchParams = await searchParams;
  const { date, q } = resolvedSearchParams;
  const category = (resolvedSearchParams.category ?? "").trim() || undefined;

  let event;
  try {
    event = await getActiveEvent();
  } catch (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Attendance</h1>
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

  const { start, end } = getDayRange(date);
  const categories = await getCategories(event.id);

  // Pull today's attendance (filtered)
  const records = await prisma.attendance.findMany({
    where: {
      eventId: event.id,
      date: { gte: start, lt: end },
      student: {
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(category ? { category } : {}),
      },
    },
    include: {
      student: { select: { id: true, name: true, category: true, size: true } },
    },
    orderBy: { date: "desc" },
  });

  // quick counts
  const total = records.length;
  const byCat = records.reduce<Record<string, number>>((acc, r) => {
    const key = r.student.category;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // Keep current filters for Export CSV link
  const qs = new URLSearchParams();
  if (date) qs.set("date", date);
  if (q) qs.set("q", q);
  if (category) qs.set("category", category);
  const exportHref = `/attendance/export?${qs.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Attendance</h1>
        <Link
          href={exportHref}
          className="rounded-md bg-[var(--st-bg)] px-3 py-1.5 text-sm hover:opacity-80"
        >
          Export CSV
        </Link>
      </div>

      <AttendanceControls categories={categories} />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Present" value={String(total)} />
        {categories.map((cat) => (
          <Stat key={cat.name} title={cat.name} value={String(byCat[cat.name] ?? 0)} />
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]">
        <table className="min-w-full">
          <thead className="bg-[var(--st-bg)]">
            <tr className="text-left text-sm text-[var(--st-muted)]">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t text-sm">
                <td className="px-4 py-2">
                  <Link href={`/students/${r.student.id}`} className="hover:underline">
                    {r.student.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{r.student.category}</td>
                <td className="px-4 py-2">{r.student.size}</td>
                <td className="px-4 py-2">
                  {new Date(r.date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={undoAttendance}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="date" value={resolvedSearchParams.date ?? ""} />
                    <Button
                      type="submit"
                      variant="destructive"
                      size="sm"
                      title="Remove this check-in"
                    >
                      Undo
                    </Button>
                  </form>
                </td>
              </tr>
            ))}

            {records.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-[var(--st-muted)]" colSpan={5}>
                  No attendance records with current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)] p-4">
      <div className="text-sm text-[var(--st-muted)]">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
