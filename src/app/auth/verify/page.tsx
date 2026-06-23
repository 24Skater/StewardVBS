export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--st-bg)]">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-[var(--st-surface)] p-8 shadow-md">
        <div>
          <h1 className="text-center text-3xl font-bold text-[var(--st-fg)]">
            Check your email
          </h1>
          <p className="mt-2 text-center text-sm text-[var(--st-muted)]">
            A sign-in link has been sent to your email address.
          </p>
        </div>
        <div className="rounded-md bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            Click the link in the email to sign in. The link will expire in 24
            hours.
          </p>
        </div>
      </div>
    </div>
  );
}
