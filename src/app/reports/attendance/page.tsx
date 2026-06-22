import { requireRole } from "@/lib/auth";
import { getActiveEvent } from "@/lib/event";
import { prisma } from "@/lib/prisma";
import AttendanceReportBuilder from "./AttendanceReportBuilder";

export default async function AttendanceReportPage() {
  await requireRole("STAFF");

  let event;
  let categories: { id: number; name: string }[] = [];
  let dates: string[] = [];

  try {
    event = await getActiveEvent();

    // Get categories
    categories = await prisma.studentCategory.findMany({
      where: { eventId: event.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // Get unique attendance dates
    const attendanceRecords = await prisma.attendance.findMany({
      where: { eventId: event.id },
      select: { date: true },
      distinct: ["date"],
      orderBy: { date: "desc" },
    });
    dates = attendanceRecords.map((r) => r.date.toISOString().split("T")[0]);
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Attendance Report</h1>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            No active event found. Please activate an event first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Attendance Report</h1>
        <p className="mt-1 text-sm text-[var(--st-muted)]">
          Track check-ins and attendance for {event.year} {event.theme && `- ${event.theme}`}
        </p>
      </div>

      <AttendanceReportBuilder
        eventId={event.id}
        eventYear={event.year}
        categories={categories}
        availableDates={dates}
      />
    </div>
  );
}
