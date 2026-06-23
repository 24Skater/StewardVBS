import { requireRole } from "@/lib/auth";
import Link from "next/link";
import StudentImportForm from "./StudentImportForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@steward-apps/ui";

export default async function ImportStudentsPage() {
  await requireRole("STAFF");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">Import Students</h1>
          <p className="mt-1 text-sm text-[var(--st-muted)]">
            Upload a CSV file to add multiple students at once
          </p>
        </div>
        <Link href="/students">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back to Students
          </Button>
        </Link>
      </div>

      {/* Instructions */}
      <div className="rounded-lg border border-[var(--st-primary)]/20 bg-[var(--st-primary)]/10 p-4">
        <h2 className="text-sm font-semibold text-[var(--st-fg)] mb-2">How to import students</h2>
        <ol className="text-sm text-[var(--st-muted)] space-y-1 list-decimal list-inside">
          <li>Download the CSV template below</li>
          <li>Fill in your student data (name and category are required)</li>
          <li>Upload the completed file and click Import</li>
        </ol>
        <div className="mt-3">
          <a
            href="/api/students/import/template"
            download
          >
            <Button variant="primary" size="sm">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download CSV Template
            </Button>
          </a>
        </div>
      </div>

      {/* Column reference */}
      <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--st-fg)] mb-3">CSV Column Reference</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--st-muted)] border-b border-[var(--st-border)]">
                <th className="pb-2 pr-4 font-medium">Column</th>
                <th className="pb-2 pr-4 font-medium">Required</th>
                <th className="pb-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--st-border)]">
              {[
                ["name", "Yes", "Full name of the student"],
                ["category", "Yes", "Group/class the student belongs to"],
                ["size", "No", "Shirt size: YXS, YS, YM, YL, YXL, AS, AM, AL, AXL, A2XL — defaults to YM"],
                ["grade", "No", 'e.g., "3rd Grade", "Kindergarten"'],
                ["dateOfBirth", "No", "Format: YYYY-MM-DD (e.g., 2015-06-15)"],
                ["parentName", "No", "Parent or guardian name"],
                ["parentPhone", "No", "Parent phone number"],
                ["parentEmail", "No", "Parent email address"],
                ["emergencyContact", "No", "Emergency contact name"],
                ["emergencyPhone", "No", "Emergency contact phone"],
                ["emergencyRelationship", "No", 'e.g., "Aunt", "Grandparent"'],
                ["allergies", "No", "List any allergies"],
                ["medicalNotes", "No", "Medical conditions or special needs"],
                ["notes", "No", "General notes"],
              ].map(([col, req, notes]) => (
                <tr key={col}>
                  <td className="py-1.5 pr-4 font-mono text-xs text-[var(--st-fg)]">{col}</td>
                  <td className="py-1.5 pr-4">
                    {req === "Yes" ? (
                      <span className="text-red-600 font-medium">Required</span>
                    ) : (
                      <span className="text-[var(--st-muted)]">Optional</span>
                    )}
                  </td>
                  <td className="py-1.5 text-[var(--st-muted)]">{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <StudentImportForm />
    </div>
  );
}
