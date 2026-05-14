import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { NextRequest, NextResponse } from "next/server";

const REQUIRED_HEADERS = ["name", "category"];
const VALID_SIZES = ["YXS", "YS", "YM", "YL", "YXL", "AS", "AM", "AL", "AXL", "A2XL"];

interface ImportRow {
  name: string;
  category: string;
  size?: string;
  grade?: string;
  dateOfBirth?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  allergies?: string;
  medicalNotes?: string;
  notes?: string;
}

interface RowResult {
  row: number;
  name: string;
  status: "created" | "skipped" | "error";
  reason?: string;
}

export async function POST(req: NextRequest) {
  const session = await requireRole("STAFF");

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const text = await (file as File).text();
  const { headers, rows, parseError } = parseCsv(text);

  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      return NextResponse.json(
        { error: `Missing required column: "${required}". Download the template for the correct format.` },
        { status: 400 }
      );
    }
  }

  const results: RowResult[] = [];
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // 1-based, +1 for header
    const raw = rows[i];
    const row = mapRow(headers, raw);

    const name = row.name?.trim();
    const category = row.category?.trim();

    if (!name) {
      results.push({ row: rowNum, name: "(empty)", status: "error", reason: "Name is required" });
      errors++;
      continue;
    }
    if (!category) {
      results.push({ row: rowNum, name, status: "error", reason: "Category is required" });
      errors++;
      continue;
    }
    if (name.length > 100) {
      results.push({ row: rowNum, name, status: "error", reason: "Name exceeds 100 characters" });
      errors++;
      continue;
    }

    const size = resolveSize(row.size?.trim());
    const dateOfBirth = parseDate(row.dateOfBirth?.trim());

    try {
      const existing = await prisma.student.findFirst({
        where: { name },
        select: { id: true },
      });

      if (existing) {
        results.push({ row: rowNum, name, status: "skipped", reason: "Already exists" });
        skipped++;
        continue;
      }

      await prisma.student.create({
        data: {
          name,
          category,
          size,
          grade: row.grade?.trim() || null,
          dateOfBirth,
          parentName: row.parentName?.trim() || null,
          parentPhone: row.parentPhone?.trim() || null,
          parentEmail: row.parentEmail?.trim() || null,
          emergencyContact: row.emergencyContact?.trim() || null,
          emergencyPhone: row.emergencyPhone?.trim() || null,
          emergencyRelationship: row.emergencyRelationship?.trim() || null,
          allergies: row.allergies?.trim() || null,
          medicalNotes: row.medicalNotes?.trim() || null,
          notes: row.notes?.trim() || null,
        },
      });

      results.push({ row: rowNum, name, status: "created" });
      created++;
    } catch {
      results.push({ row: rowNum, name, status: "error", reason: "Database error" });
      errors++;
    }
  }

  if (created > 0) {
    await auditLog({
      userId: session.user.id,
      action: "STUDENT_CREATED",
      resourceType: "Student",
      details: { source: "csv_import", created, skipped, errors },
    });
  }

  return NextResponse.json({ created, skipped, errors, results });
}

function parseCsv(text: string): {
  headers: string[];
  rows: string[][];
  parseError?: string;
} {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);

  if (nonEmpty.length < 2) {
    return { headers: [], rows: [], parseError: "CSV must have a header row and at least one data row" };
  }

  const headers = parseCsvLine(nonEmpty[0]).map((h) => h.trim().toLowerCase());
  const rows = nonEmpty.slice(1).map(parseCsvLine);

  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function mapRow(headers: string[], values: string[]): ImportRow {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = values[i] ?? "";
  });
  return obj as unknown as ImportRow;
}

function resolveSize(raw?: string): string {
  if (!raw) return "YM";
  const upper = raw.toUpperCase();
  return VALID_SIZES.includes(upper) ? upper : "YM";
}

function parseDate(raw?: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}
