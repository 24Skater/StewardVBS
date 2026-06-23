import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import { auditLog } from "@/lib/audit-log";
import { ArrowLeft } from "lucide-react";

async function createTeacher(formData: FormData) {
  "use server";
  const session = await requireRole("ADMIN");

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim() || null;
  const phone = formData.get("phone")?.toString().trim() || null;
  const bio = formData.get("bio")?.toString().trim() || null;

  if (!name) {
    throw new ValidationError("Name is required");
  }

  const teacher = await prisma.teacher.create({
    data: {
      name,
      email,
      phone,
      bio,
      isActive: true,
    },
  });

  await auditLog({
    userId: session.user.id,
    action: "SETTINGS_UPDATED",
    resourceType: "Teacher",
    resourceId: String(teacher.id),
    details: { created: name },
  });

  revalidatePath("/admin/teachers");
  redirect("/admin/teachers");
}

export default async function NewTeacherPage() {
  await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--st-fg)]">Add Teacher</h2>
          <p className="mt-1 text-sm text-[var(--st-muted)]">
            Add a new teacher or volunteer.
          </p>
        </div>
        <Link
          href="/admin/teachers"
          className="inline-flex items-center gap-1 rounded-md bg-[var(--st-bg)] px-3 py-1.5 text-sm hover:bg-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <form action={createTeacher} className="space-y-6 rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-[var(--st-fg)]">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--st-fg)]">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-[var(--st-fg)]">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
            />
          </div>

          <div className="sm:col-span-2">
            <p className="text-sm text-[var(--st-muted)] bg-blue-50 p-3 rounded-md">
              Profile photo can be uploaded after the teacher is created.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="bio" className="block text-sm font-medium text-[var(--st-fg)]">
              Bio / Notes
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              placeholder="Brief description, experience, or notes about this teacher"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="rounded-md bg-[var(--st-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--st-primary)]/90"
          >
            Add Teacher
          </button>
          <Link
            href="/admin/teachers"
            className="rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2 text-sm font-medium text-[var(--st-fg)] hover:bg-[var(--st-bg)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

