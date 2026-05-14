"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Printer, ArrowLeft } from "lucide-react";

interface StudentReportBuilderProps {
  eventId: number;
  eventYear: number;
  categories: { id: number; name: string }[];
  teachers: { id: number; name: string }[];
}

interface StudentField {
  key: string;
  label: string;
  category: string;
  default: boolean;
}

const STUDENT_FIELDS: StudentField[] = [
  // Basic Info
  { key: "name", label: "Name", category: "Basic", default: true },
  { key: "category", label: "Category/Group", category: "Basic", default: true },
  { key: "size", label: "Shirt Size", category: "Basic", default: true },
  { key: "grade", label: "Grade", category: "Basic", default: false },
  { key: "dateOfBirth", label: "Date of Birth", category: "Basic", default: false },
  { key: "age", label: "Age", category: "Basic", default: false },
  
  // Parent Info
  { key: "parentName", label: "Parent Name", category: "Parent", default: false },
  { key: "parentPhone", label: "Parent Phone", category: "Parent", default: false },
  { key: "parentEmail", label: "Parent Email", category: "Parent", default: false },
  
  // Emergency Contact
  { key: "emergencyContact", label: "Emergency Contact", category: "Emergency", default: false },
  { key: "emergencyPhone", label: "Emergency Phone", category: "Emergency", default: false },
  { key: "emergencyRelationship", label: "Emergency Relationship", category: "Emergency", default: false },
  
  // Medical
  { key: "allergies", label: "Allergies", category: "Medical", default: false },
  { key: "medicalNotes", label: "Medical Notes", category: "Medical", default: false },
  
  // Status
  { key: "paymentStatus", label: "Payment Status", category: "Status", default: false },
  { key: "attendanceCount", label: "Attendance Count", category: "Status", default: false },
  
  // Other
  { key: "notes", label: "Notes", category: "Other", default: false },
  { key: "createdAt", label: "Registration Date", category: "Other", default: false },
];

interface ReportData {
  students: Record<string, unknown>[];
  generatedAt: string;
  filters: {
    category?: string;
    teacher?: string;
  };
}

export default function StudentReportBuilder({
  eventId,
  eventYear,
  categories,
  teachers,
}: StudentReportBuilderProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(
    STUDENT_FIELDS.filter((f) => f.default).map((f) => f.key)
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [teacherFilter, setTeacherFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fieldCategories = [...new Set(STUDENT_FIELDS.map((f) => f.category))];

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    setSelectedFields(STUDENT_FIELDS.map((f) => f.key));
  };

  const selectNone = () => {
    setSelectedFields(["name"]); // Always keep name
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        eventId: String(eventId),
        fields: selectedFields.join(","),
      });
      if (categoryFilter) params.set("category", categoryFilter);
      if (teacherFilter) params.set("teacherId", teacherFilter);

      const response = await fetch(`/api/reports/students?${params}`);
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

    const headers = selectedFields.map(
      (key) => STUDENT_FIELDS.find((f) => f.key === key)?.label || key
    );
    const rows = reportData.students.map((student) =>
      selectedFields.map((key) => {
        const value = student[key];
        if (value === null || value === undefined) return "";
        if (typeof value === "boolean") return value ? "Yes" : "No";
        if (typeof value === "string" && value.includes(",")) return `"${value}"`;
        return String(value);
      })
    );

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `students_report_${eventYear}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
            <label htmlFor="teacher" className="block text-sm font-medium text-gray-700">
              Teacher
            </label>
            <select
              id="teacher"
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="">All Teachers</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Field Selection */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Select Fields</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={selectNone}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select None
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {fieldCategories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {STUDENT_FIELDS.filter((f) => f.category === category).map((field) => (
                  <label
                    key={field.key}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                      selectedFields.includes(field.key)
                        ? "bg-blue-100 text-blue-800 border-2 border-blue-300"
                        : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={() => toggleField(field.key)}
                      className="sr-only"
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={generateReport}
          disabled={loading || selectedFields.length === 0}
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
          {/* Export Actions */}
          <div className="flex items-center justify-between print:hidden">
            <div className="text-sm text-gray-600">
              Found <strong>{reportData.students.length}</strong> students
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
            <h1 className="text-xl font-bold">Student List Report - {eventYear}</h1>
            <p className="text-sm text-gray-600">
              Generated: {new Date(reportData.generatedAt).toLocaleString()}
              {reportData.filters.category && ` | Category: ${reportData.filters.category}`}
              {reportData.filters.teacher && ` | Teacher: ${reportData.filters.teacher}`}
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
                  {selectedFields.map((key) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {STUDENT_FIELDS.find((f) => f.key === key)?.label || key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {reportData.students.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    {selectedFields.map((key) => (
                      <td key={key} className="px-4 py-3 text-sm text-gray-900">
                        {formatValue(student[key], key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {reportData.students.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No students found matching your criteria.
            </div>
          )}
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          table,
          table * {
            visibility: visible;
          }
          table {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}

function formatValue(value: unknown, key: string): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "dateOfBirth" && typeof value === "string") {
    return new Date(value).toLocaleDateString();
  }
  if (key === "createdAt" && typeof value === "string") {
    return new Date(value).toLocaleDateString();
  }
  if (key === "paymentStatus") {
    return value === "paid" ? "Paid" : "Unpaid";
  }
  return String(value);
}

