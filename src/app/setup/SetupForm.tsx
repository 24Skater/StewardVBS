"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@steward-apps/ui";

interface SetupFormProps {}

export default function SetupForm({}: SetupFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const confirmPassword = formData.get("confirmPassword")?.toString();

    // Client-side validation
    if (!name || !email || !password) {
      setError("All fields are required");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Setup failed");
      }

      // Redirect to sign-in page
      router.push("/auth/signin?setup=complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--st-fg)]">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="John Smith"
          className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--st-primary)]"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[var(--st-fg)]">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@yourchurch.org"
          className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--st-primary)]"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[var(--st-fg)]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--st-primary)]"
        />
        <p className="mt-1 text-xs text-[var(--st-muted)]">
          At least 8 characters
        </p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--st-fg)]">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--st-primary)]"
        />
      </div>

      <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Creating Account...
          </span>
        ) : (
          "Create Admin Account"
        )}
      </Button>
    </form>
  );
}

