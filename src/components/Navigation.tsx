"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useBranding } from "./BrandingProvider";
import { Button, Badge } from "@steward-apps/ui";

export default function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const branding = useBranding();

  // Don't show navigation on auth pages or home page (home has its own nav)
  if (pathname?.startsWith("/auth") || pathname === "/") {
    return null;
  }

  const isActive = (path: string) => pathname === path;

  if (status === "loading") {
    return (
      <header className="border-b border-[var(--st-border)] bg-[var(--st-surface)] shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="h-8 w-auto"
              />
            )}
            <span className="text-lg font-semibold text-[var(--st-primary)]">
              {branding.siteName}
            </span>
          </div>
          <div className="text-sm text-[var(--st-muted)]">Loading...</div>
        </nav>
      </header>
    );
  }

  if (!session) {
    return (
      <header className="border-b border-[var(--st-border)] bg-[var(--st-surface)] shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            {branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="h-8 w-auto"
              />
            )}
            <span className="text-lg font-semibold text-[var(--st-primary)]">
              {branding.siteName}
            </span>
          </Link>
          <Button asChild variant="primary" size="sm">
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </nav>
      </header>
    );
  }

  const canAccessStaffRoutes =
    session.user?.role === "ADMIN" || session.user?.role === "STAFF";

  return (
    <header className="border-b border-[var(--st-border)] bg-[var(--st-surface)] shadow-sm">
      <nav className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-90"
            >
              {branding.logoUrl && (
                <img
                  src={branding.logoUrl}
                  alt="Logo"
                  className="h-10 w-auto"
                />
              )}
              <div>
                <span className="text-lg font-semibold text-[var(--st-primary)]">
                  {branding.siteName}
                </span>
                {branding.tagline && (
                  <p className="text-xs text-[var(--st-muted)] -mt-0.5">{branding.tagline}</p>
                )}
              </div>
            </Link>
            <div className="flex space-x-4">
              <Link
                href="/dashboard"
                className={`text-sm font-medium ${
                  isActive("/dashboard")
                    ? "text-[var(--st-primary)]"
                    : "text-[var(--st-muted)]"
                }`}
              >
                Dashboard
              </Link>
              {canAccessStaffRoutes && (
                <>
                  <Link
                    href="/students"
                    className={`text-sm font-medium ${
                      isActive("/students")
                        ? "text-[var(--st-primary)]"
                        : "text-[var(--st-muted)]"
                    }`}
                  >
                    Students
                  </Link>
                  <Link
                    href="/checkin"
                    className={`text-sm font-medium ${
                      isActive("/checkin")
                        ? "text-[var(--st-primary)]"
                        : "text-[var(--st-muted)]"
                    }`}
                  >
                    Check-In
                  </Link>
                  <Link
                    href="/attendance"
                    className={`text-sm font-medium ${
                      isActive("/attendance")
                        ? "text-[var(--st-primary)]"
                        : "text-[var(--st-muted)]"
                    }`}
                  >
                    Attendance
                  </Link>
                  <Link
                    href="/schedule"
                    className={`text-sm font-medium ${
                      isActive("/schedule")
                        ? "text-[var(--st-primary)]"
                        : "text-[var(--st-muted)]"
                    }`}
                  >
                    Schedule
                  </Link>
                  <Link
                    href="/reports"
                    className={`text-sm font-medium ${
                      pathname?.startsWith("/reports")
                        ? "text-[var(--st-primary)]"
                        : "text-[var(--st-muted)]"
                    }`}
                  >
                    Reports
                  </Link>
                </>
              )}
              {session.user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className={`text-sm font-medium ${
                    pathname?.startsWith("/admin")
                      ? "text-[var(--st-primary)]"
                      : "text-[var(--st-muted)]"
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-[var(--st-fg)]">
              {session.user?.email}
              {session.user?.role && (
                <Badge variant="secondary" className="ml-2">
                  {session.user.role}
                </Badge>
              )}
            </span>
            <Button
              onClick={() => signOut({ callbackUrl: "/" })}
              variant="outline"
              size="sm"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}
