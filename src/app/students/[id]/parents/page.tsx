import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import ConfirmButton from "@/components/ConfirmButton";
import { Phone, Mail, ArrowLeft } from "lucide-react";

async function addParent(studentId: number, formData: FormData) {
  "use server";
  await requireRole("STAFF");

  const name = formData.get("name")?.toString().trim();
  const relationship = formData.get("relationship")?.toString().trim() || null;
  const phone = formData.get("phone")?.toString().trim() || null;
  const email = formData.get("email")?.toString().trim() || null;
  const isPrimary = formData.get("isPrimary") === "on";
  const canPickup = formData.get("canPickup") === "on";

  if (!name) {
    throw new ValidationError("Name is required");
  }

  // If marking as primary, unset other primaries
  if (isPrimary) {
    await prisma.studentParent.updateMany({
      where: { studentId },
      data: { isPrimary: false },
    });
  }

  await prisma.studentParent.create({
    data: {
      studentId,
      name,
      relationship,
      phone,
      email,
      isPrimary,
      canPickup,
    },
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/students/${studentId}/parents`);
}

async function deleteParent(parentId: number, studentId: number) {
  "use server";
  await requireRole("STAFF");

  await prisma.studentParent.delete({
    where: { id: parentId },
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/students/${studentId}/parents`);
}

type Props = { params: Promise<{ id: string }> };

export default async function ParentsPage({ params }: Props) {
  await requireRole("STAFF");

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) return notFound();

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      parents: { orderBy: { isPrimary: "desc" } },
    },
  });

  if (!student) return notFound();

  const addParentAction = addParent.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">Parents/Guardians</h1>
          <p className="mt-1 text-sm text-[var(--st-muted)]">
            Manage parents and guardians for {student.name}
          </p>
        </div>
        <Link
          href={`/students/${id}`}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--st-bg)] px-3 py-1.5 text-sm hover:bg-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Link>
      </div>

      {/* Current Parents */}
      {student.parents.length > 0 && (
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--st-fg)] mb-4">Current Parents/Guardians</h2>
          <div className="space-y-4">
            {student.parents.map((parent) => (
              <div key={parent.id} className="flex items-start justify-between p-4 bg-[var(--st-bg)] rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--st-fg)]">{parent.name}</span>
                    {parent.isPrimary && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                    {parent.canPickup && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        Can Pickup
                      </span>
                    )}
                  </div>
                  {parent.relationship && (
                    <div className="text-sm text-[var(--st-muted)]">{parent.relationship}</div>
                  )}
                  <div className="mt-1 text-sm text-[var(--st-muted)] space-y-1">
                    {parent.phone && <div className="flex items-center gap-1"><Phone className="h-4 w-4" /> {parent.phone}</div>}
                    {parent.email && <div className="flex items-center gap-1"><Mail className="h-4 w-4" /> {parent.email}</div>}
                  </div>
                </div>
                <ConfirmButton
                  action={deleteParent.bind(null, parent.id, id)}
                  confirmMessage={`Remove ${parent.name} as a parent/guardian?`}
                >
                  Remove
                </ConfirmButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Parent Form */}
      <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
        <h2 className="text-lg font-semibold text-[var(--st-fg)] mb-4">Add Parent/Guardian</h2>
        <form action={addParentAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
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
              <label htmlFor="relationship" className="block text-sm font-medium text-[var(--st-fg)]">
                Relationship
              </label>
              <select
                id="relationship"
                name="relationship"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              >
                <option value="">Select...</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Stepmother">Stepmother</option>
                <option value="Stepfather">Stepfather</option>
                <option value="Guardian">Guardian</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[var(--st-fg)]">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
                placeholder="(555) 123-4567"
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
          </div>

          <div className="flex gap-6">
            <div className="flex items-center">
              <input
                id="isPrimary"
                name="isPrimary"
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--st-border)] text-[var(--st-primary)] focus:ring-[var(--st-primary)]"
              />
              <label htmlFor="isPrimary" className="ml-2 block text-sm text-[var(--st-fg)]">
                Primary contact
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="canPickup"
                name="canPickup"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-[var(--st-border)] text-[var(--st-primary)] focus:ring-[var(--st-primary)]"
              />
              <label htmlFor="canPickup" className="ml-2 block text-sm text-[var(--st-fg)]">
                Authorized for pickup
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-md bg-[var(--st-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--st-primary)]/90"
          >
            Add Parent/Guardian
          </button>
        </form>
      </div>
    </div>
  );
}
