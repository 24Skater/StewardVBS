"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Printer, Check, X, ArrowLeft } from "lucide-react";

interface AttendanceReportBuilderProps {
  eventId: number;
  eventYear: number;
  categories: { id: number; name: string }[];
  availableDates: string[];
}

interface AttendanceData {
  students: {
    id: number;
    name: string;
    category: string;
    checkedIn: boolean;
    checkInTime?: string;
  }[];
  summary: {
    total: number;
    checkedIn: number;
    notCheckedIn: number;
    percentage: number;
  };
  date: string;
  generatedAt: string;
}

export default function AttendanceReportBuilder({
  eventId,
  eventYear,
  categories,
  availableDates,
}: AttendanceReportBuilderProps) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0] || today);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all, checkedIn, notCheckedIn
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<AttendanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        eventId: String(eventId),
        date: selectedDate,
      });
      if (categoryFilter) params.set("category", categoryFilter);

      const response = await fetch(`/api/reports/attendance?${params}`);
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!reportData) return;

    const headers = ["#", "Name", "Category", "Status", "Check-in Time"];
    const filteredStudents = getFilteredStudents();
    const rows = filteredStudents.map((student, index) => [
      index + 1,
      student.name,
      student.category,
      student.checkedIn ? "Checked In" : "Not Checked In",
      student.checkInTime ? new Date(student.checkInTime).toLocaleTimeString() : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_${selectedDate}_${eventYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const getFilteredStudents = () => {
    if (!reportData) return [];
    return reportData.students.filter((student) => {
      if (statusFilter === "checkedIn" && !student.checkedIn) return false;
      if (statusFilter === "notCheckedIn" && student.checkedIn) return false;
      return true;
    });
  };

  const filteredStudents = getFilteredStudents();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Options</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {availableDates.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {availableDates.slice(0, 5).map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`text-xs px-2 py-1 rounded ${
                      selectedDate === date
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category/Group
            </label>
            <select
              id="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status Filter
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="all">All Students</option>
              <option value="checkedIn">Checked In Only</option>
              <option value="notCheckedIn">Not Checked In Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={generateReport}
          disabled={loading}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Report"}
        </button>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Report Results */}
      {reportData && (
        <div className="space-y-4 print:space-y-2">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4 print:hidden">
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{reportData.summary.total}</div>
              <div className="text-sm text-gray-500">Total Students</div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{reportData.summary.checkedIn}</div>
              <div className="text-sm text-green-700">Checked In</div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{reportData.summary.notCheckedIn}</div>
              <div className="text-sm text-red-700">Not Checked In</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{reportData.summary.percentage}%</div>
              <div className="text-sm text-blue-700">Attendance Rate</div>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center justify-between print:hidden">
            <div className="text-sm text-gray-600">
              Showing <strong>{filteredStudents.length}</strong> of {reportData.students.length} students
              {" "}for{" "}
              <strong>{new Date(reportData.date).toLocaleDateString()}</strong>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
              <button
                type="button"
                onClick={printReport}
                className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>

          {/* Print Header */}
          <div className="hidden print:block text-center mb-4">
            <h1 className="text-xl font-bold">Attendance Report - {eventYear}</h1>
            <p className="text-sm text-gray-600">
              Date: {new Date(reportData.date).toLocaleDateString()} |
              Generated: {new Date(reportData.generatedAt).toLocaleString()}
            </p>
            <p className="text-sm">
              Total: {reportData.summary.total} | Present: {reportData.summary.checkedIn} |
              Absent: {reportData.summary.notCheckedIn} | Rate: {reportData.summary.percentage}%
            </p>
          </div>

          {/* Results Table */}
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Check-in Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    className={student.checkedIn ? "bg-green-50" : "bg-red-50"}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {student.category}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {student.checkedIn ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <Check className="h-4 w-4" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          <X className="h-4 w-4" /> Absent
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {student.checkInTime
                        ? new Date(student.checkInTime).toLocaleTimeString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No students found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

