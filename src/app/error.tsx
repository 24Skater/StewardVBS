"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The root error boundary.
 *
 * VBS had none, so anything thrown during a render reached the user as a bare
 * Next.js crash page. That was survivable while the only errors were bugs; it
 * stopped being survivable once a lapsed subscription became a thing the app
 * throws about, because a church whose bill needs paying should not be shown a
 * stack trace.
 *
 * The message is deliberately vague about the cause. Next replaces an error's
 * message with an opaque digest in production, so anything specific said here
 * would be a guess — the honest thing is to say something went wrong, name the
 * two places worth looking, and log the digest for whoever has the server logs.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-bold text-[var(--st-fg)]">Something went wrong</h1>

      <p className="mt-4 text-[var(--st-muted)]">
        That page could not be loaded. Trying again often works; if it does not,
        the cause is usually either a sign-in that has expired or a subscription
        that needs attention.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-xs text-[var(--st-muted)]">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-[var(--st-fg)] px-4 py-2 text-sm font-medium text-[var(--st-bg)] transition hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/billing/required"
          className="rounded-lg border border-[var(--st-border)] px-4 py-2 text-sm font-medium text-[var(--st-fg)] transition hover:bg-[var(--st-bg)]"
        >
          Check the subscription
        </Link>
        <Link
          href="/auth/signin"
          className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--st-muted)] transition hover:text-[var(--st-fg)]"
        >
          Sign in again
        </Link>
      </div>
    </main>
  );
}
