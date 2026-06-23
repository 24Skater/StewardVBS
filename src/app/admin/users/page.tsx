import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";
import { auditLog } from "@/lib/audit-log";
import RoleSelect from "@/components/RoleSelect";

async function updateUserRole(formData: FormData) {
  "use server";
  const session = await requireRole("ADMIN");

  const userId = formData.get("userId")?.toString();
  const role = formData.get("role")?.toString();

  if (!userId) {
    throw new ValidationError("User ID required");
  }
  
  // Validate role
  if (!role || !["ADMIN", "STAFF", "VIEWER"].includes(role)) {
    throw new ValidationError("Invalid role specified");
  }

  // Get current user role
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!targetUser) {
    throw new ValidationError("User not found");
  }

  // Prevent self-demotion (admin cannot remove their own admin role)
  if (userId === session.user.id && role !== "ADMIN") {
    throw new ValidationError("You cannot remove your own admin role");
  }

  // Prevent removing last admin
  if (targetUser.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new ValidationError("Cannot remove the last admin user");
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: role as UserRole, sessionVersion: { increment: 1 } },
  });

  // Audit log
  await auditLog({
    userId: session.user.id,
    action: "USER_ROLE_CHANGED",
    resourceType: "User",
    resourceId: userId,
    details: {
      targetUserEmail: targetUser.email,
      oldRole: targetUser.role,
      newRole: role,
    },
  });

  revalidatePath("/admin/users");
}

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-800",
    STAFF: "bg-blue-100 text-blue-800",
    VIEWER: "bg-[var(--st-bg)] text-gray-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--st-fg)]">Users</h2>
          <p className="mt-1 text-sm text-[var(--st-muted)]">
            Manage user accounts and roles.
          </p>
        </div>
        <Link
          href="/admin/users/invite"
          className="rounded-md bg-[var(--st-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--st-primary)]/90"
        >
          Invite User
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--st-border)] bg-[var(--st-surface)]">
        <table className="min-w-full divide-y divide-[var(--st-border)]">
          <thead className="bg-[var(--st-bg)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--st-muted)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--st-border)] bg-[var(--st-surface)]">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--st-fg)]">
                  {user.name || "—"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--st-muted)]">
                  {user.email}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <RoleSelect
                    userId={user.id}
                    userEmail={user.email}
                    currentRole={user.role}
                    roleColors={roleColors}
                    updateAction={updateUserRole}
                  />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {user.emailVerified ? (
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                      Pending
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--st-muted)]">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <span className="text-[var(--st-muted)]">—</span>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-[var(--st-muted)]">
                  No users yet. Users will be created automatically when they sign in.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Users are created automatically when they sign in. Use the 
          &quot;Invite User&quot; button to send an invitation with a pre-assigned role.
        </p>
      </div>
    </div>
  );
}
