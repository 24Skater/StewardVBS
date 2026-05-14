import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveEvent } from "@/lib/event";
import { requireAuth } from "@/lib/auth";
import { Users, DollarSign, Clock, CheckCircle2, BarChart3, ClipboardList, Calendar, Settings } from "lucide-react";

export default async function Dashboard() {
  await requireAuth();

  try {
    const event = await getActiveEvent();

    // Fetch all dashboard data in parallel
    const [
      students,
      categories,
      teachers,
      payments,
      recentStudents,
      todayAttendance,
      totalAttendance,
    ] = await Promise.all([
      prisma.student.findMany({
        where: { events: { some: { eventId: event.id } } },
        select: {
          id: true,
          name: true,
          category: true,
          dateOfBirth: true,
          createdAt: true,
        },
      }),
      prisma.studentCategory.findMany({
        where: { OR: [{ eventId: event.id }, { eventId: null }] },
        select: { id: true, name: true, color: true },
        orderBy: { order: "asc" },
      }),
      prisma.teacher.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { students: true } },
        },
      }),
      prisma.payment.findMany({
        where: { eventId: event.id },
        select: { studentId: true },
      }),
      prisma.student.findMany({
        where: { events: { some: { eventId: event.id } } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          category: true,
          createdAt: true,
        },
      }),
      prisma.attendance.count({
        where: {
          eventId: event.id,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.attendance.count({
        where: { eventId: event.id },
      }),
    ]);

    // Calculate statistics
    const totalStudents = students.length;
    const paidStudentIds = new Set(payments.map((p) => p.studentId));
    const paidCount = paidStudentIds.size;
    const unpaidCount = totalStudents - paidCount;
    const paymentPercentage = totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0;

    // Category breakdown
    const categoryBreakdown = categories.map((cat) => ({
      name: cat.name,
      color: cat.color || "#3b82f6",
      count: students.filter((s) => s.category === cat.name).length,
    }));
    const maxCategoryCount = Math.max(...categoryBreakdown.map((c) => c.count), 1);

    // Teacher breakdown
    const teacherBreakdown = teachers
      .map((t) => ({
        name: t.name,
        count: t._count.students,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const maxTeacherCount = Math.max(...teacherBreakdown.map((t) => t.count), 1);

    // Age breakdown
    const ageGroups: Record<string, number> = {
      "3-4": 0,
      "5-6": 0,
      "7-8": 0,
      "9-10": 0,
      "11-12": 0,
      "13+": 0,
      Unknown: 0,
    };

    students.forEach((student) => {
      if (!student.dateOfBirth) {
        ageGroups["Unknown"]++;
        return;
      }
      const age = Math.floor(
        (Date.now() - new Date(student.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      );
      if (age <= 4) ageGroups["3-4"]++;
      else if (age <= 6) ageGroups["5-6"]++;
      else if (age <= 8) ageGroups["7-8"]++;
      else if (age <= 10) ageGroups["9-10"]++;
      else if (age <= 12) ageGroups["11-12"]++;
      else ageGroups["13+"]++;
    });

    const ageBreakdown = Object.entries(ageGroups)
      .filter(([, count]) => count > 0)
      .map(([range, count]) => ({ range, count }));
    const maxAgeCount = Math.max(...ageBreakdown.map((a) => a.count), 1);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              {event.year} {event.theme && `• ${event.theme}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/students/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Add Student
            </Link>
            <Link
              href="/checkin"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Check-In
            </Link>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="mt-1 text-4xl font-bold text-blue-600">{totalStudents}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <Link href="/students" className="mt-3 block text-sm text-blue-600 hover:underline">
              View all students
            </Link>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Paid</p>
                <p className="mt-1 text-4xl font-bold text-green-600">{paidCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${paymentPercentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-500">{paymentPercentage}%</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-amber-50 to-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Unpaid</p>
                <p className="mt-1 text-4xl font-bold text-amber-600">{unpaidCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="mt-3 text-sm text-amber-600">
              {unpaidCount > 0 ? `${unpaidCount} students need payment` : "All paid!"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50 to-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Today&apos;s Check-ins</p>
                <p className="mt-1 text-4xl font-bold text-purple-600">{todayAttendance}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              {totalAttendance} total check-ins this event
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Students by Category */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Students by Category</h2>
              <Link href="/reports/students" className="text-sm text-blue-600 hover:underline">
                View Report
              </Link>
            </div>
            <div className="space-y-3">
              {categoryBreakdown.map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 truncate">{cat.name}</div>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(cat.count / maxCategoryCount) * 100}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                  <div className="w-8 text-sm font-medium text-gray-900 text-right">
                    {cat.count}
                  </div>
                </div>
              ))}
              {categoryBreakdown.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No categories yet</p>
              )}
            </div>
          </div>

          {/* Students by Teacher */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Students by Teacher</h2>
              <Link href="/admin/teachers" className="text-sm text-blue-600 hover:underline">
                Manage Teachers
              </Link>
            </div>
            <div className="space-y-3">
              {teacherBreakdown.map((teacher) => (
                <div key={teacher.name} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 truncate">{teacher.name}</div>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${(teacher.count / maxTeacherCount) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="w-8 text-sm font-medium text-gray-900 text-right">
                    {teacher.count}
                  </div>
                </div>
              ))}
              {teacherBreakdown.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No teachers assigned yet.{" "}
                  <Link href="/admin/teachers/new" className="text-blue-600 hover:underline">
                    Add teachers
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Age Distribution & Recent Students */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Age Distribution */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h2>
            <div className="flex items-end justify-between h-40 gap-2">
              {ageBreakdown.map((age) => (
                <div key={age.range} className="flex-1 flex flex-col items-center">
                  <div className="text-xs font-medium text-gray-900 mb-1">{age.count}</div>
                  <div
                    className="w-full bg-gradient-to-t from-teal-500 to-teal-400 rounded-t-md transition-all duration-500"
                    style={{
                      height: `${(age.count / maxAgeCount) * 100}%`,
                      minHeight: age.count > 0 ? "8px" : "0",
                    }}
                  />
                  <div className="text-xs text-gray-500 mt-2 whitespace-nowrap">{age.range}</div>
                </div>
              ))}
            </div>
            {ageBreakdown.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                No age data available
              </p>
            )}
          </div>

          {/* Recently Enrolled */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recently Enrolled</h2>
              <Link href="/students" className="text-sm text-blue-600 hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {recentStudents.map((student) => (
                <Link
                  key={student.id}
                  href={`/students/${student.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-medium">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.category}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatTimeAgo(student.createdAt)}
                  </div>
                </Link>
              ))}
              {recentStudents.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No students enrolled yet.{" "}
                  <Link href="/students/new" className="text-blue-600 hover:underline">
                    Add your first student
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Overview</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <div className="text-3xl font-bold text-gray-900">{totalStudents}</div>
              <div className="text-sm text-gray-500">Total Enrolled</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50">
              <div className="text-3xl font-bold text-green-600">{paidCount}</div>
              <div className="text-sm text-green-700">Paid ({paymentPercentage}%)</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-amber-50">
              <div className="text-3xl font-bold text-amber-600">{unpaidCount}</div>
              <div className="text-sm text-amber-700">Pending ({100 - paymentPercentage}%)</div>
            </div>
          </div>
          {/* Visual bar */}
          <div className="mt-4 h-4 w-full rounded-full bg-gray-200 overflow-hidden flex">
            <div
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${paymentPercentage}%` }}
            />
            <div
              className="bg-amber-400 transition-all duration-500"
              style={{ width: `${100 - paymentPercentage}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Paid</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Pending</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/reports"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Reports</div>
              <div className="text-xs text-gray-500">Generate & export</div>
            </div>
          </Link>

          <Link
            href="/attendance"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-green-300 hover:shadow-md transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <ClipboardList className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Attendance</div>
              <div className="text-xs text-gray-500">Track & manage</div>
            </div>
          </Link>

          <Link
            href="/schedule"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-purple-300 hover:shadow-md transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Schedule</div>
              <div className="text-xs text-gray-500">Event calendar</div>
            </div>
          </Link>

          <Link
            href="/admin"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-amber-300 hover:shadow-md transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Settings className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Admin</div>
              <div className="text-xs text-gray-500">Settings & config</div>
            </div>
          </Link>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="rounded-md bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            {error instanceof Error
              ? error.message
              : "No active event found. Please activate an event in the admin panel."}
          </p>
        </div>
      </div>
    );
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}
