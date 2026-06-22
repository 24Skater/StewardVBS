import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

async function toggleEnrollment(studentId: number, eventId: number, enrolled: boolean) {
  "use server";
  await requireRole("STAFF");

  if (enrolled) {
    await prisma.studentEvent.deleteMany({ where: { studentId, eventId } });
  } else {
    await prisma.studentEvent.upsert({
      where: { studentId_eventId: { studentId, eventId } },
      create: { studentId, eventId },
      update: {},
    });
  }

  revalidatePath(`/students/${studentId}/events`);
  revalidatePath(`/students/${studentId}`);
}

export default async function StudentEventsPage({ params }: Props) {
  await requireRole("STAFF");

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) return notFound();

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      events: { select: { eventId: true } },
    },
  });
  if (!student) return notFound();

  const allEvents = await prisma.event.findMany({
    orderBy: { year: "desc" },
    include: {
      _count: { select: { attendances: true } },
    },
  });

  const enrolledIds = new Set(student.events.map((e) => e.eventId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">Event Enrollment</h1>
          <p className="mt-1 text-sm text-[var(--st-muted)]">{student.name}</p>
        </div>
        <Link
          href={`/students/${id}`}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--st-bg)] px-3 py-1.5 text-sm hover:bg-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>
      </div>

      {allEvents.length === 0 ? (
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-8 text-center">
          <p className="text-sm text-[var(--st-muted)] mb-3">No events have been created yet.</p>
          <Link
            href="/admin/events/new"
            className="rounded-md bg-[var(--st-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--st-primary)]/90"
          >
            Create First Event
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]">
          <table className="min-w-full">
            <thead className="bg-[var(--st-bg)]">
              <tr className="text-left text-sm text-[var(--st-muted)]">
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total Attendances</th>
                <th className="px-4 py-3 font-medium">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allEvents.map((event) => {
                const enrolled = enrolledIds.has(event.id);
                const toggle = toggleEnrollment.bind(null, id, event.id, enrolled);
                return (
                  <tr key={event.id} className={enrolled ? "bg-blue-50" : ""}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--st-fg)]">
                        {event.year}
                        {event.theme && <span className="ml-2 text-[var(--st-muted)]">– {event.theme}</span>}
                      </div>
                      {event.startDate && (
                        <div className="text-xs text-[var(--st-muted)]">
                          {new Date(event.startDate).toLocaleDateString()} – {event.endDate ? new Date(event.endDate).toLocaleDateString() : "?"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {event.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-[var(--st-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--st-muted)]">Past</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--st-muted)]">
                      {event._count.attendances} check-ins
                    </td>
                    <td className="px-4 py-3">
                      <form action={toggle}>
                        <button
                          type="submit"
                          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                            enrolled
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary)]/90"
                          }`}
                        >
                          {enrolled ? "Remove" : "Enroll"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
