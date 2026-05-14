import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { needsSetup } from "@/lib/setup";
import SignInForm from "@/components/SignInForm";
import { ArrowLeft } from "lucide-react";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  // Redirect to setup if no admin exists
  const setupRequired = await needsSetup();
  if (setupRequired) {
    redirect("/setup");
  }

  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const resolvedParams = await searchParams;
  const setupComplete = resolvedParams.setup === "complete";
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        {/* Setup Complete Message */}
        {setupComplete && (
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Setup complete! Sign in with your new admin account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Logo and Branding */}
        <div className="text-center">
          {settings.logoUrl && (
            <div className="flex justify-center mb-4">
              <img
                src={settings.logoUrl}
                alt={settings.siteName}
                className="h-16 w-auto"
              />
            </div>
          )}
          <h1
            className="text-3xl font-bold"
            style={{ color: settings.primaryColor }}
          >
            {settings.siteName}
          </h1>
          {settings.tagline && (
            <p className="mt-1 text-sm text-gray-500">{settings.tagline}</p>
          )}
          {settings.churchName && (
            <p className="mt-2 text-sm text-gray-600">{settings.churchName}</p>
          )}
          <p className="mt-4 text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        {/* Welcome Message */}
        {settings.welcomeMessage && (
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600">{settings.welcomeMessage}</p>
          </div>
        )}

        {/* Sign In Form */}
        <Suspense fallback={<div className="text-center text-gray-500">Loading...</div>}>
          <SignInForm primaryColor={settings.primaryColor} />
        </Suspense>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
