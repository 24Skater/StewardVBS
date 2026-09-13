/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  env: {
    NEXT_PUBLIC_HAS_GOOGLE_OAUTH: process.env.GOOGLE_CLIENT_ID ? "true" : "false",
    NEXT_PUBLIC_HAS_MICROSOFT_OAUTH: process.env.AZURE_AD_CLIENT_ID ? "true" : "false",
    // Derived rather than set by hand: the operator configures AUTH0_* once
    // and the sign-in page follows. Two variables that must agree is one
    // variable somebody forgets.
    NEXT_PUBLIC_HAS_SSO:
      process.env.AUTH0_ISSUER && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET
        ? "true"
        : "false",
    NEXT_PUBLIC_SSO_LABEL: process.env.AUTH0_BUTTON_LABEL || "Continue with Steward ID",
    // Defaults to on. Only an explicit "false" removes email and password.
    NEXT_PUBLIC_ALLOW_PASSWORD_LOGIN:
      String(process.env.ALLOW_LOCAL_PASSWORD_LOGIN).toLowerCase() === "false" ? "false" : "true",
  },
};

export default nextConfig;
