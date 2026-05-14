import { requireRole } from "@/lib/auth";
import { NextResponse } from "next/server";

const TEMPLATE_HEADERS = [
  "name",
  "category",
  "size",
  "grade",
  "dateOfBirth",
  "parentName",
  "parentPhone",
  "parentEmail",
  "emergencyContact",
  "emergencyPhone",
  "emergencyRelationship",
  "allergies",
  "medicalNotes",
  "notes",
];

const EXAMPLE_ROW = [
  "Jane Smith",
  "Youth",
  "YM",
  "3rd Grade",
  "2015-06-15",
  "John Smith",
  "555-123-4567",
  "jsmith@email.com",
  "Mary Jones",
  "555-987-6543",
  "Aunt",
  "Peanuts",
  "",
  "",
];

export async function GET() {
  await requireRole("STAFF");

  const rows = [TEMPLATE_HEADERS, EXAMPLE_ROW];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="students-import-template.csv"',
    },
  });
}

function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
