/**
 * Application settings management
 */
import "server-only";
import crypto from 'crypto'
import { prisma } from "./prisma";

export type AppSettings = {
  id: string;
  
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
    let settings = await prisma.appSettings.findUnique({
      where: { id: "singleton" },
    });

    if (!settings) {
      settings = await prisma.appSettings.create({
        data: { id: "singleton" },
      });
    }

    return settings;
  } catch (error: any) {
    // Provide helpful error message for database connection issues
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
  data: Partial<Omit<AppSettings, "id" | "createdAt" | "updatedAt">>
): Promise<AppSettings> {
  return await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: {
      id: "singleton",
      siteName: data.siteName ?? "VBS App",
      primaryColor: data.primaryColor ?? "#2563eb",
      secondaryColor: data.secondaryColor ?? "#1e40af",
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
