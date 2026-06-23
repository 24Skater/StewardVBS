import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import { ValidationError } from "@/lib/errors";
import { auditLog } from "@/lib/audit-log";
import { ArrowLeft } from "lucide-react";
import { Button, Input } from "@steward-apps/ui";

async function createStudent(formData: FormData) {
  "use server";
  const session = await requireRole("STAFF");

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

  if (!name || name.length === 0) throw new ValidationError("Student name is required");
  if (name.length > 100) throw new ValidationError("Name must be 100 characters or less");
  if (!category) throw new ValidationError("Category is required");

  const student = await prisma.student.create({
    data: {
      name,
      category,
      size,
      grade,
      dateOfBirth,
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
    action: "STUDENT_CREATED",
    resourceType: "Student",
    resourceId: String(student.id),
    details: { name, category },
  });

  revalidatePath("/students");
  redirect(`/students/${student.id}`);
}

export default async function NewStudentPage() {
  await requireRole("STAFF");

  const categories = await getCategories();

  const shirtSizes = ["YXS", "YS", "YM", "YL", "YXL", "AS", "AM", "AL", "AXL", "A2XL"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--st-fg)]">Add New Student</h1>
          <p className="mt-1 text-sm text-[var(--st-muted)]">
            Add a student to your roster — assign them to events from their profile
          </p>
        </div>
        <Link href="/students">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back to list
          </Button>
        </Link>
      </div>

      <form action={createStudent} className="space-y-8">
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
                className="mt-1"
                placeholder="Enter student's full name"
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
                defaultValue="YM"
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
                className="mt-1"
                placeholder="e.g., 3rd Grade, Kindergarten"
              />
            </div>

            <div className="sm:col-span-2">
              <p className="text-sm text-[var(--st-muted)] bg-[var(--st-primary)]/10 p-3 rounded-md">
                Profile photo can be uploaded after the student is created.
              </p>
            </div>
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
                className="mt-1"
                placeholder="(555) 123-4567"
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
                className="mt-1"
                placeholder="(555) 123-4567"
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
                className="mt-1"
                placeholder="e.g., Aunt, Grandparent, Neighbor"
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
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
                placeholder="List any food, environmental, or medication allergies"
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
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
                placeholder="Any medical conditions, medications, or special needs we should be aware of"
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="photoConsent"
                name="photoConsent"
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
              className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              placeholder="Any other information about this student"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" variant="primary">Add Student</Button>
          <Link href="/students">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
