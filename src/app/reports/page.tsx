import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getActiveEvent } from "@/lib/event";
import { prisma } from "@/lib/prisma";
import { Users, CheckCircle2, Calendar, ClipboardList, AlertTriangle, ChevronRight } from "lucide-react";

export default async function ReportsPage() {
  await requireRole("STAFF");

  let event;
  let stats = { students: 0, categories: 0, teachers: 0, attendance: 0 };

  try {
    event = await getActiveEvent();
    const [studentCount, categoryCount, teacherCount, attendanceCount] = await Promise.all([
      prisma.studentEvent.count({ where: { eventId: event.id } }),
      prisma.studentCategory.count({ where: { eventId: event.id } }),
      prisma.teacher.count({ where: { isActive: true } }),
      prisma.attendance.count({ where: { eventId: event.id } }),
    ]);
    stats = {
      students: studentCount,
      categories: categoryCount,
      teachers: teacherCount,
      attendance: attendanceCount,
    };
  } catch {
    // No active event
  }

  const reports = [
    {
      id: "students",
      title: "Student List Report",
      description: "Export student roster with customizable fields. Filter by category, teacher, or export all.",
      icon: <Users className="h-6 w-6" />,
      href: "/reports/students",
      color: "blue",
      stats: `${stats.students} students`,
    },
    {
      id: "attendance",
      title: "Attendance Report",
      description: "View check-in status, who attended and who didn't. Filter by date or date range.",
      icon: <CheckCircle2 className="h-6 w-6" />,
      href: "/reports/attendance",
      color: "green",
      stats: `${stats.attendance} check-ins`,
    },
    {
      id: "schedule",
      title: "Schedule Report",
      description: "Export event schedules by group or for the entire event.",
      icon: <Calendar className="h-6 w-6" />,
      href: "/reports/schedule",
      color: "purple",
      stats: event ? `${event.year} Event` : "No active event",
    },
    {
      id: "enrollment",
      title: "Enrollment Report",
      description: "Track enrollment status, payment status, and registration completion.",
      icon: <ClipboardList className="h-6 w-6" />,
      href: "/reports/enrollment",
      color: "amber",
      stats: `${stats.students} enrolled`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Reports</h1>
        <p className="mt-1 text-sm text-[var(--st-muted)]">
          Generate and export reports for your VBS event
        </p>
      </div>

      {!event && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-yellow-800 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> No active event found. Please activate an event to generate reports.
          </p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={report.href}
            className={`group relative rounded-xl border-2 p-6 transition-all hover:shadow-lg ${
              report.color === "blue"
                ? "border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-white"
                : report.color === "green"
                ? "border-green-200 hover:border-green-400 bg-gradient-to-br from-green-50 to-white"
                : report.color === "purple"
                ? "border-purple-200 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-white"
                : "border-amber-200 hover:border-amber-400 bg-gradient-to-br from-amber-50 to-white"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                  report.color === "blue"
                    ? "bg-blue-100 text-blue-600"
                    : report.color === "green"
                    ? "bg-green-100 text-green-600"
                    : report.color === "purple"
                    ? "bg-purple-100 text-purple-600"
                    : "bg-amber-100 text-amber-600"
                }`}
              >
                {report.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--st-fg)] group-hover:text-[var(--st-primary)]">
                  {report.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--st-muted)]">{report.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--st-muted)]">{report.stats}</span>
                  <span className="flex items-center gap-1 text-sm font-medium text-[var(--st-primary)] group-hover:translate-x-1 transition-transform">
                    Generate <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      {event && (
        <div className="rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--st-fg)] mb-4">Quick Stats - {event.year}</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="text-center p-4 bg-[var(--st-bg)] rounded-lg">
              <div className="text-3xl font-bold text-[var(--st-primary)]">{stats.students}</div>
              <div className="text-sm text-[var(--st-muted)]">Total Students</div>
            </div>
            <div className="text-center p-4 bg-[var(--st-bg)] rounded-lg">
              <div className="text-3xl font-bold text-green-600">{stats.categories}</div>
              <div className="text-sm text-[var(--st-muted)]">Categories</div>
            </div>
            <div className="text-center p-4 bg-[var(--st-bg)] rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{stats.teachers}</div>
              <div className="text-sm text-[var(--st-muted)]">Teachers</div>
            </div>
            <div className="text-center p-4 bg-[var(--st-bg)] rounded-lg">
              <div className="text-3xl font-bold text-amber-600">{stats.attendance}</div>
              <div className="text-sm text-[var(--st-muted)]">Check-ins</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
