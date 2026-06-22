import { redirect } from "next/navigation";
import Link from "next/link";
import { getSettings, formatChurchAddress } from "@/lib/settings";
import { getActiveEvent } from "@/lib/event";
import { getSession } from "@/lib/auth";
import { needsSetup } from "@/lib/setup";

// Force dynamic rendering to avoid build-time Prisma calls
export const dynamic = 'force-dynamic';

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default async function Home() {
  // Redirect to setup if no admin exists
  const setupRequired = await needsSetup();
  if (setupRequired) {
    redirect("/setup");
  }

  const settings = await getSettings();
  const session = await getSession();
  const address = formatChurchAddress(settings);
  
  // Try to get active event info (optional - don't fail if no event)
  let eventInfo = null;
  try {
    const event = await getActiveEvent();
    eventInfo = {
      year: event.year,
      theme: event.theme,
      startDate: event.startDate,
      endDate: event.endDate,
    };
  } catch {
    // No active event - that's okay for landing page
  }

  const hasSocialLinks = settings.facebookUrl || settings.instagramUrl || settings.youtubeUrl;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--st-bg)] to-[var(--st-surface)] -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Navigation Bar */}
      <nav className="border-b border-[var(--st-border)] bg-[var(--st-surface)]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName}
                  className="h-10 w-auto"
                />
              )}
              <div>
                <span className="text-lg font-semibold text-[var(--st-primary)]">
                  {settings.siteName}
                </span>
                {settings.tagline && (
                  <p className="text-xs text-[var(--st-muted)] -mt-0.5">{settings.tagline}</p>
                )}
              </div>
            </div>
            {session?.user ? (
              <Link
                href="/dashboard"
                className="rounded-md px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-[var(--st-primary)] text-white"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="rounded-md px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-[var(--st-primary)] text-white"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[var(--st-surface)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            {/* Logo and Site Name */}
            <div className="flex justify-center items-center gap-4 mb-6">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName}
                  className="h-20 w-auto"
                />
              )}
            </div>
            
            {/* Church Name and Site Name */}
            {settings.churchName && (
              <p className="text-lg text-[var(--st-muted)] mb-2">{settings.churchName} presents</p>
            )}
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-[var(--st-primary)]">
              {settings.siteName}
            </h1>
            {settings.tagline && (
              <p className="mt-3 text-xl text-[var(--st-muted)]">{settings.tagline}</p>
            )}

            {/* Welcome Message */}
            {settings.welcomeMessage && (
              <p className="mt-6 max-w-2xl mx-auto text-lg text-[var(--st-muted)]">
                {settings.welcomeMessage}
              </p>
            )}

            {/* Event Info */}
            {eventInfo && (
              <div className="mt-8 inline-block rounded-lg bg-[var(--st-bg)] px-6 py-4 shadow-sm">
                <p className="text-xl font-semibold text-[var(--st-fg)]">
                  {eventInfo.year} {eventInfo.theme && `• ${eventInfo.theme}`}
                </p>
                {eventInfo.startDate && eventInfo.endDate && (
                  <p className="text-lg text-[var(--st-muted)] mt-1">
                    {new Date(eventInfo.startDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(eventInfo.endDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Main CTA */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              {/* Registration Button (if Google Forms enabled) */}
              {settings.googleFormsEnabled && settings.googleFormsUrl && (
                <a
                  href={settings.googleFormsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-[var(--st-primary)] text-white"
                >
                  Register Now →
                </a>
              )}

              {session?.user ? (
                <Link
                  href="/dashboard"
                  className={
                    settings.googleFormsEnabled && settings.googleFormsUrl
                      ? "rounded-md px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border-2 border-[var(--st-primary)] text-[var(--st-primary)] bg-transparent"
                      : "rounded-md px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-[var(--st-primary)] text-white"
                  }
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  href="/auth/signin"
                  className={
                    settings.googleFormsEnabled && settings.googleFormsUrl
                      ? "rounded-md px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border-2 border-[var(--st-primary)] text-[var(--st-primary)] bg-transparent"
                      : "rounded-md px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-[var(--st-primary)] text-white"
                  }
                >
                  Staff Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--st-fg)] sm:text-4xl">
              Everything you need to manage your VBS
            </h2>
            <p className="mt-4 text-lg text-[var(--st-muted)]">
              A comprehensive solution for tracking students, attendance, and schedules
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-[var(--st-fg)]">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--st-primary)]/10">
                    <svg
                      className="h-6 w-6 text-[var(--st-primary)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                  </div>
                  Student Management
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-[var(--st-muted)]">
                  <p className="flex-auto">
                    Easily register and manage students with categories, sizes, and payment tracking.
                  </p>
                </dd>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-[var(--st-fg)]">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--st-primary)]/10">
                    <svg
                      className="h-6 w-6 text-[var(--st-primary)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  Quick Check-In
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-[var(--st-muted)]">
                  <p className="flex-auto">
                    Fast and efficient check-in system for daily attendance tracking.
                  </p>
                </dd>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-[var(--st-fg)]">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--st-primary)]/10">
                    <svg
                      className="h-6 w-6 text-[var(--st-primary)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                      />
                    </svg>
                  </div>
                  Schedule Management
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-[var(--st-muted)]">
                  <p className="flex-auto">
                    Create and manage event schedules with sessions, locations, and groups.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Stats Section (if event exists) */}
      {eventInfo && session?.user && (
        <section className="bg-[var(--st-bg)] py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--st-fg)] sm:text-4xl">
                Get Started
              </h2>
              <p className="mt-4 text-lg text-[var(--st-muted)]">
                Access your dashboard to manage students, track attendance, and view reports
              </p>
              <div className="mt-10">
                <Link
                  href="/dashboard"
                  className="rounded-md px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 bg-[var(--st-primary)] text-white"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Logo and Church Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {settings.logoUrl && (
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="h-10 w-auto brightness-0 invert"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-lg">
                    {settings.churchName || settings.siteName}
                  </h3>
                  {settings.tagline && (
                    <p className="text-sm text-gray-400">{settings.tagline}</p>
                  )}
                </div>
              </div>
              {address && (
                <p className="text-sm text-gray-400">{address}</p>
              )}
            </div>

            {/* Contact Info */}
            {(settings.churchPhone || settings.churchEmail || settings.churchWebsite) && (
              <div>
                <h4 className="font-semibold mb-4">Contact Us</h4>
                <div className="space-y-2 text-sm text-gray-400">
                  {settings.churchPhone && (
                    <p>
                      <span className="text-gray-500">Phone:</span>{" "}
                      <a href={`tel:${settings.churchPhone}`} className="hover:text-white">
                        {settings.churchPhone}
                      </a>
                    </p>
                  )}
                  {settings.churchEmail && (
                    <p>
                      <span className="text-gray-500">Email:</span>{" "}
                      <a href={`mailto:${settings.churchEmail}`} className="hover:text-white">
                        {settings.churchEmail}
                      </a>
                    </p>
                  )}
                  {settings.churchWebsite && (
                    <p>
                      <a
                        href={settings.churchWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white"
                      >
                        Visit Our Website →
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Social Links */}
            {hasSocialLinks && (
              <div>
                <h4 className="font-semibold mb-4">Follow Us</h4>
                <div className="flex gap-4">
                  {settings.facebookUrl && (
                    <a
                      href={settings.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                      aria-label="Facebook"
                    >
                      <FacebookIcon className="h-6 w-6" />
                    </a>
                  )}
                  {settings.instagramUrl && (
                    <a
                      href={settings.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                      aria-label="Instagram"
                    >
                      <InstagramIcon className="h-6 w-6" />
                    </a>
                  )}
                  {settings.youtubeUrl && (
                    <a
                      href={settings.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                      aria-label="YouTube"
                    >
                      <YouTubeIcon className="h-6 w-6" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 border-t border-gray-800 pt-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-gray-400">
                {settings.footerText || `© ${new Date().getFullYear()} ${settings.churchName || settings.siteName}. All rights reserved.`}
              </p>
              <p className="text-xs text-gray-500">
                Powered by <span className="text-gray-400">Steward VBS</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
