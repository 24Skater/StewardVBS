"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import OAuthButtons from "./OAuthButtons";

type AuthMode = "magic-link" | "password";

export default function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("password"); // Default to password
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);

  // Show success message if user just registered
  const justRegistered = searchParams?.get("registered") === "true";

  // Check for account lockout
  useEffect(() => {
    if (email) {
      checkLockoutStatus(email);
    }
  }, [email]);

  async function checkLockoutStatus(email: string) {
    try {
      const response = await fetch(`/api/auth/check-lockout?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.locked) {
          const minutes = Math.ceil((data.remaining || 0) / 60);
          setLockoutMessage(
            `Account locked due to too many failed attempts. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`
          );
        } else {
          setLockoutMessage(null);
        }
      }
    } catch {
      // Ignore errors checking lockout status
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setLockoutMessage(null);

    // Read directly from the DOM so password-manager autofill is captured
    const form = e.currentTarget;
    const emailValue = (form.elements.namedItem("email") as HTMLInputElement)?.value || email;
    const passwordValue = (form.elements.namedItem("password") as HTMLInputElement)?.value || password;

    try {
      if (authMode === "magic-link") {
        const result = await signIn("email", {
          email: emailValue,
          redirect: false,
        });

        if (result?.error) {
          setError(result.error);
          // Re-check lockout status after failed attempt
          if (email) {
            await checkLockoutStatus(email);
          }
        } else {
          setSuccess(true);
        }
      } else {
        // Password authentication
        const result = await signIn("credentials", {
          email: emailValue,
          password: passwordValue,
          redirect: false,
        });

        console.log("Sign in result:", result);

        if (result?.error) {
          setError("Invalid email or password");
          if (emailValue) {
            await checkLockoutStatus(emailValue);
          }
        } else if (result?.ok) {
          // Successful login - redirect to dashboard
          router.push("/dashboard");
          router.refresh();
        } else {
          // Unexpected result
          setError("Sign in failed. Please try again.");
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (success && authMode === "magic-link") {
    return (
      <div className="rounded-md bg-green-50 p-4">
        <p className="text-sm text-green-800">
          Check your email for a sign-in link. The link will expire in 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {justRegistered && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">
            Account created successfully! You can now sign in.
          </p>
        </div>
      )}
      {lockoutMessage && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{lockoutMessage}</p>
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Auth Mode Toggle */}
      <div className="flex rounded-md border border-[var(--st-border)] p-1">
        <button
          type="button"
          onClick={() => setAuthMode("magic-link")}
          className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            authMode === "magic-link"
              ? "bg-[var(--st-primary)] text-white"
              : "bg-transparent text-[var(--st-muted)]"
          }`}
        >
          Magic Link
        </button>
        <button
          type="button"
          onClick={() => setAuthMode("password")}
          className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            authMode === "password"
              ? "bg-[var(--st-primary)] text-white"
              : "bg-transparent text-[var(--st-muted)]"
          }`}
        >
          Password
        </button>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--st-fg)]"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--st-primary)]"
          placeholder="you@example.com"
        />
      </div>

      {authMode === "password" && (
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[var(--st-fg)]"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-[var(--st-border)] px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--st-primary)]"
            placeholder="••••••••"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-[var(--st-primary)] px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading
          ? authMode === "magic-link"
            ? "Sending..."
            : "Signing in..."
          : authMode === "magic-link"
          ? "Send magic link"
          : "Sign in"}
      </button>

      {authMode === "password" && (
        <div className="flex flex-col gap-2 text-center text-sm text-[var(--st-muted)]">
          <p>
            <Link
              href="/auth/forgot-password"
              className="font-medium text-[var(--st-primary)] hover:opacity-80"
            >
              Forgot password?
            </Link>
          </p>
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-[var(--st-primary)] hover:opacity-80"
            >
              Create one
            </Link>
          </p>
        </div>
      )}

      <OAuthButtons />
    </form>
  );
}
