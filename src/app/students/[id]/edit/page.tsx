import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import { ValidationError } from "@/lib/errors";
import { auditLog } from "@/lib/audit-log";
import DeleteButton from "@/components/DeleteButton";
import ImageUpload from "@/components/ImageUpload";
import { ArrowLeft, Users, ShieldAlert, GraduationCap } from "lucide-react";
import { Button, Input } from "@steward-apps/ui";

async function updateStudent(id: number, formData: FormData) {
  "use server";
  const session = await requireRole("STAFF");

  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!student) {
    throw new ValidationError("Student not found");
  }

  const name = formData.get("name")?.toString().trim();
  const category = formData.get("category")?.toString().trim();
  const size = formData.get("size")?.toString().trim() || "YM";
  const grade = formData.get("grade")?.toString().trim() || null;
  const dateOfBirthInput = formData.get("dateOfBirth")?.toString();
  const dateOfBirth = dateOfBirthInput ? new Date(dateOfBirthInput) : null;

  const parentName = formData.get("parentName")?.toString().trim() || null;
  const parentPhone = formData.get("parentPhone")?.toString().trim() || null;
  const parentEmail = formData.get("parentEmail")?.toString().trim() || null;

  const emergencyContact = formData.get("emergencyContact")?.toString().trim() || null;
  const emergencyPhone = formData.get("emergencyPhone")?.toString().trim() || null;
  const emergencyRelationship = formData.get("emergencyRelationship")?.toString().trim() || null;

  const allergies = formData.get("allergies")?.toString().trim() || null;
  const medicalNotes = formData.get("medicalNotes")?.toString().trim() || null;
  const photoConsent = formData.get("photoConsent") === "on";
  const notes = formData.get("notes")?.toString().trim() || null;
  const profileImageUrl = formData.get("profileImageUrl")?.toString() || null;

  if (!name || name.length === 0) throw new ValidationError("Student name is required");
  if (name.length > 100) throw new ValidationError("Name must be 100 characters or less");
  if (!category) throw new ValidationError("Category is required");

  await prisma.student.update({
    where: { id },
    data: {
      name,
      category,
      size,
      grade,
      dateOfBirth,
      profileImageUrl,
      parentName,
      parentPhone,
      parentEmail,
      emergencyContact,
      emergencyPhone,
      emergencyRelationship,
      allergies,
      medicalNotes,
      photoConsent,
      notes,
    },
  });

  await auditLog({
    userId: session.user.id,
    action: "STUDENT_UPDATED",
    resourceType: "Student",
    resourceId: String(id),
    details: { name, category },
  });

  revalidatePath(`/students/${id}`);
  redirect(`/students/${id}`);
}

async function deleteStudent(id: number) {
  "use server";
  const session = await requireRole("ADMIN");

  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!student) {
    throw new ValidationError("Student not found");
  }

  await prisma.student.delete({ where: { id } });

  await auditLog({
    userId: session.user.id,
    action: "STUDENT_DELETED",
    resourceType: "Student",
    resourceId: String(id),
    details: { name: student.name },
  });

  revalidatePath("/students");
  redirect("/students");
}

type Props = { params: Promise<{ id: string }> };

