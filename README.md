# Digital Heroes

A subscription-driven golf performance, charity, and monthly-draw platform, built per the
Digital Heroes PRD (v1.0, March 2026) as a trainee selection assignment.

**Read [`ASSUMPTIONS.md`](./ASSUMPTIONS.md) first** — it documents every place the PRD was
ambiguous (the draw-number mechanic, prize pool timing, jackpot rollover) and the reasoning
behind each interpretation. That document and this codebase are meant to be read together.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript, TanStack Query, React Router, Tailwind |
| Backend | Node.js + Express + TypeScript |
| Database | Neon Postgres via Prisma |
| Auth | JWT access tokens (in-memory on the client) + rotating hashed refresh tokens (httpOnly cookie) |
| Payments | Stripe Checkout + subscriptions + webhooks |
| Scheduling | `node-cron` reminder only — draws are admin-triggered, not fully automated (see ASSUMPTIONS.md §5) |

## Project structure

```
digital-heroes/
├── ASSUMPTIONS.md          ← read this first
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── config/         env, prisma client, stripe client, uploads
│   │   ├── middleware/     auth, subscription gate, validation, error handler
│   │   ├── services/       drawEngine.ts + poolCalculator.ts are the core logic
│   │   ├── controllers/    thin HTTP layer over services
│   │   ├── routes/
│   │   ├── webhooks/       stripe.webhook.ts — sole source of truth for subscription state
│   │   └── jobs/           lightweight cron reminder
│   └── prisma/seed.ts      creates an admin + demo subscriber + charities
└── frontend/
    └── src/
        ├── api/client.ts   axios + silent token refresh
        ├── context/        AuthContext
        ├── pages/          subscriber + public pages
        └── pages/admin/    the 5 admin surfaces from PRD §11
```

## Local setup

### 1. Database (Neon)

Create a new Neon project at [neon.tech](https://neon.tech) and copy its connection string.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL (from Neon), JWT secrets (any long random string),
# and Stripe test-mode keys (see step 4).
npm install
npm run prisma:migrate     # creates all tables in your Neon DB
npm run seed                # creates an admin + demo subscriber + charities
npm run dev                  # http://localhost:4000
```

Seeded test credentials (from `prisma/seed.ts`):
- **Admin**: `admin@digitalheroes.com` / `Admin@12345`
- **Subscriber**: `subscriber@digitalheroes.com` / `Subscriber@12345`

**Stripe Test Card:**
Use `4242 4242 4242 4242` with any future date and CVC to test the subscription checkout flow.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173, proxies /api to localhost:4000
```

### 4. Stripe (test mode)

1. Create two recurring Prices in your Stripe test dashboard — one monthly, one yearly — and
   put their IDs in `STRIPE_PRICE_ID_MONTHLY` / `STRIPE_PRICE_ID_YEARLY`.
2. For local webhook testing, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:
   ```bash
   stripe listen --forward-to localhost:4000/api/webhooks/stripe
   ```
   Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.
3. **Never disable webhook signature verification**, even for local testing — that check is
   what stops anyone from POSTing a fake "payment succeeded" event to grant themselves a free
   subscription. Use the CLI above instead.

## Error handling approach

- Every service throws a typed `AppError` (`badRequest`, `unauthorized`, `notFound`, `conflict`,
  etc.) for expected failure cases — never a raw `Error` or a bare string.
- `asyncHandler` wraps every controller so rejected promises reach Express's error middleware
  instead of crashing the process or hanging the request.
- The global `errorHandler` normalizes `AppError`, Zod validation errors, and known Prisma
  errors (unique constraint violations, not-found) into a consistent JSON shape, and hides raw
  internal error messages from the client in production while still logging them server-side.
- `env.ts` validates all environment variables with Zod at boot — a missing or malformed env
  var fails immediately with a clear message, instead of surfacing as a confusing runtime error
  three requests into a demo.
- Stripe webhook handlers are written to be idempotent (safe to process the same event twice),
  since Stripe redelivers webhooks on any non-2xx response.

## Deployment (per PRD §15.1)

1. **Database**: use a brand-new Neon project (not a personal/existing one).
2. **Backend**: deploy to Railway/Render (recommended, since it needs a long-running process
   for `node-cron`) or as Vercel serverless functions if you drop the cron job. Set every
   variable from `backend/.env.example` in your host's environment settings, pointing
   `STRIPE_WEBHOOK_SECRET` at a webhook endpoint configured for your deployed URL, and
   `CLIENT_URL` at your deployed frontend URL.
3. **Frontend**: deploy to a new Vercel account/project. If the frontend and backend are on
   different domains, set `VITE_API_URL` (see `frontend/.env.example`) and update
   `src/api/client.ts`'s `baseURL` accordingly, and make sure the backend's CORS `origin`
   matches the deployed frontend URL exactly.
4. Run `npm run prisma:deploy` (not `migrate dev`) against the production database as part of
   your deploy step.

## Testing checklist coverage (PRD §16.1)

Everything in the checklist is implemented end-to-end (signup/login, subscription checkout +
webhook activation, 5-score rolling logic, simulate-then-publish draw flow, charity selection,
winner proof upload + admin review + payout marking, both dashboards). Given the scope of this
assignment, polish items — full responsive breakpoints beyond the core layouts, exhaustive
empty/loading states, and animation — are implemented for the primary flows but would benefit
from another pass before a genuine production launch.
