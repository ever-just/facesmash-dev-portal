# FaceSmash Developer Portal

Developer-facing dashboard for managing API keys, applications, billing, and usage analytics. This is where developers sign up, authenticate with face login, and get credentials to integrate FaceSmash into their apps.

**Live**: [https://developers.facesmash.app](https://developers.facesmash.app)

## Features

- **Face login with liveness detection** — Biometric sign-in and registration with active liveness verification
- **Application registry** — Create and manage applications that use FaceSmash face auth
- **API key management** — Generate, revoke, and manage API keys (powered by [Unkey](https://unkey.dev))
- **Usage analytics** — Track API calls, face matches, and registrations
- **Subscription billing** — Free, Pro ($29/mo), and Enterprise plans via Stripe
- **Team management** — Invite team members with Owner/Member RBAC
- **Activity logging** — Audit trail of all user and team events
- **Automated email notifications** — Welcome, password reset, team invites via Resend

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org/) 15.6 (canary) | SSR + PPR with Turbopack |
| **Database** | [PostgreSQL](https://www.postgresql.org/) 16 | Developer accounts, teams, apps |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) ^0.43 | Type-safe PostgreSQL access |
| **Payments** | [Stripe](https://stripe.com/) ^18.1 | Subscriptions, checkout, customer portal |
| **API Keys** | [Unkey](https://unkey.dev/) | API key creation, validation, rate limiting |
| **Auth** | [jose](https://github.com/panva/jose) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js) + Face login | JWT sessions, password hashing, biometric auth |
| **Face Recognition** | [@facesmash/sdk](https://www.npmjs.com/package/@facesmash/sdk) v3.0.0+ | Real-time face detection, liveness verification |
| **Email Service** | [Resend](https://resend.com/) | Transactional emails with managed deliverability |
| **UI** | [shadcn/ui](https://ui.shadcn.com/) + Radix UI | Accessible component library |
| **Styling** | TailwindCSS 4.1 | Utility-first CSS |
| **Charts** | [Recharts](https://recharts.org/) | Usage analytics visualizations |
| **Package Manager** | pnpm | Fast, disk-efficient |
| **Hosting** | Netlify | SSR with @netlify/plugin-nextjs |

## Architecture

```
Browser  -->  Next.js App (Netlify SSR)  -->  PostgreSQL (facesmash_devportal)
                  |                               |
          JWT + Face Login                   Drizzle ORM
          (@facesmash/sdk)                       |
                  |                          167.172.244.201:5432
                  |
                  +--> Stripe (billing)
                  +--> Unkey (API keys)
                  +--> Hono API (face matching via INTERNAL_API_KEY)
                  +--> Resend (transactional email)
```

## Face Login System

The dev portal integrates **@facesmash/sdk v3.0.0+** for biometric authentication:

- **Real-time face detection** — TinyFaceDetector at 5 FPS continuous tracking
- **Liveness verification** — Multi-signal detection (blink detection, head pose analysis, motion tracking)
- **Pre-computed descriptors** — SsdMobilenetv1 facial embedding generation for matching
- **Quality scoring** — Automatic validation of face capture quality and lighting conditions
- **Descriptor submission** — When liveness passes (confidence ≥ 0.5), descriptor is sent to API for face matching

### Flow

1. User navigates to `/sign-in` or `/sign-up`
2. "Sign in with FaceCard" button activates webcam
3. Real-time face detection begins with liveness ring animation (0-100% confidence)
4. When liveness ≥ threshold AND descriptor ready → automatic face match/registration
5. On success → JWT token issued, redirected to dashboard
6. On mismatch/not-registered → user prompted to use email/password instead

## Email Service

All transactional emails sent via [Resend](https://resend.com/):

| Email Type | Trigger | Sender | Use |
|---|---|---|---|
| Welcome | Sign-up completion | `face@everjust.co` | Confirm account creation |
| Password Changed | Password reset | `face@everjust.co` | Security notification |
| Team Invite | Team invitation sent | `face@everjust.co` | Invite team members |

**Reply-to**: `support@everjust.co`  
**Brand color**: `#10B981` (emerald)

**Important**: Domain DNS records (SPF, DKIM, DMARC) must be configured on `everjust.co` for email deliverability. See [Resend Domain Verification](https://resend.com/docs/dashboard/domains).

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL 16
- Stripe account (for billing)
- Unkey account (for API key management)
- Resend account with verified domain (for emails)

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

You can also create new accounts via `/sign-up` (face or email).

## Environment Variables

| Variable | Description | Required | Example |
|---|---|---|---|
| `POSTGRES_URL` | PostgreSQL connection string | Yes | `postgresql://devportal:pass@167.172.244.201:5432/facesmash_devportal` |
| `AUTH_SECRET` | JWT signing key (64-char hex) | Yes | `openssl rand -hex 32` |
| `BASE_URL` | Portal URL (for Stripe redirects) | Yes | `https://developers.facesmash.app` |
| `STRIPE_SECRET_KEY` | Stripe API key | Yes | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Yes | `whsec_...` |
| `UNKEY_ROOT_KEY` | Unkey root API key | Yes | `unkey_...` |
| `UNKEY_API_ID` | Unkey API identifier | Yes | `api_...` |
| `FACESMASH_API_URL` | Hono API URL | Yes | `https://api.facesmash.app` |
| `FACESMASH_INTERNAL_API_KEY` | Internal API key for face matching | Yes | `fsmash_internal_...` |
| `RESEND_API_KEY` | Resend email service API key | Yes | `re_...` |

## Database Schema

Database: `facesmash_devportal` on PostgreSQL 16 (167.172.244.201:5432)

| Table | Purpose |
|---|---|
| `users` | Developer accounts (email, password_hash, role, face_descriptor) |
| `teams` | Teams/orgs with Stripe billing (plan_name, subscription_status) |
| `team_members` | Team membership (user_id, team_id, role) |
| `developer_apps` | Registered applications (name, allowed_origins, webhook_url) |
| `activity_logs` | Activity audit trail (action, ip_address) |
| `invitations` | Team invitations (email, role, status) |

**Note**: `users.face_descriptor` stores the facial embedding for face login matching.

## Dashboard Pages

```
/                          — Landing page (public)
/sign-in, /sign-up         — Auth pages (face + email/password options)
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
- **Build command**: `pnpm build` (handles lockfile validation automatically)
- **Node version**: 20
- **pnpm version**: 10.32.1

### Environment Setup (Netlify)

Before deploying, configure these environment variables in Netlify Site Settings:

1. `POSTGRES_URL` — PostgreSQL connection string
2. `AUTH_SECRET` — JWT signing key (must be different from development)
3. `BASE_URL` — `https://developers.facesmash.app`
4. `STRIPE_SECRET_KEY` — Production Stripe secret key
5. `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
6. `UNKEY_ROOT_KEY` — Unkey API key
7. `UNKEY_API_ID` — Unkey API ID
8. `FACESMASH_API_URL` — `https://api.facesmash.app`
9. `FACESMASH_INTERNAL_API_KEY` — Internal API key (from Hono API backend)
10. `RESEND_API_KEY` — Resend production API key

### Stripe Webhook

Production webhook endpoint: `https://developers.facesmash.app/api/stripe/webhook`

Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### Testing Payments

Use Stripe test card: `4242 4242 4242 4242` (any future date, any CVC)

### Testing Emails

Resend development mode allows testing with test email addresses. In production, ensure DNS records are verified on `everjust.co` domain.

## SDK Integration

The portal uses **@facesmash/sdk** for face authentication. This SDK provides:

### Key Features
- **Real-time face tracking** — Continuous detection with position/size updates
- **Liveness state** — Blink detection, head pose estimation, motion tracking
- **Descriptor computation** — Facial embedding (512-dim vector) for matching
- **Quality metrics** — Face size validation, lighting analysis, confidence scoring

### Files
- `app/(login)/login.tsx` — Login page with face detection UI
- `lib/email/service.ts` — Email service (Resend integration)
- `app/(login)/actions.ts` — Server actions for sign-up/login/password reset

### Updating the SDK

When @facesmash/sdk releases new versions:
1. Update `package.json`: `"@facesmash/sdk": "^X.Y.Z"`
2. Run `pnpm install` to update lockfile
3. Test face login on dev: `pnpm dev` → navigate to `/sign-in`
4. Commit and deploy

## Related Repositories

- [`ever-just/facesmash.app`](https://github.com/ever-just/facesmash.app) — Main app (React frontend, face detection engine, liveness detection)
- [`ever-just/facesmash-api`](https://github.com/ever-just/facesmash-api) — Hono API backend (PostgreSQL + pgvector, descriptor matching)

## License

ISC
