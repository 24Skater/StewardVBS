"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useBranding } from "./BrandingProvider";

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
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="h-8 w-auto"
              />
            )}
            <span
              className="text-lg font-semibold"
              style={{ color: branding.primaryColor }}
            >
              {branding.siteName}
            </span>
          </div>
          <div className="text-sm text-gray-500">Loading...</div>
        </nav>
      </header>
    );
  }

  if (!session) {
    return (
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            {branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="h-8 w-auto"
              />
            )}
            <span
              className="text-lg font-semibold"
              style={{ color: branding.primaryColor }}
            >
              {branding.siteName}
            </span>
          </Link>
          <Link
            href="/auth/signin"
            className="rounded-md px-4 py-2 text-sm text-white hover:opacity-90"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Sign In
          </Link>
        </nav>
      </header>
    );
  }

  const canAccessStaffRoutes =
    session.user?.role === "ADMIN" || session.user?.role === "STAFF";

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
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
                <span
                  className="text-lg font-semibold"
                  style={{ color: branding.primaryColor }}
                >
                  {branding.siteName}
                </span>
                {branding.tagline && (
                  <p className="text-xs text-gray-500 -mt-0.5">{branding.tagline}</p>
                )}
              </div>
            </Link>
            <div className="flex space-x-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium"
                style={{
                  color: isActive("/dashboard") ? branding.primaryColor : "#4b5563",
                }}
              >
                Dashboard
              </Link>
              {canAccessStaffRoutes && (
                <>
                  <Link
                    href="/students"
                    className="text-sm font-medium"
                    style={{
                      color: isActive("/students") ? branding.primaryColor : "#4b5563",
                    }}
                  >
                    Students
                  </Link>
                  <Link
                    href="/checkin"
                    className="text-sm font-medium"
                    style={{
                      color: isActive("/checkin") ? branding.primaryColor : "#4b5563",
                    }}
                  >
                    Check-In
                  </Link>
                  <Link
                    href="/attendance"
                    className="text-sm font-medium"
                    style={{
                      color: isActive("/attendance") ? branding.primaryColor : "#4b5563",
                    }}
                  >
                    Attendance
                  </Link>
                  <Link
                    href="/schedule"
                    className="text-sm font-medium"
                    style={{
                      color: isActive("/schedule") ? branding.primaryColor : "#4b5563",
                    }}
                  >
                    Schedule
                  </Link>
                  <Link
                    href="/reports"
                    className="text-sm font-medium"
                    style={{
                      color: pathname?.startsWith("/reports") ? branding.primaryColor : "#4b5563",
                    }}
                  >
                    Reports
                  </Link>
                </>
              )}
              {session.user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-sm font-medium"
                  style={{
                    color: pathname?.startsWith("/admin") ? branding.primaryColor : "#4b5563",
                  }}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {session.user?.email}
              {session.user?.role && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  {session.user.role}
                </span>
              )}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
