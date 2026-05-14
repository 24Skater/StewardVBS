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
import { isAccountLocked, getLockoutRemaining, recordLoginAttempt } from "@/lib/auth-lockout";

export const authOptions = {
  adapter: PrismaAdapter(prisma) as any,
  trustHost: true,
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

        // Enforce account lockout before attempting auth
        if (await isAccountLocked(email)) {
          const remaining = await getLockoutRemaining(email);
          await recordLoginAttempt(email, false);
          throw new Error(
            `Account locked due to too many failed attempts. Please try again in ${Math.ceil((remaining || 0) / 60)} minutes.`
          );
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          await recordLoginAttempt(email, false);
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          await recordLoginAttempt(email, false);
          throw new Error("Invalid email or password");
        }

        await recordLoginAttempt(email, true);
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
        secure: process.env.EMAIL_SERVER_SECURE === "true",
        requireTLS: process.env.EMAIL_SERVER_SECURE !== "true",
      } : {
        host: "localhost",
        port: 587,
        auth: { user: "dev", pass: "dev" },
        secure: false,
      }),
      from: process.env.EMAIL_FROM || "noreply@example.com",
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        // Dev-only: log link when no email server is configured
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

      // Magic link lockout check
      if (email?.verificationRequest && user.email) {
        if (await isAccountLocked(user.email)) {
          const remaining = await getLockoutRemaining(user.email);
          await recordLoginAttempt(user.email, false);
          throw new Error(
            `Account locked due to too many failed attempts. Please try again in ${Math.ceil((remaining || 0) / 60)} minutes.`
          );
        }
      }

      if (user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, emailVerified: true, role: true },
        });

        if (dbUser?.emailVerified) {
          await recordLoginAttempt(user.email, true);
        }

        // Atomically apply invited role for OAuth users
        if (account?.provider && account.provider !== "credentials") {
          await prisma.$transaction(async (tx) => {
            const invitation = await tx.invitation.findFirst({
              where: {
                email: user.email.toLowerCase(),
                usedAt: null,
                expiresAt: { gt: new Date() },
              },
            });
            if (invitation && dbUser) {
              await tx.user.update({
                where: { id: dbUser.id },
                data: { role: invitation.role },
              });
              await tx.invitation.update({
                where: { id: invitation.id },
                data: { usedAt: new Date() },
              });
            }
          });
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
    maxAge: SESSION_MAX_AGE_SEC,
    updateAge: SESSION_UPDATE_AGE_SEC,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
