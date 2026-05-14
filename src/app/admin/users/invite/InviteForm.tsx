"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export default function InviteForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    email: string;
    inviteUrl: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      role: formData.get("role") as string,
    };

    try {
      const response = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to send invitation");
        return;
      }

      setSuccess({
        email: result.invitation.email,
        inviteUrl: result.invitation.inviteUrl,
      });

      // Reset form
      e.currentTarget.reset();

      // Refresh the page to show updated invitations list
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4 space-y-2">
          <p className="text-sm text-green-800">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Invitation sent to <strong>{success.email}</strong></span>
          </p>
          <div className="mt-2">
            <p className="text-xs text-green-700 mb-1">Invitation Link:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={success.inviteUrl}
                className="flex-1 rounded-md border border-green-300 bg-white px-3 py-1 text-xs text-gray-700"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(success.inviteUrl);
                }}
                className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Share this link with the user or wait for the email to be delivered.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700"
            >
              Role
            </label>
            <select
              id="role"
              name="role"
              required
              defaultValue="STAFF"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="VIEWER">Viewer - Can only view data</option>
              <option value="STAFF">Staff - Can check in students</option>
              <option value="ADMIN">Admin - Full access</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Sending..." : "Send Invitation"}
        </button>
      </form>
    </div>
  );
}

