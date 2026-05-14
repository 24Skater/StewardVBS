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
        <h1 className="text-2xl font-bold text-gray-900">Enrollment Report</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">Enrollment Report</h1>
          <p className="mt-1 text-sm text-gray-600">
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
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{totalStudents}</div>
          <div className="text-sm text-gray-500">Total Enrolled</div>
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
          <div className="text-3xl font-bold text-blue-600">{paidCount}</div>
          <div className="text-sm text-blue-700">Paid</div>
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
      <div className="rounded-lg border border-gray-200 bg-white p-6 print:hidden">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Enrollment by Category</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-900">{cat.name}</span>
              <span className="text-lg font-bold text-blue-600">{cat.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">
          Enrollment Report - {event.year} {event.theme && `- ${event.theme}`}
        </h1>
        <p className="text-sm text-gray-600">
          Total: {totalStudents} | Complete: {completeCount} | Paid: {paidCount} |
          Generated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Student List */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Paid
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Parent
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Emergency
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Registered
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {students.map((student, index) => (
              <tr
                key={student.id}
                className={student.isComplete ? "" : "bg-amber-50"}
              >
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {index + 1}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  <Link href={`/students/${student.id}`} className="hover:text-blue-600">
                    {student.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
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
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {student.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No students enrolled yet.
        </div>
      )}

    </div>
  );
}

