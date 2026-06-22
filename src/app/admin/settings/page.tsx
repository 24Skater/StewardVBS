import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSettings, updateSettings, formatChurchAddress } from "@/lib/settings";
import { requireRole } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import { auditLog } from "@/lib/audit-log";
import { MAX_SITE_NAME_LENGTH, MAX_URL_LENGTH } from "@/lib/constants";
import LogoUpload from "@/components/LogoUpload";
import { Button, Alert, AlertDescription } from "@steward-apps/ui";
import { Palette, Building2, FileEdit, Link2, Eye, Check } from "lucide-react";

async function updateSettingsAction(formData: FormData) {
  "use server";
  const session = await requireRole("ADMIN");

  // Basic Branding
  const siteName = formData.get("siteName")?.toString().trim();
  const logoUrl = formData.get("logoUrl")?.toString().trim() || null;

  // Church Information
  const churchName = formData.get("churchName")?.toString().trim() || null;
  const churchAddress = formData.get("churchAddress")?.toString().trim() || null;
  const churchCity = formData.get("churchCity")?.toString().trim() || null;
  const churchState = formData.get("churchState")?.toString().trim() || null;
  const churchZip = formData.get("churchZip")?.toString().trim() || null;
  const churchPhone = formData.get("churchPhone")?.toString().trim() || null;
  const churchEmail = formData.get("churchEmail")?.toString().trim() || null;
  const churchWebsite = formData.get("churchWebsite")?.toString().trim() || null;

  // Additional Branding
  const tagline = formData.get("tagline")?.toString().trim() || null;
  const welcomeMessage = formData.get("welcomeMessage")?.toString().trim() || null;
  const footerText = formData.get("footerText")?.toString().trim() || null;

  // Social Media
  const facebookUrl = formData.get("facebookUrl")?.toString().trim() || null;
  const instagramUrl = formData.get("instagramUrl")?.toString().trim() || null;
  const youtubeUrl = formData.get("youtubeUrl")?.toString().trim() || null;

  // Validate required fields
  if (!siteName || siteName.length === 0) {
    throw new ValidationError("Site name is required");
  }
  if (siteName.length > MAX_SITE_NAME_LENGTH) {
    throw new ValidationError(`Site name must be ${MAX_SITE_NAME_LENGTH} characters or less`);
  }

  // Validate URLs
  const urlFields = [
    { value: logoUrl, name: "Logo URL" },
    { value: churchWebsite, name: "Church website" },
    { value: facebookUrl, name: "Facebook URL" },
    { value: instagramUrl, name: "Instagram URL" },
    { value: youtubeUrl, name: "YouTube URL" },
  ];

  for (const field of urlFields) {
    if (field.value) {
      // Allow data URIs for logo
      if (field.name === "Logo URL" && field.value.startsWith("data:")) {
        continue;
      }
      try {
        new URL(field.value);
        if (field.value.length > MAX_URL_LENGTH) {
          throw new ValidationError(`${field.name} must be ${MAX_URL_LENGTH} characters or less`);
        }
      } catch {
        throw new ValidationError(`${field.name} must be a valid URL`);
      }
    }
  }

  await updateSettings({
    siteName,
    logoUrl,
    churchName,
    churchAddress,
    churchCity,
    churchState,
    churchZip,
    churchPhone,
    churchEmail,
    churchWebsite,
    tagline,
    welcomeMessage,
    footerText,
    facebookUrl,
    instagramUrl,
    youtubeUrl,
  });

  await auditLog({
    userId: session.user.id,
    action: "SETTINGS_UPDATED",
    resourceType: "Settings",
    details: { siteName, churchName },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/auth/signin");
  redirect("/admin/settings?success=true");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  await requireRole("ADMIN");
  const resolvedSearchParams = await searchParams;
  const settings = await getSettings();
  const formattedAddress = formatChurchAddress(settings);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Branding & Settings</h2>
        <p className="mt-1 text-sm text-gray-600">
          Customize your church&apos;s branding and information across the entire app.
        </p>
      </div>

      {resolvedSearchParams.success && (
        <Alert variant="success" showIcon>
          <AlertDescription>Settings saved successfully!</AlertDescription>
        </Alert>
      )}

      <form action={updateSettingsAction} className="space-y-8">
        {/* Basic Branding */}
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--st-fg)] mb-4"><Palette className="h-4 w-4" /> Basic Branding</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="siteName" className="block text-sm font-medium text-[var(--st-fg)]">
                Site Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="siteName"
                name="siteName"
                required
                defaultValue={settings.siteName}
                placeholder="Steward VBS"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
              <p className="mt-1 text-xs text-[var(--st-muted)]">
                Appears in navigation, page titles, and headers
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--st-fg)] mb-2">
                Logo
              </label>
              <LogoUpload
                name="logoUrl"
                currentImage={settings.logoUrl}
              />
              <p className="mt-2 text-xs text-[var(--st-muted)]">
                Upload your church logo (PNG, JPG, or SVG recommended)
              </p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="tagline" className="block text-sm font-medium text-[var(--st-fg)]">
                Tagline / Slogan
              </label>
              <input
                type="text"
                id="tagline"
                name="tagline"
                defaultValue={settings.tagline || ""}
                placeholder="Growing in Faith Together"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
              <p className="mt-1 text-xs text-[var(--st-muted)]">
                A short tagline shown below your logo
              </p>
            </div>
          </div>
        </div>

        {/* Church Information */}
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--st-fg)] mb-4"><Building2 className="h-4 w-4" /> Church Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="churchName" className="block text-sm font-medium text-[var(--st-fg)]">
                Church Name
              </label>
              <input
                type="text"
                id="churchName"
                name="churchName"
                defaultValue={settings.churchName || ""}
                placeholder="First Baptist Church"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="churchAddress" className="block text-sm font-medium text-[var(--st-fg)]">
                Street Address
              </label>
              <input
                type="text"
                id="churchAddress"
                name="churchAddress"
                defaultValue={settings.churchAddress || ""}
                placeholder="123 Main Street"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
            </div>

            <div>
              <label htmlFor="churchCity" className="block text-sm font-medium text-[var(--st-fg)]">
                City
              </label>
              <input
                type="text"
                id="churchCity"
                name="churchCity"
                defaultValue={settings.churchCity || ""}
                placeholder="Springfield"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="churchState" className="block text-sm font-medium text-[var(--st-fg)]">
                  State
                </label>
                <input
                  type="text"
                  id="churchState"
                  name="churchState"
                  defaultValue={settings.churchState || ""}
                  placeholder="TX"
                  className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
                />
              </div>
              <div>
                <label htmlFor="churchZip" className="block text-sm font-medium text-[var(--st-fg)]">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="churchZip"
                  name="churchZip"
                  defaultValue={settings.churchZip || ""}
                  placeholder="75001"
                  className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="churchPhone" className="block text-sm font-medium text-[var(--st-fg)]">
                Phone Number
              </label>
              <input
                type="tel"
                id="churchPhone"
                name="churchPhone"
                defaultValue={settings.churchPhone || ""}
                placeholder="(555) 123-4567"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
            </div>

            <div>
              <label htmlFor="churchEmail" className="block text-sm font-medium text-[var(--st-fg)]">
                Email Address
              </label>
              <input
                type="email"
                id="churchEmail"
                name="churchEmail"
                defaultValue={settings.churchEmail || ""}
                placeholder="info@church.org"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="churchWebsite" className="block text-sm font-medium text-[var(--st-fg)]">
                Website URL
              </label>
              <input
                type="url"
                id="churchWebsite"
                name="churchWebsite"
                defaultValue={settings.churchWebsite || ""}
                placeholder="https://www.yourchurch.org"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Content Customization */}
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--st-fg)] mb-4"><FileEdit className="h-4 w-4" /> Content Customization</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="welcomeMessage" className="block text-sm font-medium text-[var(--st-fg)]">
                Welcome Message
              </label>
              <textarea
                id="welcomeMessage"
                name="welcomeMessage"
                rows={3}
                defaultValue={settings.welcomeMessage || ""}
                placeholder="Welcome to our Vacation Bible School! We're excited to have you join us for a week of fun, learning, and faith."
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
              <p className="mt-1 text-xs text-[var(--st-muted)]">
                Displayed on the landing page and sign-in page
              </p>
            </div>

            <div>
              <label htmlFor="footerText" className="block text-sm font-medium text-[var(--st-fg)]">
                Footer Text
              </label>
              <textarea
                id="footerText"
                name="footerText"
                rows={2}
                defaultValue={settings.footerText || ""}
                placeholder="© 2025 First Baptist Church. All rights reserved."
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
              <p className="mt-1 text-xs text-[var(--st-muted)]">
                Custom text shown in the app footer
              </p>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--st-fg)] mb-4"><Link2 className="h-4 w-4" /> Social Media</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="facebookUrl" className="block text-sm font-medium text-[var(--st-fg)]">
                Facebook
              </label>
              <input
                type="url"
                id="facebookUrl"
                name="facebookUrl"
                defaultValue={settings.facebookUrl || ""}
                placeholder="https://facebook.com/yourchurch"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
            </div>

            <div>
              <label htmlFor="instagramUrl" className="block text-sm font-medium text-[var(--st-fg)]">
                Instagram
              </label>
              <input
                type="url"
                id="instagramUrl"
                name="instagramUrl"
                defaultValue={settings.instagramUrl || ""}
                placeholder="https://instagram.com/yourchurch"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
            </div>

            <div>
              <label htmlFor="youtubeUrl" className="block text-sm font-medium text-[var(--st-fg)]">
                YouTube
              </label>
              <input
                type="url"
                id="youtubeUrl"
                name="youtubeUrl"
                defaultValue={settings.youtubeUrl || ""}
                placeholder="https://youtube.com/@yourchurch"
                className="mt-1 block w-full rounded-md border border-[var(--st-border)] bg-[var(--st-bg)] px-3 py-2 text-[var(--st-fg)] shadow-sm focus:border-[var(--st-primary)] focus:outline-none focus:ring-[var(--st-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" variant="primary">
            Save All Settings
          </Button>
        </div>
      </form>

      {/* Live Preview */}
      <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--st-fg)] mb-4"><Eye className="h-4 w-4" /> Live Preview</h3>

        {/* Header Preview */}
        <div className="rounded-md border border-[var(--st-border)] p-4 bg-[var(--st-bg)] mb-4">
          <p className="text-xs text-[var(--st-muted)] mb-2 uppercase tracking-wide">Navigation Header</p>
          <div className="flex items-center gap-3 bg-[var(--st-surface)] p-3 rounded shadow-sm">
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" className="h-10 w-auto" />
            )}
            <div>
              <span className="text-lg font-semibold text-[var(--st-primary)]">
                {settings.siteName}
              </span>
              {settings.tagline && (
                <p className="text-xs text-[var(--st-muted)]">{settings.tagline}</p>
              )}
            </div>
          </div>
        </div>

        {/* Button Preview */}
        <div className="rounded-md border border-[var(--st-border)] p-4 bg-[var(--st-bg)] mb-4">
          <p className="text-xs text-[var(--st-muted)] mb-2 uppercase tracking-wide">Button Styles</p>
          <div className="flex gap-3">
            <Button type="button" variant="primary">Primary Button</Button>
            <Button type="button" variant="secondary">Secondary Button</Button>
            <Button type="button" variant="destructive">Destructive</Button>
          </div>
        </div>

        {/* Footer Preview */}
        <div className="rounded-md border border-[var(--st-border)] p-4 bg-[var(--st-bg)]">
          <p className="text-xs text-[var(--st-muted)] mb-2 uppercase tracking-wide">Footer Preview</p>
          <div className="bg-[var(--st-sidebar-bg)] text-white p-4 rounded text-sm">
            <div className="flex items-center gap-3 mb-2">
              {settings.logoUrl && (
                <img src={settings.logoUrl} alt="Logo" className="h-8 w-auto brightness-0 invert" />
              )}
              <span className="font-semibold">{settings.churchName || settings.siteName}</span>
            </div>
            {formattedAddress && (
              <p className="text-gray-300 text-xs">{formattedAddress}</p>
            )}
            {(settings.churchPhone || settings.churchEmail) && (
              <p className="text-gray-300 text-xs mt-1">
                {settings.churchPhone && <span>{settings.churchPhone}</span>}
                {settings.churchPhone && settings.churchEmail && <span> • </span>}
                {settings.churchEmail && <span>{settings.churchEmail}</span>}
              </p>
            )}
            {settings.footerText && (
              <p className="text-gray-400 text-xs mt-3 pt-3 border-t border-gray-700">
                {settings.footerText}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
