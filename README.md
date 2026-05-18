<div align="center">

# ✝️ VBS App

**Free, self-hosted Vacation Bible School management for churches.**

<p>
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-configuration">Configuration</a> •
  <a href="#-contributing">Contributing</a>
</p>

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-336791?logo=postgresql)
![License](https://img.shields.io/badge/license-MIT-green)
![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker)

![Build](https://img.shields.io/github/actions/workflow/status/24Skater/vbs-app/ci.yml?label=CI)
![Contributors](https://img.shields.io/github/contributors/24Skater/vbs-app)
![Issues](https://img.shields.io/github/issues/24Skater/vbs-app)

</div>

---

> *"Whatever you do, work at it with all your heart, as working for the Lord."* — Colossians 3:23

Churches shouldn't have to wrestle with spreadsheets or pay high SaaS fees to run VBS. This is a full-featured, self-hosted alternative — free forever, open source, and built by someone who volunteers in ministry.

---

## Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [First-Time Setup](#-first-time-setup)
- [Deployment](#-deployment)
- [Configuration](#configuration)
- [Architecture](#-architecture)
- [User Roles](#-user-roles)
- [Integrations](#-integrations)
- [Security](#-security)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## ✨ Features

- 🎒 **Student Management** — Register students with categories, shirt sizes, and payment tracking
- ✅ **Quick Check-In** — Fast daily attendance with search and one-tap confirmation
- 📅 **Schedule Management** — Sessions, locations, and group assignments in one view
- 📊 **Dashboard Analytics** — Charts for category breakdown, age distribution, and payments
- 📋 **Reports & Exports** — Student lists, attendance records, and enrollment reports
- 🔐 **Role-Based Access** — Admin, Staff, and Viewer roles with granular permissions
- 🎨 **Branding Customization** — Church name, logo, colors, and contact info — all admin-configurable
- 🔗 **Google Forms Integration** — Parents self-register via a Google Form; students appear automatically
- 🧙 **First-Launch Wizard** — Guided setup so you're running in minutes, not hours
- 🔒 **Security-First** — Rate limiting, account lockout, RBAC, IDOR protection, webhook secrets
- 🏠 **Self-Hosted** — Your data stays on your server, always

---

## 🚀 Quick Start

**Requirements:** Node.js 20+, Docker

```bash
git clone https://github.com/24Skater/vbs-app
cd vbs-app
npm install
```

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Start the database, run migrations, and launch:

```bash
docker compose up -d          # PostgreSQL only
npx prisma migrate dev        # Apply schema
npm run dev                   # http://localhost:3000
```

Navigate to `http://localhost:3000` — the setup wizard appears automatically on first launch.

<details>
<summary>Seed with sample data (optional)</summary>

```bash
npx tsx prisma/seed.ts
```

This creates sample students, a VBS event, and an admin account you can use to explore the app.

</details>

<details>
<summary>Generate NEXTAUTH_SECRET</summary>

**macOS / Linux / Git Bash:**
```bash
openssl rand -base64 32
```

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

</details>

---

## 🧙 First-Time Setup

The setup wizard appears automatically on first launch — no manual steps required.

1. **Visit** `http://localhost:3000` → redirected to `/setup`
2. **Create the admin account** with your email and password
3. **Sign in** at `/auth/signin`
4. **Configure branding** at `/admin/settings` — church name, logo, colors
5. **Create your VBS event** at `/admin/events/new`
6. **Mark the event active** so check-in and attendance tracking are enabled
7. *(Optional)* **Enable Google Forms** at `/admin/integrations/google-forms` for self-service parent registration

---

## 🏗️ Deployment

### Docker Compose — recommended

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

The app is available on port `3000`. Put Nginx, Traefik, or Cloudflare Tunnel in front for HTTPS.

<details>
<summary>Traefik with auto-SSL (Let's Encrypt)</summary>

```bash
docker compose -f docker-compose.traefik.yml up -d --build
```

Traefik handles certificate provisioning automatically. Set `TRAEFIK_EMAIL` and your domain in `.env`.

</details>

<details>
<summary>Cloudflare Tunnel (zero open ports)</summary>

Cloudflare Tunnel is the recommended option for home servers — no router port-forwarding required:

1. Create a tunnel in the Cloudflare dashboard
2. Point the tunnel to `http://localhost:3000`
3. Free SSL is handled by Cloudflare

See [`Docs/PRODUCTION_ENV_EXAMPLE.md`](Docs/PRODUCTION_ENV_EXAMPLE.md) for the full configuration.

</details>

<details>
<summary>Manual / bare metal</summary>

```bash
npm ci
npx prisma migrate deploy
npm run build
npm start
```

Use `pm2` or a systemd unit to keep the process running.

</details>

---

## 🔧 Configuration

All configuration is done via environment variables. Copy `.env.example` to `.env` and fill in your values.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string — `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | Full URL where the app is hosted — `https://vbs.yourchurch.org` |
| `NEXTAUTH_SECRET` | Random 32-byte base64 string (see [Quick Start](#-quick-start)) |

### Email (required for magic-link auth)

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_FROM` | — | Sender address — `noreply@yourchurch.org` |
| `EMAIL_SERVER_HOST` | — | SMTP host (Gmail, SendGrid, SES, etc.) |
| `EMAIL_SERVER_PORT` | `587` | SMTP port |
| `EMAIL_SERVER_USER` | — | SMTP username |
| `EMAIL_SERVER_PASSWORD` | — | SMTP password |
| `EMAIL_SERVER_SECURE` | `false` | `true` for port 465 |

> **Development tip:** If email is not configured, magic links are printed to the console instead of being sent.

### OAuth (optional)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app client secret |
| `MICROSOFT_CLIENT_ID` | Azure AD / Microsoft app client ID |
| `MICROSOFT_CLIENT_SECRET` | Azure AD / Microsoft app client secret |

### Google Forms Integration (optional)

| Variable | Description |
|----------|-------------|
| `GOOGLE_FORMS_WEBHOOK_SECRET` | Shared secret validated on incoming form submissions |

---

## 🏛️ Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   Browser / Client  │────▶│   Next.js App Server  │────▶│   PostgreSQL DB  │
│  (React + Tailwind) │     │  (App Router + API)   │     │  (via Prisma)    │
└─────────────────────┘     └──────────────────────┘     └──────────────────┘
                                       │
                              ┌────────┴────────┐
                              │   NextAuth.js   │
                              │  Magic Link /   │
                              │  Google OAuth / │
                              │  Microsoft /    │
                              │  Credentials    │
                              └─────────────────┘
```

```
src/
├── app/
│   ├── admin/           # Admin panel (settings, events, users)
│   │   ├── integrations/  # Google Forms & future integrations
│   │   └── settings/      # Branding and app configuration
│   ├── api/             # API routes + Google Forms webhook
│   ├── attendance/      # Attendance records
│   ├── checkin/         # Quick check-in interface
│   ├── dashboard/       # Analytics and charts
│   ├── reports/         # Export reports
│   ├── schedule/        # Schedule management
│   ├── setup/           # First-launch wizard
│   └── students/        # Student management
├── components/          # Shared React components
└── lib/                 # Auth, Prisma client, utilities
prisma/
├── schema.prisma        # Database schema
└── migrations/          # Migration history
```

---

## 👤 User Roles

| Role | What they can do |
|------|-----------------|
| **ADMIN** | Full access — admin panel, settings, user management, all data |
| **STAFF** | Manage students, run check-in, view schedules and attendance |
| **VIEWER** | Read-only — view students, attendance, and schedules |

New users default to **STAFF**. Promote to ADMIN in `/admin/users`.

OAuth users (Google / Microsoft) default to **VIEWER** until promoted by an admin.

---

## 🔗 Integrations

### Google Forms

Parents register students via a Google Form — no account needed on their end.

1. Enable in **Admin → Integrations → Google Forms**
2. Create a Google Form with the required student fields
3. Paste the provided Apps Script into the form's script editor
4. Students appear in VBS App automatically on submission

See [`Docs/GOOGLE_FORMS_INTEGRATION.md`](Docs/GOOGLE_FORMS_INTEGRATION.md) for step-by-step setup.

### Authentication Providers

| Provider | Setup Required |
|----------|---------------|
| Email magic link | SMTP config only |
| Email + password | No additional setup |
| Google OAuth | Google Cloud Console app |
| Microsoft / Azure AD | Azure portal app registration |

---

## 🔐 Security

VBS App is built with a defense-in-depth approach:

- All inputs validated via **Zod schemas**
- **SQL injection** protection via Prisma parameterized queries
- **XSS** protection with output escaping
- **CSRF** protection via NextAuth and Next.js Server Actions
- **Rate limiting** on authentication and sensitive endpoints
- **Account lockout** after repeated failed login attempts
- **RBAC** enforced on every API route and server action
- **IDOR protection** — users can only access their authorized data
- **Webhook secret validation** for Google Forms integration
- **Image upload validation** with size and type limits

See [`Docs/SECURITY_COMPLETE.md`](Docs/SECURITY_COMPLETE.md) for the full security documentation.

#### Recommended Production Hardening

- Use **Cloudflare Tunnel** — no open ports required
- Enable **HTTPS only** via Traefik or Cloudflare
- Set a strong `NEXTAUTH_SECRET` (32+ bytes, randomly generated)
- Schedule regular **database backups**

---

## 🤝 Contributing

Contributions are welcome — especially from those in ministry who understand the real needs of VBS volunteers.

```bash
git clone https://github.com/24Skater/vbs-app
cd vbs-app
npm install
npm run dev       # Start dev server
npm test          # Run unit tests (Vitest)
npm run test:e2e  # Run E2E tests (Playwright)
```

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting a pull request.

For major changes, open an issue first to discuss the approach.

---

## 🗺️ Roadmap

| Status | Feature |
|--------|---------|
| ✅ | Google Forms self-service registration |
| ✅ | Google & Microsoft OAuth |
| ✅ | Dashboard analytics and charts |
| ✅ | Advanced reporting and exports |
| ✅ | Branding customization |
| ⬜ | Email notifications (reminders, confirmations) |
| ⬜ | Progressive Web App (PWA) / mobile app |
| ⬜ | Multi-language support |
| ⬜ | Planning Center integration |
| ⬜ | Online payment processing |

---

## 📄 License

[MIT](./LICENSE) — free to use, modify, and self-host.

> *"Let the little children come to me, and do not hinder them, for the kingdom of heaven belongs to such as these."* — Matthew 19:14

Built with prayer and purpose for the Church. 🙏
