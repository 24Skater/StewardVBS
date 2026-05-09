/**
 * NextAuth configuration
 * Separated from route handler to comply with Next.js route export requirements
 */
import "server-only";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { logger } from "@/lib/logger";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole, SESSION_MAX_AGE_SEC, SESSION_UPDATE_AGE_SEC } from "@/lib/constants";

export const authOptions = {
  adapter: PrismaAdapter(prisma) as any,
  trustHost: true, // Trust the host for NextAuth v5
  providers: [
    // Google OAuth Provider (optional - only enabled if credentials are configured)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // Microsoft Entra ID Provider (optional - only enabled if credentials are configured)
    ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET
      ? [
          MicrosoftEntraID({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            issuer: process.env.AZURE_AD_TENANT_ID
              ? `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`
              : "https://login.microsoftonline.com/common/v2.0",
          }),
        ]
      : []),
    // Credentials Provider (Email + Password)
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const email = (credentials.email as string).toLowerCase();
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    // Email Provider (Magic Links)
    EmailProvider({
      server: process.env.EMAIL_SERVER || (process.env.EMAIL_SERVER_HOST ? {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
        secure: process.env.EMAIL_SERVER_SECURE === "true", // true for port 465 (SSL), false for port 587 (TLS)
        requireTLS: process.env.EMAIL_SERVER_SECURE !== "true", // Require TLS for port 587
      } : {
        // Dummy server config for development (won't be used)
        host: "localhost",
        port: 587,
        auth: {
          user: "dev",
          pass: "dev",
        },
        secure: false,
      }),
      from: process.env.EMAIL_FROM || "noreply@example.com",
      // In development, log the magic link instead of sending email (unless email is configured)
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        // If no email server is configured, log the link instead
        if (!process.env.EMAIL_SERVER_HOST) {
          logger.info({ identifier, url }, "DEVELOPMENT MODE - Magic Link");
          return;
        }
        // Production: send actual email
        try {
          const { host } = new URL(url);
          const serverConfig = provider.server;
          if (!serverConfig) {
            throw new Error("Email server configuration is missing");
          }

          logger.info({ identifier, from: provider.from }, "Attempting to send magic link email");

          const nodemailer = await import("nodemailer");
          const transport = nodemailer.createTransport(serverConfig);

          // Verify connection first
          await transport.verify();
          logger.info("SMTP connection verified");

          const result = await transport.sendMail({
            to: identifier,
            from: provider.from,
            subject: `Sign in to ${host}`,
            text: `Sign in to ${host}\n\n${url}\n\n`,
            html: `<p>Sign in to ${host}</p><p><a href="${url}">${url}</a></p>`,
          });

          logger.info({ identifier, messageId: result.messageId }, "Magic link email sent");
        } catch (error: any) {
          logger.error({ err: error.message, response: error.response }, "Failed to send magic link email");
          // Log the magic link as fallback so user can still sign in
          logger.info({ identifier, url }, "EMAIL SEND FAILED - Magic Link fallback");
          // Don't throw - the verification token is still created, so the link will work
          // This allows users to sign in even if email sending fails
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
  callbacks: {
    async signIn(params: any) {
      const { user, email, account } = params;
      const { isAccountLocked, getLockoutRemaining, recordLoginAttempt } = await import("@/lib/auth-lockout");
      const { checkInvitationForEmail, markInvitationUsedByEmail } = await import("@/lib/invitations");

      // Check if account is locked (for email verification requests)
      if (email?.verificationRequest && user.email) {
        if (await isAccountLocked(user.email)) {
          const remaining = await getLockoutRemaining(user.email);
          await recordLoginAttempt(user.email, false);
          throw new Error(
            `Account locked due to too many failed attempts. Please try again in ${Math.ceil((remaining || 0) / 60)} minutes.`
          );
        }
      }

      // Record successful login attempt
      if (user.email) {
        // Check if this is a successful verification (user is signing in)
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, emailVerified: true, role: true },
        });

        // If user exists and is verified, this is a successful login
        if (dbUser?.emailVerified) {
          await recordLoginAttempt(user.email, true);
        }

        // Check for pending invitation and assign role for new OAuth users
        // This handles the case where an admin invited a user with a specific role
        if (account?.provider && account.provider !== "credentials") {
          const invitedRole = await checkInvitationForEmail(user.email);
          if (invitedRole && dbUser) {
            // User has an invitation - update their role
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { role: invitedRole },
            });
            await markInvitationUsedByEmail(user.email);
            logger.info({ role: invitedRole, email: user.email }, "Applied invited role to user");
          }
        }

        // Require email verification for new users
        // Enforce email verification in production for credentials sign-in
        // OAuth providers (Google, Microsoft) verify email on their side
        if (dbUser && !dbUser.emailVerified && account?.provider === 'credentials') {
          if (process.env.NODE_ENV === 'production') {
            return false
          }
        }
      }

      return true;
    },
    async jwt({ token, user, account }: any) {
      // Initial sign in - add user data to token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        // Fetch sessionVersion to detect role/password changes
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { sessionVersion: true },
        });
        token.sessionVersion = dbUser?.sessionVersion ?? 1;
      }

      // For OAuth/email providers, fetch role from database
      if (account && account.provider !== "credentials" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, sessionVersion: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.sessionVersion = dbUser.sessionVersion;
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { sessionVersion: true, role: true },
        });
        if (!dbUser || dbUser.sessionVersion !== token.sessionVersion) {
          // Token is stale — reject the session
          return { ...session, user: null, expires: new Date(0).toISOString() };
        }
        session.user.id = token.id;
        session.user.role = dbUser.role;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt" as const,
    maxAge: SESSION_MAX_AGE_SEC, // 30 days
    updateAge: SESSION_UPDATE_AGE_SEC, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