export default async function EditStudentPage({ params }: Props) {
  await requireRole("STAFF");

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) return notFound();

  const student = await prisma.student.findUnique({
    where: { id },
  });

  if (!student) return notFound();

  const categories = await getCategories();
  const shirtSizes = ["YXS", "YS", "YM", "YL", "YXL", "AS", "AM", "AL", "AXL", "A2XL"];

  const updateAction = updateStudent.bind(null, id);
  const deleteAction = deleteStudent.bind(null, id);

  // Format date for input
  const dobValue = student.dateOfBirth
    ? new Date(student.dateOfBirth).toISOString().split("T")[0]
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">Edit Student</h1>
          <p className="mt-1 text-sm text-[var(--st-muted)]">
            {student.name}
          </p>
        </div>
        <Link href={`/students/${id}`}>
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back to profile
          </Button>
        </Link>
      </div>

      <form action={updateAction} className="space-y-8">
        {/* Basic Information */}
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--st-fg)] mb-4">Basic Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-[var(--st-fg)]">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                id="name"
                name="name"
                required
                defaultValue={student.name}
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-[var(--st-fg)]">
                Category/Group <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                required
                defaultValue={student.category}
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="size" className="block text-sm font-medium text-[var(--st-fg)]">
                Shirt Size
              </label>
              <select
                id="size"
                name="size"
                defaultValue={student.size}
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              >
                {shirtSizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-[var(--st-fg)]">
                Date of Birth
              </label>
              <Input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                defaultValue={dobValue}
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-[var(--st-fg)]">
                Grade/Year
              </label>
              <Input
                type="text"
                id="grade"
                name="grade"
                defaultValue={student.grade || ""}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Profile Photo */}
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--st-fg)] mb-4">Profile Photo</h2>
          <ImageUpload
            name="profileImageUrl"
            currentImage={student.profileImageUrl}
          />
        </div>

        {/* Quick Links for Related Management */}
        <div className="rounded-lg border border-[var(--st-primary)]/20 bg-[var(--st-primary)]/10 p-6">
          <h2 className="text-lg font-semibold text-[var(--st-fg)] mb-4">Manage Related Information</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href={`/students/${id}/parents`}
              className="flex items-center gap-2 rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-3 text-sm font-medium text-[var(--st-primary)] hover:bg-[var(--st-bg)]"
            >
              <Users className="h-4 w-4" /> Parents/Guardians
            </Link>
            <Link
              href={`/students/${id}/emergency`}
              className="flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <ShieldAlert className="h-4 w-4" /> Emergency Contacts
            </Link>
            <Link
              href={`/students/${id}/teachers`}
              className="flex items-center gap-2 rounded-md border border-green-200 bg-white px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-50"
            >
              <GraduationCap className="h-4 w-4" /> Assigned Teachers
            </Link>
          </div>
        </div>

        {/* Parent/Guardian Information */}
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--st-fg)] mb-4">Parent/Guardian Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="parentName" className="block text-sm font-medium text-[var(--st-fg)]">
                Parent/Guardian Name
              </label>
              <Input
                type="text"
                id="parentName"
                name="parentName"
                defaultValue={student.parentName || ""}
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="parentPhone" className="block text-sm font-medium text-[var(--st-fg)]">
                Phone Number
              </label>
              <Input
                type="tel"
                id="parentPhone"
                name="parentPhone"
                defaultValue={student.parentPhone || ""}
                className="mt-1"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="parentEmail" className="block text-sm font-medium text-[var(--st-fg)]">
                Email Address
              </label>
              <Input
                type="email"
                id="parentEmail"
                name="parentEmail"
                defaultValue={student.parentEmail || ""}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="rounded-lg border border-red-100 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4">Emergency Contact</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700">
                Contact Name
              </label>
              <Input
                type="text"
                id="emergencyContact"
                name="emergencyContact"
                defaultValue={student.emergencyContact || ""}
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <Input
                type="tel"
                id="emergencyPhone"
                name="emergencyPhone"
                defaultValue={student.emergencyPhone || ""}
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="emergencyRelationship" className="block text-sm font-medium text-gray-700">
                Relationship
              </label>
              <Input
                type="text"
                id="emergencyRelationship"
                name="emergencyRelationship"
                defaultValue={student.emergencyRelationship || ""}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-4">Medical Information</h2>
          <div className="grid gap-4">
            <div>
              <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">
                Allergies
              </label>
              <textarea
                id="allergies"
                name="allergies"
                rows={2}
                defaultValue={student.allergies || ""}
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
            </div>

            <div>
              <label htmlFor="medicalNotes" className="block text-sm font-medium text-gray-700">
                Medical Notes / Special Needs
              </label>
              <textarea
                id="medicalNotes"
                name="medicalNotes"
                rows={2}
                defaultValue={student.medicalNotes || ""}
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="photoConsent"
                name="photoConsent"
                defaultChecked={student.photoConsent}
                className="mt-1 h-4 w-4 rounded border-[var(--st-border)] text-[var(--st-primary)] focus:ring-[var(--st-primary)]"
              />
              <label htmlFor="photoConsent" className="text-sm text-[var(--st-fg)]">
                <span className="font-medium">Photo consent granted</span> — I give permission
                for this student to be photographed during VBS activities.
              </label>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--st-fg)] mb-4">Additional Notes</h2>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-[var(--st-fg)]">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={student.notes || ""}
              className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" variant="primary">Save Changes</Button>
          <Link href={`/students/${id}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
        <p className="text-sm text-red-700 mb-4">
          Deleting this student will also remove all their attendance and payment records. This cannot be undone.
        </p>
        <DeleteButton
          action={deleteAction}
          confirmMessage={`Are you sure you want to delete ${student.name}? This will remove all their records and cannot be undone.`}
        >
          Delete Student
        </DeleteButton>
      </div>
    </div>
  );
}
