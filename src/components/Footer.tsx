"use client";

import Link from "next/link";
import { useBranding, formatAddress } from "./BrandingProvider";

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

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

export default function Footer() {
  const branding = useBranding();
  const address = formatAddress(branding);
  const currentYear = new Date().getFullYear();

  const hasSocialLinks = branding.facebookUrl || branding.instagramUrl || branding.youtubeUrl;
  const hasContactInfo = branding.churchPhone || branding.churchEmail || branding.churchWebsite;
  const hasContent = branding.churchName || address || hasContactInfo || hasSocialLinks;

  // Minimal footer if no church info is configured
  if (!hasContent && !branding.footerText) {
    return (
      <footer className="border-t border-[var(--st-border)] bg-[var(--st-surface)] py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-[var(--st-muted)]">
            © {currentYear} {branding.siteName}. Powered by Steward VBS.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Logo and Church Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {branding.logoUrl && (
                <img
                  src={branding.logoUrl}
                  alt="Logo"
                  className="h-10 w-auto brightness-0 invert"
                />
              )}
              <div>
                <h3 className="font-semibold text-lg">
                  {branding.churchName || branding.siteName}
                </h3>
                {branding.tagline && (
                  <p className="text-sm text-gray-400">{branding.tagline}</p>
                )}
              </div>
            </div>
            {address && (
              <p className="text-sm text-gray-400 mb-2">{address}</p>
            )}
          </div>

          {/* Contact Info */}
          {hasContactInfo && (
            <div>
              <h4 className="font-semibold mb-4">Contact Us</h4>
              <div className="space-y-2 text-sm text-gray-400">
                {branding.churchPhone && (
                  <p>
                    <span className="text-gray-500">Phone:</span>{" "}
                    <a
                      href={`tel:${branding.churchPhone}`}
                      className="hover:text-white"
                    >
                      {branding.churchPhone}
                    </a>
                  </p>
                )}
                {branding.churchEmail && (
                  <p>
                    <span className="text-gray-500">Email:</span>{" "}
                    <a
                      href={`mailto:${branding.churchEmail}`}
                      className="hover:text-white"
                    >
                      {branding.churchEmail}
                    </a>
                  </p>
                )}
                {branding.churchWebsite && (
                  <p>
                    <a
                      href={branding.churchWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      <GlobeIcon className="h-4 w-4" />
                      Visit Our Website
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
                {branding.facebookUrl && (
                  <a
                    href={branding.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="h-6 w-6" />
                  </a>
                )}
                {branding.instagramUrl && (
                  <a
                    href={branding.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="h-6 w-6" />
                  </a>
                )}
                {branding.youtubeUrl && (
                  <a
                    href={branding.youtubeUrl}
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
              {branding.footerText || `© ${currentYear} ${branding.churchName || branding.siteName}. All rights reserved.`}
            </p>
            <p className="text-xs text-gray-500">
              Powered by <span className="text-gray-400">Steward VBS</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

