<div align="center">

<img src="Docs/banner.svg" alt="VBS App" width="100%"/>

<br/>

[![Build](https://img.shields.io/github/actions/workflow/status/24Skater/vbs-app/ci.yml?style=flat-square&label=CI&color=2563eb)](https://github.com/24Skater/vbs-app/actions)
[![License](https://img.shields.io/badge/license-MIT-2563eb?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ed?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)

<br/>

[Quick Start](#quick-start) &nbsp;&middot;&nbsp;
[Screenshots](#screenshots) &nbsp;&middot;&nbsp;
[Features](#features) &nbsp;&middot;&nbsp;
[Deploy](#deployment) &nbsp;&middot;&nbsp;
[Contributing](#contributing)

</div>

---

> *"Whatever you do, work at it with all your heart, as working for the Lord."* — Colossians 3:23

Churches shouldn't wrestle with spreadsheets or pay SaaS fees to run VBS. VBS App is a full-featured, self-hosted management platform — free forever, built by someone who volunteers in ministry. Register students, run daily check-in, generate reports, and configure your church's branding without writing a line of code.

---

## Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Quick Start](#quick-start)
- [First-Time Setup](#first-time-setup)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [User Roles](#user-roles)
- [Integrations](#integrations)
- [Security](#security)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)

---

## Screenshots

<div align="center">

**Dashboard — live stats, enrollment tracking, and recent activity**

<img src="Docs/screenshots/dashboard.png" alt="Dashboard" width="900"/>

</div>

<br/>

<table align="center">
<tr>
<td align="center">
<strong>Student roster</strong><br/>
<img src="Docs/screenshots/students.png" alt="Students" width="440"/>
</td>
<td align="center">
<strong>Reports &amp; exports</strong><br/>
<img src="Docs/screenshots/reports.png" alt="Reports" width="440"/>
</td>
</tr>
<tr>
<td align="center">
<strong>Daily check-in</strong><br/>
<img src="Docs/screenshots/checkin.png" alt="Check-In" width="440"/>
</td>
<td align="center">
<strong>Branding &amp; settings</strong><br/>
<img src="Docs/screenshots/admin-settings.png" alt="Admin Settings" width="440"/>
</td>
</tr>
</table>

---

## Features

<table>
  <tr>
    <td align="center" valign="top" width="220">
      <img src="Docs/icons/students.svg" width="48" height="48" alt="Students"/>
      <br/><strong>Student Management</strong>
      <br/><sub>Register students with categories, shirt sizes, teacher assignments, and payment status. Full search and filter support.</sub>
    </td>
    <td align="center" valign="top" width="220">
      <img src="Docs/icons/checkin.svg" width="48" height="48" alt="Check-In"/>
      <br/><strong>Quick Check-In</strong>
      <br/><sub>Fast daily attendance tracking. Search by name, filter by category, and mark present with a single tap.</sub>
    </td>
    <td align="center" valign="top" width="220">
      <img src="Docs/icons/analytics.svg" width="48" height="48" alt="Analytics"/>
      <br/><strong>Dashboard Analytics</strong>
      <br/><sub>Visual charts for enrollment by category, age distribution, payment status, and teacher assignments.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" valign="top" width="220">
      <img src="Docs/icons/reports.svg" width="48" height="48" alt="Reports"/>
      <br/><strong>Reports &amp; Exports</strong>
      <br/><sub>Generate student rosters, attendance records, schedule exports, and enrollment summaries on demand.</sub>
    </td>
    <td align="center" valign="top" width="220">
      <img src="Docs/icons/roles.svg" width="48" height="48" alt="Roles"/>
      <br/><strong>Role-Based Access</strong>
      <br/><sub>Admin, Staff, and Viewer roles. Granular permissions enforced on every route and server action.</sub>
    </td>
    <td align="center" valign="top" width="220">
      <img src="Docs/icons/selfhosted.svg" width="48" height="48" alt="Self-Hosted"/>
      <br/><strong>Fully Self-Hosted</strong>
      <br/><sub>Your data stays on your server. No third-party storage, no subscription fees, no vendor lock-in.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" valign="top" width="220">
      <img src="Docs/icons/security.svg" width="48" height="48" alt="Security"/>
      <br/><strong>Security-First</strong>
      <br/><sub>Rate limiting, account lockout, RBAC, IDOR protection, Zod validation, and webhook secret enforcement.</sub>
    </td>
    <td align="center" valign="top" width="220">
      <img src="Docs/icons/forms.svg" width="48" height="48" alt="Google Forms"/>
      <br/><strong>Google Forms Integration</strong>
      <br/><sub>Parents self-register via a Google Form. Students sync to VBS App automatically via Apps Script webhook.</sub>
    </td>
    <td align="center" valign="top" width="220">
      <img src="Docs/icons/analytics.svg" width="48" height="48" alt="Branding"/>
      <br/><strong>Church Branding</strong>
      <br/><sub>Customize the site name, logo, primary colors, contact info, and welcome message from the admin panel.</sub>
    </td>
  </tr>
</table>

---

## Quick Start

**Requirements:** Node.js 20+, Docker

```bash
git clone https://github.com/24Skater/vbs-app
cd vbs-app
npm install
cp .env.example .env   # fill in DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
```

```bash
docker compose up -d        # start PostgreSQL
npx prisma migrate dev      # apply schema
npm run dev                 # http://localhost:3000
```

The setup wizard launches automatically on first visit.

<details>
<summary>Seed with sample data</summary>

```bash
npx tsx prisma/seed.ts
```

Creates 20+ sample students, a VBS event, and category assignments so you can explore the full UI immediately.

</details>

<details>
<summary>Generate NEXTAUTH_SECRET</summary>

**macOS / Linux / Git Bash**
```bash
openssl rand -base64 32
```

**Windows PowerShell**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

</details>

<details>
<summary>Run the test suite</summary>

```bash
npm test              # unit tests (Vitest)
npm run test:e2e      # end-to-end tests (Playwright)
npm run test:coverage # coverage report
```

</details>

---

## First-Time Setup

The setup wizard appears automatically on first launch — no manual database seeding or config file editing required.

| Step | Where | What to do |
|------|-------|------------|
| 1 | `/setup` | Create the first admin account |
| 2 | `/auth/signin` | Sign in with your new credentials |
| 3 | `/admin/settings` | Set church name, logo, and brand colors |
| 4 | `/admin/events/new` | Create your VBS event with dates and theme |
| 5 | `/admin/events` | Mark the event active to enable check-in |
| 6 | `/admin/integrations/google-forms` | *(Optional)* Enable parent self-registration |

---

## Deployment

### Docker Compose

The recommended path for any production deployment.

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

<details>
<summary>Traefik with automatic SSL (Let's Encrypt)</summary>

```bash
docker compose -f docker-compose.traefik.yml up -d --build
```

Set `TRAEFIK_EMAIL` and your domain in `.env`. Traefik handles certificate provisioning automatically — no manual cert management.

</details>

<details>
<summary>Cloudflare Tunnel — zero open ports (recommended for home servers)</summary>

1. Create a tunnel in the [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com)
2. Point the tunnel to `http://localhost:3000`
3. Free SSL and DDoS protection handled by Cloudflare automatically

No router port-forwarding required. See [`Docs/PRODUCTION_ENV_EXAMPLE.md`](Docs/PRODUCTION_ENV_EXAMPLE.md) for the full configuration reference.

</details>

<details>
<summary>Manual / bare metal</summary>

```bash
npm ci
npx prisma migrate deploy
npm run build
npm start
```

Use `pm2` or a `systemd` unit to keep the process running across reboots.

</details>

---

## Configuration

All configuration is via environment variables. Start from `.env.example`.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string — `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | Full public URL of the app — `https://vbs.yourchurch.org` |
| `NEXTAUTH_SECRET` | Randomly generated 32-byte base64 string |

### Email — required for magic-link sign-in

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_FROM` | — | Sender address — `noreply@yourchurch.org` |
| `EMAIL_SERVER_HOST` | — | SMTP host (Gmail, SendGrid, AWS SES, etc.) |
| `EMAIL_SERVER_PORT` | `587` | SMTP port |
| `EMAIL_SERVER_USER` | — | SMTP username |
| `EMAIL_SERVER_PASSWORD` | — | SMTP password |
| `EMAIL_SERVER_SECURE` | `false` | Set `true` for port 465 |

> **Development note:** When email is not configured, magic links are logged to the console rather than sent. No SMTP needed to develop locally.

### OAuth — optional

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app client secret |
| `MICROSOFT_CLIENT_ID` | Azure AD / Microsoft Entra app client ID |
| `MICROSOFT_CLIENT_SECRET` | Azure AD / Microsoft Entra app client secret |

### Google Forms — optional

| Variable | Description |
|----------|-------------|
| `GOOGLE_FORMS_WEBHOOK_SECRET` | Shared secret validated on each incoming webhook request |

---

## Architecture

```
Browser (React + Tailwind CSS)
        │
        ▼
Next.js 15 App Router ──── NextAuth.js v5
        │                       │
        │              ┌────────┴────────┐
        │              │ Magic Link      │
        │              │ Google OAuth    │
        │              │ Microsoft OAuth │
        │              │ Credentials     │
        │              └─────────────────┘
        │
        ├── Server Actions & API Routes
        │
        ▼
Prisma ORM ──── PostgreSQL 16
```

```
src/
├── app/
│   ├── admin/            Admin panel
│   │   ├── events/       Event management
│   │   ├── integrations/ Google Forms webhook config
│   │   ├── settings/     Branding & church info
│   │   └── users/        User & role management
│   ├── api/              REST endpoints + webhook receiver
│   ├── attendance/       Attendance record views
│   ├── checkin/          Daily check-in interface
│   ├── dashboard/        Analytics & stats
│   ├── reports/          Export center
│   ├── schedule/         Event schedule management
│   ├── setup/            First-launch wizard
│   └── students/         Student CRUD
├── components/           Shared UI components
└── lib/                  Auth config, Prisma client, utilities
prisma/
├── schema.prisma         Database schema
└── migrations/           Migration history
```

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access — admin panel, settings, events, user management, all data |
| **Staff** | Manage students, run check-in, view schedules and attendance |
| **Viewer** | Read-only — students, attendance records, schedules |

New registrations default to **Staff**. Promote users in `/admin/users`.

OAuth sign-ins (Google / Microsoft) default to **Viewer** until promoted by an Admin.

---

## Integrations

### Google Forms self-registration

Parents register children through a Google Form — no VBS App account needed on their end.

1. Enable in **Admin → Integrations → Google Forms**
2. Create a Google Form with the required student fields
3. Open **Script Editor** in Google Forms and paste the provided Apps Script
4. Students appear automatically in VBS App on each form submission

Full walkthrough: [`Docs/GOOGLE_FORMS_INTEGRATION.md`](Docs/GOOGLE_FORMS_INTEGRATION.md)

### Sign-in providers

| Provider | What to configure |
|----------|-------------------|
| Email magic link | SMTP variables only |
| Email + password | No additional setup |
| Google OAuth | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |
| Microsoft / Azure AD | `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET` |

---

## Security

VBS App is built with multiple layers of defense:

- **Input validation** — all inputs validated via Zod schemas before processing
- **SQL injection** — prevented by Prisma's parameterized queries
- **XSS** — output escaped; no raw `dangerouslySetInnerHTML`
- **CSRF** — protected via NextAuth and Next.js Server Actions
- **Rate limiting** — enforced on authentication and sensitive endpoints
- **Account lockout** — triggered after repeated failed login attempts
- **RBAC** — enforced on every API route and server action, not just the UI
- **IDOR protection** — users can only access resources they are authorized for
- **Webhook validation** — Google Forms webhook requires a shared secret
- **Upload validation** — image type and size limits enforced server-side

Full security documentation: [`Docs/SECURITY_COMPLETE.md`](Docs/SECURITY_COMPLETE.md)

**Recommended production hardening:**

```
1. Cloudflare Tunnel      — no open ports on your network
2. HTTPS everywhere       — via Traefik or Cloudflare (free)
3. Strong NEXTAUTH_SECRET — 32+ random bytes, rotated on breach
4. Regular DB backups     — before every update
```

---

## Contributing

Contributions are welcome — especially from those in ministry who understand the real-world needs of VBS volunteers and coordinators.

```bash
git clone https://github.com/24Skater/vbs-app
cd vbs-app && npm install
npm run dev          # dev server with hot reload
npm test             # unit tests
npm run test:e2e     # Playwright end-to-end
```

Before opening a pull request, please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). For significant changes, open an issue first so the approach can be discussed.

---

## Roadmap

| Status | Item |
|--------|------|
| Done | Student management with categories, sizes, payment tracking |
| Done | Daily check-in and attendance records |
| Done | Google Forms self-registration webhook |
| Done | Google & Microsoft OAuth sign-in |
| Done | Dashboard analytics and visual charts |
| Done | Reports and export center |
| Done | Church branding customization |
| Done | First-launch setup wizard |
| Planned | Email notifications — reminders, confirmations |
| Planned | Progressive Web App (PWA) and mobile-optimized check-in |
| Planned | Multi-language support |
| Planned | Planning Center integration |
| Planned | Online payment processing |

---

## License

[MIT](./LICENSE) — free to use, modify, and self-host.

> *"Let the little children come to me, and do not hinder them,*
> *for the kingdom of heaven belongs to such as these."*
> — Matthew 19:14

Built with prayer and purpose for the Church.
