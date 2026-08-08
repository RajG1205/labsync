# LabSync

**AI-assisted research equipment discovery & booking platform**

Personal project — ongoing.

## The problem

Universities and national labs own expensive shared instruments (SEM, TEM,
XRD, HPLC, CNC mills, 3D printers, spectrometers...) that sit idle much of
the time because there's no shared way to see what's available, where it is,
or how to book time on it. Researchers end up emailing labs one at a time.

## What LabSync does today

A catalog of research instruments across partner institutions, searchable by
capability/location/resolution, with live availability, tiered pricing, an
approval-based booking workflow, and an AI assistant that turns a plain-language
experiment description into instrument recommendations grounded in the actual
catalog.

## Implemented features

- **Equipment catalog** — 18 seeded instruments (SEM, TEM, AFM, XRD, FTIR,
  HPLC, PCR, UTM, CNC, 3D printer, laser cutter, spectrometers, GC-MS, optical
  microscope, nanoindenter, DSC) across 8 Indian institutions, with
  specs/capabilities/resolution/status per instrument.
- **Hybrid search** — keyword matching across name, category, manufacturer,
  description and capabilities, layered with structured filters extracted
  from the query text: a location + radius ("within 150 km of Mumbai", using
  real haversine distance against institution coordinates) and a resolution
  ceiling ("1 nm resolution"). Results are sorted by distance when a location
  is given. This is **not** semantic/vector search — see [Roadmap](#roadmap).
- **AI experiment assistant** (`/recommend`) — a server-side OpenAI call
  (`gpt-4o-mini`, JSON-mode) turns a free-text experiment description into
  a structured list of recommended instrument categories, a rationale for
  each, and sample-preparation notes. Recommendations are then cross-matched
  against the real equipment catalog client-side — the AI never invents
  equipment, and its output never touches the database directly.
- **Live availability** — a per-instrument calendar showing busy/pending/
  maintenance slots, backed by a `SECURITY DEFINER` database function that
  exposes only time ranges (never who booked what).
- **Booking workflow** — pick a slot → describe the experiment → submit for
  approval → lab manager/admin approves or rejects → status and a generated
  booking code are tracked under "My bookings".
  - Overlap and maintenance-window conflicts are rejected by a database
    trigger, not just the UI.
  - Booking price is computed **server-side** in that same trigger, from the
    equipment's own rate columns and the booking's duration/tier — a client
    can't submit an arbitrary price.
  - Past-dated bookings are rejected server-side.
- **Tiered pricing** — student / research scholar / startup / industry rate
  cards per instrument, stored on the equipment row and enforced (not just
  displayed) server-side as described above. Rates are visible to signed-in
  users only; anonymous visitors get a rates-free public projection of the
  catalog.
- **Sample status tracking** — a `sample_status` column
  (submitted → received → in_progress → analysis → report_ready) that a
  database trigger advances automatically alongside booking-status changes
  (approval, rejection, cancellation, completion). There's no UI yet for a
  lab manager to move a sample through the middle stages manually — see
  Roadmap.
- **Authentication** — Supabase Auth (email/password), with a
  `handle_new_user` trigger that provisions a `profiles` row on signup.
  Protected routes redirect unauthenticated visitors to `/auth` and back.
- **Role-based access control** — `admin` / `lab_manager` / `member` roles in
  a `user_roles` table, checked via a `has_role()` SQL function used inside
  Row Level Security policies — not just hidden UI. The admin console
  (`/admin`) is gated by role both in the UI and at the database level.
- **Admin console** — pending-booking approvals, per-instrument utilisation
  and status, upcoming maintenance windows, and approved-revenue totals.
- **Error handling** — a root error boundary and 404 route, a server-side
  request middleware that catches unhandled errors (including ones the SSR
  framework would otherwise swallow into a raw 500) and renders a plain
  error page instead of a stack trace, and per-page loading skeletons /
  empty states.

## AI: implemented vs. roadmap

**Implemented:** one AI feature — the experiment-description assistant
described above. It calls OpenAI once per request, from the server, with a
structured JSON response format and a fixed list of valid instrument
categories in the system prompt; it recommends categories, not exact
instrument IDs, which are then matched against the real catalog before being
shown.

**Not implemented (see Roadmap):** semantic/vector search, availability
prediction, maintenance prediction, demand forecasting, an AI report
assistant, and equipment-health prediction. None of these exist in the
codebase yet.

## Architecture

```
React 19 + TypeScript (routes, components)
        ↓
TanStack Start (SSR + server functions + router)
        ↓
Supabase JS client
        ↓
  ┌─────────────┴─────────────┐
  │                           │
anon/publishable key      service-role key
(browser, RLS-enforced)   (server functions only,
                            bypasses RLS by design)
        ↓                           ↓
              PostgreSQL (Supabase)
              Row Level Security + SECURITY DEFINER functions

AI path:
Experiment description → createServerFn (server-only) → OpenAI Chat Completions
        → structured JSON → validated → cross-matched against equipment table
```

No FastAPI, SQLAlchemy, Redis, or Celery — none of those are used anywhere in
this codebase. Everything server-side runs as TanStack Start server functions
on top of Supabase; there's no separate backend service.

## Tech stack

- **Frontend:** React 19, TypeScript, TanStack Router/Start, TanStack Query,
  Tailwind CSS v4, shadcn/ui (Radix primitives), react-hook-form + zod
- **Backend:** TanStack Start server functions (no separate API server)
- **Database:** PostgreSQL via Supabase, with Row Level Security on every
  table and `SECURITY DEFINER` functions for the few cases that need
  controlled RLS bypass (role checks, public availability)
- **Auth:** Supabase Auth (email/password)
- **AI:** OpenAI Chat Completions API (`gpt-4o-mini`), called server-side only
- **Tooling:** Vite, ESLint + Prettier, Vitest

## Database

Four migrations, applied in order:

1. Core schema — `profiles`, `user_roles`, `institutions`, `equipment`,
   `maintenance_windows`, `bookings`, roles/enums, RLS policies, the
   `handle_new_user` and `validate_booking` triggers, the `get_busy_slots`
   function, and seed data (8 institutions, 18 instruments, 3 maintenance
   windows).
2. Locks down `SECURITY DEFINER` function grants to the minimum needed.
3. Removes anonymous direct-table access to `profiles` (which leaked emails),
   `equipment`, `institutions` and `maintenance_windows`, and briefly
   introduces public marketing views.
4. Drops those views once the public catalog was served through server
   functions instead (see below), and hardens `get_busy_slots` /
   `has_role` grants further.
5. *(added during this audit)* Server-side price computation on
   `bookings`, a `requester_tier` check constraint, past-date rejection,
   and the `sample_status` column + sync trigger.

**Why the public catalog doesn't hit the views from migration 3:** the
`getPublicCatalog` / `getPublicBusySlots` server functions
(`src/lib/catalog.functions.ts`) use the **service-role** client
(`src/integrations/supabase/client.server.ts`) and select only safe columns
directly from `equipment` / `institutions`, bypassing RLS by design rather
than relying on it. That's why migration 4 could safely drop the anon-facing
views and lock `get_busy_slots` down to `service_role` only — nothing in the
app was using the anon-RLS path for public data anymore.

## Security

**Fixed during this audit:**

- Booking price was accepted from the client and inserted as-is — a user
  could submit a manipulated price for any booking. Now computed server-side
  in the `validate_booking` trigger from the equipment's rate columns.
- The admin console's maintenance-schedule query selected a `reason` column
  that never existed (the schema has `note`), so it failed at runtime.
- The dashboard's booking query explicitly selected a `sample_status` column
  that never existed, so it failed at runtime. The column (and a trigger to
  keep it in sync with booking status) has been added.
- No `.gitignore` existed; `.env` was present in the project with real
  Supabase keys. Added a `.gitignore` and `.env.example`; **you must remove
  the real `.env` before pushing to a public repo** — this audit does not
  do that for you since it isn't a git repository yet (see below).
- `.env` was missing `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` —
  without them, the public catalog, public availability, and AI recommender
  endpoints throw at runtime. Both are now documented in `.env.example`.
- The production build was broken (`nitro({ preset: "cloudflare" })` with no
  Cloudflare/wrangler config present). Switched to the portable
  `node-server` preset; verified `npm run build` succeeds.

**Already correct, verified during this audit (not changed):**

- The OpenAI key is read via `process.env` inside a `createServerFn`
  handler only — never `VITE_`-prefixed, never in client code.
- The Supabase service-role key is used only in
  `src/integrations/supabase/client.server.ts`, never imported from route
  files or `*.functions.ts` (which ship to the client bundle).
- Every table has Row Level Security enabled, with policies checked against
  `auth.uid()` and a `has_role()` function rather than trusted from the
  client. Role-gated UI (e.g. the admin console) is backed by matching RLS
  policies on `bookings`/`equipment`/`institutions`, so a user can't bypass
  the UI by calling Supabase directly.
- CSRF protection is enabled for all server function calls
  (`createCsrfMiddleware`).
- Auth redirects validate that the `redirect` search param starts with `/`,
  preventing open-redirect via the sign-in flow.

**Never expose real secret values** — this document and `.env.example`
intentionally contain only placeholders.

## Roadmap / future features

Not implemented — listed here instead of claimed as done:

- Semantic/vector equipment search (the current hybrid search is regex-based
  structured extraction + keyword matching, not embeddings)
- AI availability/demand prediction and maintenance prediction
- AI report assistant (uploading raw instrument output for AI summarisation)
- Equipment-health prediction
- Payments (UPI/cards/institutional billing) — bookings currently track a
  computed price but there's no payment integration
- Manual sample-status transitions for lab managers (currently automatic,
  tied only to booking-status changes)
- Research collaboration / equipment-similarity search / paper suggestions

## Getting started

You need Node.js 20+ and npm.

```sh
git clone <this-repository-url>
cd LabSync
npm install
cp .env.example .env   # then fill in your own Supabase + OpenAI values
npm run dev
```

### Environment variables

See `.env.example` for the full list. In short:

| Variable | Where it's used | Safe to expose to the browser? |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Client Supabase client | Yes — protected by RLS |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Server-side auth middleware | Yes — same key, server copy |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin client | **No — never** |
| `OPENAI_API_KEY` | Server-only AI server function | **No — never** |

### Development

```sh
npm run dev       # start the dev server
npm run build     # production build (verified working — see Testing)
npm run lint      # ESLint + Prettier
npm run test      # Vitest unit tests
npx tsc --noEmit  # typecheck
```

Database migrations live in `supabase/migrations/` and apply in filename
order via the Supabase CLI (`supabase db push` / `supabase migration up`,
depending on your workflow).

## Testing

Unit tests (`src/lib/labsync.test.ts`, run with `npm run test`) cover the
pure logic that's cheapest to get wrong silently: per-tier rate lookup,
distance calculation, resolution parsing, and the hybrid-search query
parser. There is no integration/e2e test suite yet, and RLS policies and
the pricing/availability database triggers are currently verified by manual
inspection of the SQL rather than automated tests — that's the most
valuable next addition (see Roadmap).

## Project structure

```
src/
  components/          UI components (shadcn/ui primitives in components/ui/)
  hooks/                useAuth, useRole, useCatalog
  integrations/supabase/ client.ts (browser), client.server.ts (service role),
                          auth-middleware.ts, auth-attacher.ts, types.ts
  lib/                  ai.functions.ts, catalog.functions.ts (server functions),
                          labsync.ts (pricing/distance/search helpers), error handling
  routes/                file-based routes (TanStack Router)
supabase/migrations/     SQL migrations, applied in filename order
```

## Project status

Personal project, ongoing. The core discover → book → approve → track loop
works end-to-end against a real Postgres schema with enforced RLS and
server-side price/availability validation. AI is limited to the single
experiment-recommendation feature described above — everything else in the
roadmap is genuinely unbuilt.
