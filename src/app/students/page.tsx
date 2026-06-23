import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import StudentsFilters from "@/components/StudentsFilters";
import { parsePagination, getSkip, calculatePagination } from "@/lib/pagination";
import { escapeHtml } from "@/lib/xss-protection";
import { Button, Badge } from "@steward-apps/ui";

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    size?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function StudentsPage({ searchParams }: Props) {
  await requireRole("STAFF");

  const resolvedSearchParams = await searchParams;
  const { q = "", category, size } = resolvedSearchParams;
  const { page, pageSize } = parsePagination(resolvedSearchParams);

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(category ? { category } : {}),
    ...(size ? { size } : {}),
  };

  const sizeRows = await prisma.student.findMany({
    select: { size: true },
    distinct: ["size"],
    orderBy: { size: "asc" },
  });
  const sizes = sizeRows.map((r) => r.size);
  const categories = await getCategories();

  const total = await prisma.student.count({ where });

  const students = await prisma.student.findMany({
    where,
    orderBy: { name: "asc" },
    skip: getSkip(page, pageSize),
    take: pageSize,
    include: {
      _count: { select: { events: true, attendances: true } },
    },
  });

  const pagination = calculatePagination(total, page, pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Students</h1>
        <div className="flex items-center gap-2">
          <a
            href="/api/students/import/template"
            download
            className="rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-sm font-medium text-[var(--st-fg)] hover:bg-[var(--st-bg)]"
          >
            Download Template
          </a>
          <Link
            href="/students/import"
            className="rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-sm font-medium text-[var(--st-fg)] hover:bg-[var(--st-bg)]"
          >
            Import CSV
          </Link>
          <Link href="/students/new">
            <Button variant="primary" size="sm">Add Student</Button>
          </Link>
        </div>
      </div>

      <StudentsFilters sizes={sizes} categories={categories} />

      <div className="overflow-hidden rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]">
        <table className="min-w-full">
          <thead className="bg-[var(--st-bg)]">
            <tr className="text-left text-sm text-[var(--st-muted)]">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Events</th>
              <th className="px-4 py-2">Check-ins</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-[var(--st-border)] text-sm">
                <td className="px-4 py-2 font-medium text-[var(--st-fg)]">{escapeHtml(s.name)}</td>
                <td className="px-4 py-2 text-[var(--st-fg)]">{escapeHtml(s.size)}</td>
                <td className="px-4 py-2 text-[var(--st-fg)]">{escapeHtml(s.category)}</td>
                <td className="px-4 py-2 text-[var(--st-muted)]">{s._count.events}</td>
                <td className="px-4 py-2 text-[var(--st-muted)]">{s._count.attendances}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/students/${s.id}`}>
                    <Button variant="primary" size="sm">View</Button>
                  </Link>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-[var(--st-muted)]" colSpan={6}>
                  No students found.{" "}
                  <Link href="/students/new" className="text-[var(--st-primary)] hover:underline">
                    Add your first student
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-3 sm:px-6">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--st-muted)]">
              Showing <span className="font-medium">{getSkip(page, pageSize) + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(getSkip(page, pageSize) + pageSize, pagination.total)}
              </span>{" "}
              of <span className="font-medium">{pagination.total}</span> results
            </p>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
              {pagination.hasPrev && (
                <Link
                  href={`/students?${new URLSearchParams({ ...resolvedSearchParams, page: String(pagination.page - 1) }).toString()}`}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-[var(--st-muted)] ring-1 ring-inset ring-[var(--st-border)] hover:bg-[var(--st-bg)]"
                >
                  Previous
                </Link>
              )}
              {pagination.hasNext && (
                <Link
                  href={`/students?${new URLSearchParams({ ...resolvedSearchParams, page: String(pagination.page + 1) }).toString()}`}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-[var(--st-muted)] ring-1 ring-inset ring-[var(--st-border)] hover:bg-[var(--st-bg)]"
                >
                  Next
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
