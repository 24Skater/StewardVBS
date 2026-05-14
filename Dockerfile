# VBS App Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and Prisma schema (needed for postinstall script)
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
# Install OpenSSL 3.0 (Prisma schema is configured for openssl-3.0.x)
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
# Create public directory if it doesn't exist (Next.js needs it)
RUN mkdir -p ./public
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install OpenSSL 3.0 for Prisma (schema is configured for openssl-3.0.x)
RUN apk add --no-cache openssl libc6-compat

# Install Prisma CLI globally for migrations (matching project version)
RUN npm install -g prisma@5.17.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Copy Prisma schema and migrations for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY scripts/start.sh /app/scripts/start.sh
RUN sed -i 's/\r$//' /app/scripts/start.sh && chmod +x /app/scripts/start.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["/app/scripts/start.sh"]
