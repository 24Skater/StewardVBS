"use client";

import { createContext, useContext, ReactNode } from "react";

export type BrandingSettings = {
  siteName: string;
  logoUrl: string | null;
  churchName: string | null;
  churchAddress: string | null;
  churchCity: string | null;
  churchState: string | null;
  churchZip: string | null;
  churchPhone: string | null;
  churchEmail: string | null;
  churchWebsite: string | null;
  tagline: string | null;
  welcomeMessage: string | null;
  footerText: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  googleFormsEnabled: boolean;
  googleFormsUrl: string | null;
};

const defaultBranding: BrandingSettings = {
  siteName: "Steward VBS",
  logoUrl: null,
  churchName: null,
  churchAddress: null,
  churchCity: null,
  churchState: null,
  churchZip: null,
  churchPhone: null,
  churchEmail: null,
  churchWebsite: null,
  tagline: null,
  welcomeMessage: null,
  footerText: null,
  facebookUrl: null,
  instagramUrl: null,
  youtubeUrl: null,
  googleFormsEnabled: false,
  googleFormsUrl: null,
};

const BrandingContext = createContext<BrandingSettings>(defaultBranding);

export function useBranding() {
  return useContext(BrandingContext);
}

export function BrandingProvider({
  children,
  settings,
}: {
  children: ReactNode;
  settings: BrandingSettings;
}) {
  return (
    <BrandingContext.Provider value={settings}>
      {children}
    </BrandingContext.Provider>
  );
}

export function formatAddress(settings: BrandingSettings): string | null {
  const parts = [
    settings.churchAddress,
    settings.churchCity,
    settings.churchState && settings.churchZip
      ? `${settings.churchState} ${settings.churchZip}`
      : settings.churchState || settings.churchZip,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

