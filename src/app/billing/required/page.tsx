import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Where a church lands when its subscription no longer covers VBS.
 *
 * Deliberately a real page rather than a bare 402. The church reading this is a
 * customer who wants to keep using the thing, and the useful response is to say
 * plainly what happened, promise their data is still there, and point at the
 * one place that fixes it.
 *
 * It is in the gate's bypass list: gating the page the gate redirects to would
 * loop.
 */
export default function BillingRequiredPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wider text-[var(--st-muted)]">
        Subscription
      </p>

      <h1 className="mt-3 text-3xl font-bold text-[var(--st-fg)]">
        This church&rsquo;s VBS subscription needs attention
      </h1>

      <p className="mt-4 text-[var(--st-muted)]">
        Steward VBS is read-only right now, which means your registrations,
        students and attendance are all still here &mdash; you can look at them
        and export them, but not change them.
      </p>

      <p className="mt-3 text-[var(--st-muted)]">
        Nothing has been deleted. An administrator can restore full access from
        the Steward console.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/reports"
          className="rounded-lg border border-[var(--st-border)] px-4 py-2 text-sm font-medium text-[var(--st-fg)] transition hover:bg-[var(--st-bg)]"
        >
          Export our data
        </Link>
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--st-muted)] transition hover:text-[var(--st-fg)]"
        >
          Back to the start
        </Link>
      </div>
    </main>
  );
}
