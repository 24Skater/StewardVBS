import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getActiveEvent } from "@/lib/event";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";
import { Download, ArrowLeft, Check, X, AlertTriangle } from "lucide-react";

export default async function EnrollmentReportPage() {
  await requireRole("STAFF");

  let event;
  let students: {
    id: number;
    name: string;
    category: string;
    hasPaid: boolean;
    hasParent: boolean;
    hasEmergency: boolean;
    isComplete: boolean;
    createdAt: Date;
  }[] = [];
  let categories: { name: string; count: number }[] = [];

  try {
    event = await getActiveEvent();
    
    const rawStudents = await prisma.student.findMany({
      where: { events: { some: { eventId: event.id } } },
      include: {
        payments: { where: { eventId: event.id }, take: 1 },
        parents: { take: 1 },
        emergencyContacts: { take: 1 },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    students = rawStudents.map((s) => {
      const hasPaid = s.payments.length > 0;
      const hasParent = s.parents.length > 0 || Boolean(s.parentName);
      const hasEmergency = s.emergencyContacts.length > 0 || Boolean(s.emergencyContact);
      const isComplete = hasPaid && hasParent && hasEmergency;

      return {
        id: s.id,
        name: s.name,
        category: s.category,
        hasPaid,
        hasParent,
        hasEmergency,
        isComplete,
        createdAt: s.createdAt,
      };
    });

    // Count by category
    const categoryCounts = students.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    categories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[var(--st-fg)]">Enrollment Report</h1>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            No active event found. Please activate an event first.
          </p>
        </div>
      </div>
    );
  }

  // Summary stats
  const totalStudents = students.length;
  const paidCount = students.filter((s) => s.hasPaid).length;
  const completeCount = students.filter((s) => s.isComplete).length;
  const incompleteCount = totalStudents - completeCount;
  const missingParent = students.filter((s) => !s.hasParent).length;
  const missingEmergency = students.filter((s) => !s.hasEmergency).length;

  // Generate CSV
  const csvHeaders = ["Name", "Category", "Paid", "Parent Info", "Emergency Contact", "Status", "Registered"];
  const csvRows = students.map((s) => [
    s.name,
    s.category,
    s.hasPaid ? "Yes" : "No",
    s.hasParent ? "Yes" : "No",
    s.hasEmergency ? "Yes" : "No",
    s.isComplete ? "Complete" : "Incomplete",
    s.createdAt.toLocaleDateString(),
  ]);
  const csvContent = [csvHeaders.join(","), ...csvRows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
  const csvDataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">Enrollment Report</h1>
          <p className="mt-1 text-sm text-[var(--st-muted)]">
            Registration status for {event.year} {event.theme && `- ${event.theme}`}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <a
            href={csvDataUri}
            download={`enrollment_${event.year}.csv`}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
          <PrintButton />
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2 text-sm font-medium text-[var(--st-fg)] hover:bg-[var(--st-bg)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-4 text-center">
          <div className="text-3xl font-bold text-[var(--st-fg)]">{totalStudents}</div>
          <div className="text-sm text-[var(--st-muted)]">Total Enrolled</div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{completeCount}</div>
          <div className="text-sm text-green-700">Complete Registrations</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
          <div className="text-3xl font-bold text-amber-600">{incompleteCount}</div>
          <div className="text-sm text-amber-700">Incomplete</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
          <div className="text-3xl font-bold text-[var(--st-primary)]">{paidCount}</div>
          <div className="text-sm text-[var(--st-primary)]">Paid</div>
        </div>
      </div>

      {/* Missing Info Alert */}
      {(missingParent > 0 || missingEmergency > 0) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 print:hidden">
          <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Missing Information</h3>
          <div className="text-sm text-red-800 space-y-1">
            {missingParent > 0 && (
              <p>{missingParent} student{missingParent > 1 ? "s" : ""} missing parent/guardian info</p>
            )}
            {missingEmergency > 0 && (
              <p>{missingEmergency} student{missingEmergency > 1 ? "s" : ""} missing emergency contact</p>
            )}
          </div>
        </div>
      )}

      {/* By Category */}
      <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6 print:hidden">
        <h2 className="text-lg font-semibold text-[var(--st-fg)] mb-4">Enrollment by Category</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between p-3 bg-[var(--st-bg)] rounded-lg">
              <span className="font-medium text-[var(--st-fg)]">{cat.name}</span>
              <span className="text-lg font-bold text-[var(--st-primary)]">{cat.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-4">
        <div className="text-xl font-bold">
          Enrollment Report - {event.year} {event.theme && `- ${event.theme}`}
        </div>
        <p className="text-sm text-[var(--st-muted)]">
          Total: {totalStudents} | Complete: {completeCount} | Paid: {paidCount} |
          Generated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Student List */}
      <div className="overflow-x-auto rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)]">
        <table className="min-w-full divide-y divide-[var(--st-border)]">
          <thead className="bg-[var(--st-bg)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Category
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Paid
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Parent
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Emergency
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Registered
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--st-border)] bg-[var(--st-surface)]">
            {students.map((student, index) => (
              <tr
                key={student.id}
                className={student.isComplete ? "" : "bg-amber-50"}
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--st-muted)]">
                  {index + 1}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[var(--st-fg)]">
                  <Link href={`/students/${student.id}`} className="hover:text-[var(--st-primary)]">
                    {student.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--st-muted)]">
                  {student.category}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                  {student.hasPaid ? (
                    <span className="inline-flex justify-center text-green-600"><Check className="h-4 w-4" /></span>
                  ) : (
                    <span className="inline-flex justify-center text-red-600"><X className="h-4 w-4" /></span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                  {student.hasParent ? (
                    <span className="inline-flex justify-center text-green-600"><Check className="h-4 w-4" /></span>
                  ) : (
                    <span className="inline-flex justify-center text-red-600"><X className="h-4 w-4" /></span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                  {student.hasEmergency ? (
                    <span className="inline-flex justify-center text-green-600"><Check className="h-4 w-4" /></span>
                  ) : (
                    <span className="inline-flex justify-center text-red-600"><X className="h-4 w-4" /></span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  {student.isComplete ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      Incomplete
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--st-muted)]">
                  {student.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <div className="text-center py-8 text-[var(--st-muted)]">
          No students enrolled yet.
        </div>
      )}

    </div>
  );
}

