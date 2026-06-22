import Link from "next/link";

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification token has expired or has already been used.",
  Default: "An error occurred during authentication.",
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams.error || "Default";
  const message = errorMessages[error] || errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--st-bg)]">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-[var(--st-surface)] p-8 shadow-md">
        <div>
          <h1 className="text-center text-3xl font-bold text-red-600">
            Authentication Error
          </h1>
          <p className="mt-2 text-center text-sm text-[var(--st-muted)]">{message}</p>
        </div>
        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="block w-full rounded-md bg-[var(--st-primary)] px-4 py-2 text-center text-white hover:bg-[var(--st-primary)]/90"
          >
            Try again
          </Link>
          <Link
            href="/"
            className="block w-full rounded-md bg-[var(--st-bg)] px-4 py-2 text-center text-[var(--st-fg)] hover:bg-gray-200"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
