import { requireRole } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--st-fg)]">Admin Panel</h1>
        <p className="mt-1 text-sm text-[var(--st-muted)]">
          Manage events, users, categories, and settings
        </p>
      </div>

      <AdminNav />

      <div>{children}</div>
    </div>
  );
}
