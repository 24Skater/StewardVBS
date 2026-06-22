import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import ConfirmButton from "@/components/ConfirmButton";
import { ArrowLeft, AlertTriangle, ShieldAlert, Phone, Smartphone } from "lucide-react";

async function addEmergencyContact(studentId: number, formData: FormData) {
  "use server";
  await requireRole("STAFF");

  const name = formData.get("name")?.toString().trim();
  const relationship = formData.get("relationship")?.toString().trim() || null;
  const phone = formData.get("phone")?.toString().trim();
  const altPhone = formData.get("altPhone")?.toString().trim() || null;
  const priorityInput = formData.get("priority")?.toString();
  const priority = priorityInput ? Number(priorityInput) : 1;

  if (!name) {
    throw new ValidationError("Name is required");
  }
  if (!phone) {
    throw new ValidationError("Phone number is required");
  }

  await prisma.studentEmergencyContact.create({
    data: {
      studentId,
      name,
      relationship,
      phone,
      altPhone,
      priority,
    },
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/students/${studentId}/emergency`);
}

async function deleteEmergencyContact(contactId: number, studentId: number) {
  "use server";
  await requireRole("STAFF");

  await prisma.studentEmergencyContact.delete({
    where: { id: contactId },
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/students/${studentId}/emergency`);
}

type Props = { params: Promise<{ id: string }> };

export default async function EmergencyContactsPage({ params }: Props) {
  await requireRole("STAFF");

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) return notFound();

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      emergencyContacts: { orderBy: { priority: "asc" } },
    },
  });

  if (!student) return notFound();

  const addContactAction = addEmergencyContact.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--st-fg)]"><ShieldAlert className="h-4 w-4" /> Emergency Contacts</h1>
          <p className="mt-1 text-sm text-[var(--st-muted)]">
            Manage emergency contacts for {student.name}
          </p>
        </div>
        <Link
          href={`/students/${id}`}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--st-bg)] px-3 py-1.5 text-sm hover:bg-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Link>
      </div>

      {/* Warning if no contacts */}
      {student.emergencyContacts.length === 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-1 text-sm text-red-800 font-medium">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> No emergency contacts added! Please add at least one emergency contact for this student.
          </p>
        </div>
      )}

      {/* Current Contacts */}
      {student.emergencyContacts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4">Current Emergency Contacts</h2>
          <div className="space-y-4">
            {student.emergencyContacts.map((contact, index) => (
              <div key={contact.id} className="flex items-start justify-between p-4 bg-[var(--st-surface)] rounded-lg border border-red-100">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-lg">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--st-fg)]">{contact.name}</span>
                      {contact.relationship && (
                        <span className="text-sm text-[var(--st-muted)]">({contact.relationship})</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-[var(--st-muted)] space-y-1">
                      <div className="flex items-center gap-1 font-medium"><Phone className="h-4 w-4" /> {contact.phone}</div>
                      {contact.altPhone && (
                        <div className="flex items-center gap-1"><Smartphone className="h-4 w-4" /> {contact.altPhone} (alternate)</div>
                      )}
                    </div>
                  </div>
                </div>
                <ConfirmButton
                  action={deleteEmergencyContact.bind(null, contact.id, id)}
                  confirmMessage={`Remove ${contact.name} as an emergency contact?`}
                >
                  Remove
                </ConfirmButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Contact Form */}
      <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
        <h2 className="text-lg font-semibold text-[var(--st-fg)] mb-4">Add Emergency Contact</h2>
        <form action={addContactAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[var(--st-fg)]">
                Contact Name <span className="text-red-500">*</span>
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
                <option value="Aunt">Aunt</option>
                <option value="Uncle">Uncle</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Family Friend">Family Friend</option>
                <option value="Neighbor">Neighbor</option>
                <option value="Babysitter">Babysitter</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[var(--st-fg)]">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="altPhone" className="block text-sm font-medium text-[var(--st-fg)]">
                Alternate Phone
              </label>
              <input
                type="tel"
                id="altPhone"
                name="altPhone"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-[var(--st-fg)]">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                defaultValue="1"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              >
                <option value="1">1 - Primary (call first)</option>
                <option value="2">2 - Secondary</option>
                <option value="3">3 - Tertiary</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Add Emergency Contact
          </button>
        </form>
      </div>
    </div>
  );
}
