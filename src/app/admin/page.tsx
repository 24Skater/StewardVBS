import { prisma } from "@/lib/prisma";
import { getActiveEvent } from "@/lib/event";
import { getSettings } from "@/lib/settings";
import Card from "@/components/card";
import Link from "next/link";

export default async function AdminDashboard() {
  const [settings, eventCount, userCount, categoryCount] = await Promise.all([
    getSettings(),
    prisma.event.count(),
    prisma.user.count(),
    prisma.studentCategory.count(),
  ]);

  let activeEvent = null;
  try {
    activeEvent = await getActiveEvent();
  } catch {
    // No active event
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/events">
          <Card title="Events" value={eventCount} hint="Manage VBS events" />
        </Link>
        <Link href="/admin/users">
          <Card title="Users" value={userCount} hint="Manage user accounts" />
        </Link>
        <Link href="/admin/categories">
          <Card title="Categories" value={categoryCount} hint="Student categories" />
        </Link>
        <Card
          title="Active Event"
          value={activeEvent ? `${activeEvent.year}` : "None"}
          hint={activeEvent?.theme || "Set an active event"}
        />
      </div>

      <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
        <h2 className="text-lg font-semibold text-[var(--st-fg)]">Quick Actions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/events/new"
            className="rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2 text-sm font-medium text-[var(--st-fg)] hover:bg-[var(--st-bg)]"
          >
            Create New Event
          </Link>
          <Link
            href="/admin/categories/new"
            className="rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2 text-sm font-medium text-[var(--st-fg)] hover:bg-[var(--st-bg)]"
          >
            Add Category
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-2 text-sm font-medium text-[var(--st-fg)] hover:bg-[var(--st-bg)]"
          >
            Update Settings
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
        <h2 className="text-lg font-semibold text-[var(--st-fg)]">Current Settings</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-[var(--st-muted)]">Site Name</dt>
            <dd className="mt-1 text-sm text-[var(--st-fg)]">{settings.siteName}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
