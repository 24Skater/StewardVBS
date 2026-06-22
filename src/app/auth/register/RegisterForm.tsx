"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@steward-apps/ui";
import { Input } from "@steward-apps/ui";

interface RegisterFormProps {
  inviteToken?: string;
  invitedEmail?: string;
  invitedRole?: string;
}

export default function RegisterForm({
  inviteToken,
  invitedEmail,
  invitedRole,
}: RegisterFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      inviteToken: inviteToken || undefined,
    };

    const confirmPassword = formData.get("confirmPassword") as string;

    // Client-side validation
    if (data.password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details) {
          // Handle validation errors
          const errors: Record<string, string> = {};
          result.details.forEach((err: { path: string[]; message: string }) => {
            if (err.path[0]) {
              errors[err.path[0]] = err.message;
            }
          });
          setFieldErrors(errors);
        } else {
          setError(result.error || "Registration failed");
        }
        return;
      }

      // Success - redirect to sign-in
      router.push("/auth/signin?registered=true");
    } catch {
      setError("An unexpected error occurred. Please try again.");
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
        <label
          htmlFor="name"
          className="block text-sm font-medium text-[var(--st-fg)]"
        >
          Name (optional)
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className="mt-1"
          placeholder="Your name"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--st-fg)]"
        >
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={invitedEmail || ""}
          readOnly={!!invitedEmail}
          className={`mt-1 ${invitedEmail ? "bg-[var(--st-surface)]" : ""} ${
            fieldErrors.email ? "border-red-300 focus:border-red-500" : ""
          }`}
          placeholder="you@example.com"
        />
        {fieldErrors.email && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
        )}
        {invitedEmail && (
          <p className="mt-1 text-xs text-[var(--st-muted)]">
            This email is set by your invitation
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[var(--st-fg)]"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={`mt-1 ${
            fieldErrors.password ? "border-red-300 focus:border-red-500" : ""
          }`}
          placeholder="••••••••"
        />
        {fieldErrors.password && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
        )}
        <p className="mt-1 text-xs text-[var(--st-muted)]">
          At least 8 characters with uppercase, lowercase, and a number
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-[var(--st-fg)]"
        >
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className={`mt-1 ${
            fieldErrors.confirmPassword
              ? "border-red-300 focus:border-red-500"
              : ""
          }`}
          placeholder="••••••••"
        />
        {fieldErrors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
