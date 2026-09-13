/**
 * Application settings management
 */
import "server-only";
import crypto from 'crypto'
import { prisma } from "./prisma";
import { requireOrgId } from "@/lib/org-resolve";

export type AppSettings = {
  id: string;
  /** The church these settings belong to. Exactly one row per church. */
  orgId: string;
  
  // Basic Branding
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  
  // Church Information
  churchName: string | null;
  churchAddress: string | null;
  churchCity: string | null;
  churchState: string | null;
  churchZip: string | null;
  churchPhone: string | null;
  churchEmail: string | null;
  churchWebsite: string | null;
  
  // Additional Branding
  tagline: string | null;
  welcomeMessage: string | null;
  footerText: string | null;
  
  // Social Media
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  
  // Google Forms Integration
  googleFormsEnabled: boolean;
  googleFormsWebhookSecret: string | null;
  googleFormsUrl: string | null;
  googleFormsAutoApprove: boolean;
  
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get application settings (creates default if not exists)
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    // One row per church. The `id: "singleton"` this replaced was the single
    // most dangerous line in the schema once churches share a database: every
    // church would have read, and written, the same settings row.
    const orgId = await requireOrgId();
    return await prisma.appSettings.upsert({
      where: { orgId },
      update: {},
      create: { orgId },
    });
  } catch (error: any) {
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database server")) {
      throw new Error(
        "Database connection failed. Please ensure:\n" +
        "1. Docker Desktop is running\n" +
        "2. Start the database with: docker compose up -d\n" +
        "3. Run migrations with: npx prisma migrate dev"
      );
    }
    throw error;
  }
}

/**
 * Update application settings
 */
export async function updateSettings(
  data: Partial<Omit<AppSettings, "id" | "orgId" | "createdAt" | "updatedAt">>
): Promise<AppSettings> {
  const orgId = await requireOrgId();
  return await prisma.appSettings.upsert({
    where: { orgId },
    update: data,
    create: {
      orgId,
      siteName: data.siteName ?? "Steward VBS",
      primaryColor: data.primaryColor ?? "#E8B847",
      secondaryColor: data.secondaryColor ?? "#C49A2E",
      logoUrl: data.logoUrl ?? null,
      churchName: data.churchName ?? null,
      churchAddress: data.churchAddress ?? null,
      churchCity: data.churchCity ?? null,
      churchState: data.churchState ?? null,
      churchZip: data.churchZip ?? null,
      churchPhone: data.churchPhone ?? null,
      churchEmail: data.churchEmail ?? null,
      churchWebsite: data.churchWebsite ?? null,
      tagline: data.tagline ?? null,
      welcomeMessage: data.welcomeMessage ?? null,
      footerText: data.footerText ?? null,
      facebookUrl: data.facebookUrl ?? null,
      instagramUrl: data.instagramUrl ?? null,
      youtubeUrl: data.youtubeUrl ?? null,
      googleFormsEnabled: data.googleFormsEnabled ?? false,
      googleFormsWebhookSecret: data.googleFormsWebhookSecret ?? null,
      googleFormsUrl: data.googleFormsUrl ?? null,
      googleFormsAutoApprove: data.googleFormsAutoApprove ?? false,
    },
  });
}

/**
 * Helper to get formatted church address
 */
export function formatChurchAddress(settings: AppSettings): string | null {
  const parts = [
    settings.churchAddress,
    settings.churchCity,
    settings.churchState && settings.churchZip
      ? `${settings.churchState} ${settings.churchZip}`
      : settings.churchState || settings.churchZip,
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Generate a secure webhook secret
 */
export function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomBytes = crypto.randomBytes(32)
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars[randomBytes[i] % chars.length]
  }
  return result
}
