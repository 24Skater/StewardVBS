import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { needsSetup } from "@/lib/setup";
import { validateInvitation } from "@/lib/invitations";
import RegisterForm from "./RegisterForm";
import Link from "next/link";

interface RegisterPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  // Redirect to setup if no admin exists
  const setupRequired = await needsSetup();
  if (setupRequired) {
    redirect("/setup");
  }

  const session = await getSession();
  const params = await searchParams;

  if (session) {
    redirect("/dashboard");
  }

  const settings = await getSettings();

  // Check if there's a valid invitation token
  let invitation = null;
  if (params.token) {
    invitation = await validateInvitation(params.token);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--st-bg)]">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-[var(--st-surface)] p-8 shadow-lg border border-[var(--st-border)]">
        {/* Logo and Branding */}
        <div className="text-center">
          {settings.logoUrl && (
            <div className="flex justify-center mb-4">
              <img
                src={settings.logoUrl}
                alt={settings.siteName}
                className="h-12 w-auto"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold text-[var(--st-primary)]">
            {settings.siteName}
          </h1>
          <p className="mt-2 text-sm text-[var(--st-muted)]">
            {invitation
              ? "You've been invited to join"
              : "Create your account"}
          </p>
        </div>

        {invitation && (
          <div className="rounded-md bg-[var(--st-surface)] border border-[var(--st-border)] p-4">
            <p className="text-sm text-[var(--st-fg)]">
              You&apos;ve been invited by{" "}
              <strong>{invitation.inviter.name || invitation.inviter.email}</strong>{" "}
              to join as <strong>{invitation.role}</strong>.
            </p>
          </div>
        )}

        <RegisterForm
          inviteToken={params.token}
          invitedEmail={invitation?.email}
          invitedRole={invitation?.role}
        />

        <p className="text-center text-sm text-[var(--st-muted)]">
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="font-medium text-[var(--st-link)] hover:opacity-80"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
