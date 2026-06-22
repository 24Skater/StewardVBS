import { requireRole } from "@/lib/auth";
import { getActiveEvent } from "@/lib/event";
import { prisma } from "@/lib/prisma";
import StudentReportBuilder from "./StudentReportBuilder";

export default async function StudentReportPage() {
  await requireRole("STAFF");

  let event;
  let categories: { id: number; name: string }[] = [];
  let teachers: { id: number; name: string }[] = [];

  try {
    event = await getActiveEvent();
    [categories, teachers] = await Promise.all([
      prisma.studentCategory.findMany({
        where: { eventId: event.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.teacher.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Student List Report</h1>
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
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Student List Report</h1>
        <p className="mt-1 text-sm text-[var(--st-muted)]">
          Customize and export student data for {event.year} {event.theme && `- ${event.theme}`}
        </p>
      </div>

      <StudentReportBuilder
        eventId={event.id}
        eventYear={event.year}
        categories={categories}
        teachers={teachers}
      />
    </div>
  );
}
