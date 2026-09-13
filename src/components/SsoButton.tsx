"use client";

import { signIn } from "next-auth/react";

interface SsoButtonProps {
  callbackUrl?: string;
}

/**
 * Single sign-on, when this deployment has been given an identity provider.
 *
 * Rendered above the sign-in form rather than below it, because it is the
 * recommendation — but on the same screen as every other way in, not behind a
 * disclosure. The paths below it are the ones that still work when the identity
 * provider does not, which is exactly when somebody will be hunting for them.
 *
 * `NEXT_PUBLIC_HAS_SSO` is derived in `next.config.mjs` from `AUTH0_ISSUER`, so
 * the operator sets one variable rather than remembering to keep two in step.
 */
export default function SsoButton({ callbackUrl = "/dashboard" }: SsoButtonProps) {
  if (process.env.NEXT_PUBLIC_HAS_SSO !== "true") return null;

  const label = process.env.NEXT_PUBLIC_SSO_LABEL || "Continue with Steward ID";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => signIn("auth0", { callbackUrl })}
        className="w-full rounded-md bg-[var(--st-primary)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
      >
        {label}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--st-border)]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[var(--st-surface)] px-2 text-[var(--st-muted)]">
            Or sign in to this church directly
          </span>
        </div>
      </div>
    </div>
  );
}
