# FaceSmash Developer Portal

Developer-facing dashboard for managing API keys, applications, billing, and usage analytics. This is where developers sign up and get credentials to integrate FaceSmash into their apps.

**Live**: [https://developers.facesmash.app](https://developers.facesmash.app)

## Features

- **Application registry** — Create and manage applications that use FaceSmash face auth
- **API key management** — Generate, revoke, and manage API keys (powered by [Unkey](https://unkey.dev))
- **Usage analytics** — Track API calls, face matches, and registrations
- **Subscription billing** — Free, Pro ($29/mo), and Enterprise plans via Stripe
- **Team management** — Invite team members with Owner/Member RBAC
- **Activity logging** — Audit trail of all user and team events
- **Email/password auth** — JWT sessions with httpOnly cookies (24h expiry)

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org/) 15.6 (canary) | SSR + PPR with Turbopack |
| **Database** | [PostgreSQL](https://www.postgresql.org/) 16 | Developer accounts, teams, apps |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) ^0.43 | Type-safe PostgreSQL access |
| **Payments** | [Stripe](https://stripe.com/) ^18.1 | Subscriptions, checkout, customer portal |
| **API Keys** | [Unkey](https://unkey.dev/) | API key creation, validation, rate limiting |
| **Auth** | [jose](https://github.com/panva/jose) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | JWT sessions, password hashing |
| **UI** | [shadcn/ui](https://ui.shadcn.com/) + Radix UI | Accessible component library |
| **Styling** | TailwindCSS 4.1 | Utility-first CSS |
| **Charts** | [Recharts](https://recharts.org/) | Usage analytics visualizations |
| **Package Manager** | pnpm | Fast, disk-efficient |
| **Hosting** | Netlify | SSR with @netlify/plugin-nextjs |

## Architecture

```
Browser  -->  Next.js App (Netlify SSR)  -->  PostgreSQL (facesmash_devportal)
                  |                               |
             JWT httpOnly                    Drizzle ORM
             cookie auth                         |
                  |                          167.172.244.201:5432
                  |
                  +--> Stripe (billing)
                  +--> Unkey (API keys)
                  +--> Hono API (face matching via INTERNAL_API_KEY)
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL 16
- Stripe account (for billing)
- Unkey account (for API key management)

### Setup

```bash
# Clone
git clone https://github.com/ever-just/facesmash-dev-portal.git
cd facesmash-dev-portal

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials (see Environment Variables below)

# Run database migrations
pnpm db:migrate

# Seed default admin user
pnpm db:seed

# Start development server
pnpm dev    # --> http://localhost:3000 (Turbopack)
```

### Default Seed User

- Email: `test@test.com`
- Password: `admin123`

You can also create new accounts via `/sign-up`.

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `POSTGRES_URL` | PostgreSQL connection string | `postgresql://devportal:pass@167.172.244.201:5432/facesmash_devportal` |
| `AUTH_SECRET` | JWT signing key (64-char hex) | `openssl rand -hex 32` |
| `BASE_URL` | Portal URL (for Stripe redirects) | `https://developers.facesmash.app` |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `UNKEY_ROOT_KEY` | Unkey root API key | `unkey_...` |
| `UNKEY_API_ID` | Unkey API identifier | `api_...` |
| `FACESMASH_API_URL` | Hono API URL | `https://api.facesmash.app` |
| `FACESMASH_INTERNAL_API_KEY` | Internal API key for face matching | `fsmash_internal_...` |

## Database Schema

Database: `facesmash_devportal` on PostgreSQL 16 (167.172.244.201:5432)

| Table | Purpose |
|---|---|
| `users` | Developer accounts (email, password_hash, role) |
| `teams` | Teams/orgs with Stripe billing (plan_name, subscription_status) |
| `team_members` | Team membership (user_id, team_id, role) |
| `developer_apps` | Registered applications (name, allowed_origins, webhook_url) |
| `activity_logs` | Activity audit trail (action, ip_address) |
| `invitations` | Team invitations (email, role, status) |

## Dashboard Pages

```
/                          — Landing page (public)
/sign-in, /sign-up         — Auth pages
/pricing                   — Stripe subscription plans
/dashboard/overview        — Welcome + quick actions
/dashboard/apps            — Application registry (CRUD)
/dashboard/keys            — API key management (via Unkey)
/dashboard/usage           — Usage analytics
/dashboard/billing         — Stripe subscription management
/dashboard/general         — Team settings
/dashboard/activity        — Activity log
/dashboard/security        — Security settings
```

## Scripts

```bash
pnpm dev           # Start dev server (Turbopack, port 3000)
pnpm build         # Production build
pnpm start         # Start production server
pnpm db:generate   # Generate Drizzle migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Seed default admin user
pnpm db:studio     # Open Drizzle Studio GUI
```

## Deployment

Deployed on Netlify with SSR via @netlify/plugin-nextjs.

- **Site**: `facesmash-developers`
- **Site ID**: `31682fc2-cc0f-4bf2-aad5-d9bcbc77eaa3`
- **Domain**: `developers.facesmash.app`
- **Admin**: https://app.netlify.com/projects/facesmash-developers

### Stripe Webhook

Production webhook endpoint: `https://developers.facesmash.app/api/stripe/webhook`

Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### Testing Payments

Use Stripe test card: `4242 4242 4242 4242` (any future date, any CVC)

## Related Repositories

- [`ever-just/facesmash.app`](https://github.com/ever-just/facesmash.app) — Main app (React frontend + docs)
- [`ever-just/facesmash-api`](https://github.com/ever-just/facesmash-api) — Hono API backend (PostgreSQL + pgvector)

## License

ISC
