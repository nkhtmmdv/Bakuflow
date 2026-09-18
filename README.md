# BakuFlow

BakuFlow is an informational public-transport platform for Baku: it helps
people pick a less crowded route by combining a simple journey planner with
crowdsourced, real-time crowding reports at metro stations, bus stops and
transport hubs.

It is **not** a ticketing app, a taxi app, or a transit operator's own
system — it only helps people decide *which* existing route to take.

This is an MVP built and maintained by a two-person team on a small budget,
so the architecture deliberately avoids anything that isn't needed yet:
no microservices, no Kubernetes, no Redis, no paid APIs, no AI in
production, no custom native apps. Everything runs as a single Next.js app
backed by Supabase (Postgres + Auth + Realtime).

## Contents

- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database migrations](#database-migrations)
- [Seeding data](#seeding-data)
- [Creating an admin user](#creating-an-admin-user)
- [Adding transport nodes and routes](#adding-transport-nodes-and-routes)
- [How the crowd algorithm works](#how-the-crowd-algorithm-works)
- [How route scoring works](#how-route-scoring-works)
- [Authentication approach](#authentication-approach)
- [Privacy approach](#privacy-approach)
- [Testing](#testing)
- [Deployment](#deployment)

## Architecture

```
app/                     Next.js App Router pages (mobile-first, i18n)
  admin/                 Role-gated admin panel (nodes, routes, analytics)
  api/crowd-reports/     The one REST endpoint (crowd report submission)
  auth/callback/         Magic-link landing route
  trip/ live/ report/    map/ favorites/ profile/
components/
  ui/                    Small generic UI primitives (CrowdBadge, States)
  layout/                Shell: bottom nav, top bar, offline banner
  features/              Page-specific interactive pieces
  i18n/                  <T k="..."/> inline-translation helper
lib/
  supabase/              Browser / server / admin (service-role) clients
  i18n/                  Translation provider + locale dictionaries loader
  crowd/                 Crowd score, recency weighting, rate limiting, distance
  routing/               Graph builder, Dijkstra, route scoring, alternatives
  trip/                  Trip search feature (glues routing + crowd + data)
  data/                  Supabase read queries (nodes, routes, favorites…)
  data/admin/            Admin-only read queries
  actions/               Next.js Server Actions (mutations)
  actions/admin/         Admin-only Server Actions
  validation/            Zod schemas for every mutation input
  admin/guard.ts         Server-side admin gate (never trust the client)
  trust/                 Trust-score service layer (not wired to UI yet)
locales/                 az.json, ru.json (add en.json the same way later)
supabase/
  migrations/            Full SQL schema, indexes, RLS policies, functions
  seed/                  Seed script for the 18 named transport nodes
types/database.ts        Hand-written types mirroring the schema
__tests__/                Vitest unit tests for the business logic
```

**No separate backend.** Business logic lives in `lib/`, runs either as
Next.js Server Components/Route Handlers/Server Actions, or as Postgres
functions (for anything that must never leak raw rows to the client — see
Privacy below). The browser only ever talks to Supabase directly for
read-only queries protected by Row Level Security, or to the Next.js server.

## Getting started

1. Create a free [Supabase](https://supabase.com) project.
2. Copy `.env.example` to `.env.local` and fill in the three Supabase
   values from **Project Settings → API**.
3. Install dependencies and run the migrations (see below), then:

   ```bash
   npm install
   npm run seed      # loads the 18 named transport nodes (+ DEMO routes outside production)
   npm run dev
   ```

4. Open http://localhost:3000.

## Environment variables

See `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` must **never** be exposed to
the browser — it is only read by `lib/supabase/admin.ts` (guarded by the
`server-only` package, which turns an accidental client-side import into a
build error) and by the seed script.

## Database migrations

All schema, indexes, constraints, and RLS policies live in
`supabase/migrations/*.sql`, numbered in the order they must run. Apply them
with the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

(Or paste each file into the Supabase dashboard's SQL editor, in order, if
you don't want to install the CLI.)

What's in there, briefly:

- `0001` – shared helpers (`set_updated_at` trigger).
- `0002` – `profiles`, the `is_admin()` helper, and a trigger that stops any
  client (other than the service role) from writing `role` or `trust_score`.
- `0003`/`0004` – `transport_nodes`, `routes`, `route_nodes` with admin-only
  write policies.
- `0005` – `crowd_reports` (insert-only for the reporting user; no one can
  ever `SELECT` raw reports — see Privacy below), the 5-minute rate-limit
  trigger, and the aggregate functions the app actually reads from.
- `0006`/`0007` – `trip_requests` (demand logging) and `favorites`.
- `0008` – admin-only analytics functions.
- `0009` – `node_crowd_status`, a tiny public aggregate table kept in sync
  by a trigger, used purely so `/live` can subscribe to Supabase Realtime
  (Realtime enforces RLS, and `crowd_reports` itself is intentionally not
  readable — this table is the workaround).

## Seeding data

```bash
npm run seed
```

Seeds the 18 real transport nodes named in the product spec (coordinates
are approximate — verify against an authoritative source before relying on
them for anything beyond map placement). Outside `NODE_ENV=production`, it
also seeds two routes clearly marked `code: "DEMO-*"` and `is_demo: true`,
purely so the routing engine has something to search over locally. **Real
bus/metro routes are never invented** — the seed script only connects
nodes with made-up travel times for testing; an admin must add real,
confirmed routes by hand (see below). The seed script refuses to add DEMO
routes when `NODE_ENV=production`.

## Creating an admin user

There is no self-serve "become admin" flow, by design (role is always
re-derived from the database server-side, never trusted from the client).
To promote a user after they've signed in once via magic link:

```sql
update profiles set role = 'admin' where id = '<their auth.users id>';
```

Run this in the Supabase SQL editor using the dashboard's built-in
connection (which has full privileges) — never expose a way to do this from
the app itself.

## Adding transport nodes and routes

Once you have an admin account, go to `/admin/nodes` to add/deactivate
stations, and `/admin/routes` to create a route and then add its stops in
order (with the estimated minutes from the previous stop) on the route's
detail page. Nodes are never hard-deleted from the UI — only deactivated
(`active = false`), so historical reports and route references stay valid.

**Do not invent bus connections.** Only add a route once you've confirmed
it against an official source (operator schedule, on-the-ground
verification, etc.). A route type of `walking` can also be used to model a
short walking connector between two nearby nodes (e.g. a metro exit and a
bus stop at the same hub) — the routing engine treats it like any other
edge, weighted by the walking penalty instead of the transfer penalty.

## How the crowd algorithm works

Implemented in `lib/crowd/score.ts` (unit-tested in
`__tests__/crowd-score.test.ts`) and mirrored in the SQL function
`get_node_crowd_aggregates` (`0005_crowd_reports.sql`) so the same numbers
come out whether the server or the database computes them.

Only reports from the last **15 minutes** count at all. Each report gets an
`effectiveWeight`:

```
effectiveWeight = recencyWeight × userTrustScore × locationVerificationWeight
```

- `recencyWeight`: 1.0 (0–3 min), 0.8 (3–6 min), 0.6 (6–10 min), 0.3 (10–15
  min), 0 beyond 15 minutes.
- `userTrustScore`: from `profiles.trust_score` (default 1.0, clamped to
  [0.25, 2.0] — see [Trust score](#trust-score) below).
- `locationVerificationWeight`: 1.0 if the report was made within 300m of
  the node (checked server-side via the reporter's GPS coordinates), 0.5
  otherwise.

```
crowdScore = Σ(level × effectiveWeight) / Σ(effectiveWeight)
```

```
crowdScore <  0.66            → GREEN
0.66 <= crowdScore < 1.36     → YELLOW
crowdScore >= 1.36            → RED
no reports in the window      → UNKNOWN (never treated as GREEN)
```

`confidence` is purely a function of report count in the window: 0 →
`unknown`, 1–2 → `low`, 3–7 → `medium`, 8+ → `high`.

### Trust score

`profiles.trust_score` starts at `1.0` and is currently static — the MVP
intentionally does not implement a reputation system yet. The column, its
[0.25, 2.0] bounds, and a service-layer function
(`lib/trust/updateTrustScore.ts`, using the service-role client since the
column is otherwise locked by a DB trigger) exist so a future "increase
trust when a report is corroborated" feature can be added without touching
RLS, routes, or any UI.

### Rate limiting

A user can report at most once per node every 5 minutes. This is enforced
in two places: a friendly pre-check in the API route
(`app/api/crowd-reports/route.ts`, using `lib/crowd/rateLimit.ts`) for a
good error message, and — the actual source of truth — a Postgres trigger
(`enforce_crowd_report_rate_limit` in `0005_crowd_reports.sql`) that raises
on any insert that violates it, so the limit holds even if the API route is
bypassed entirely.

## How route scoring works

Implemented in `lib/routing/` (graph in `graph.ts`, search in `dijkstra.ts`,
scoring in `score.ts`, alternative selection in `alternatives.ts`; all
weights centralized in `lib/routing/config.ts` — change them there, not
scattered through the codebase). Unit-tested in `__tests__/routing.test.ts`.

The transport network is a directed graph: each route's stops become edges
between consecutive nodes, in the order an admin entered them. A
state-augmented Dijkstra search (state = current node + which transit route
you last boarded, so transfer penalties can be computed as you go) finds
paths under three different cost profiles:

- **Fastest** — raw travel time only (still includes real transfer wait
  time, since that's part of the actual duration).
- **Less crowded** — heavily weights the crowd penalty of each ride
  segment's boarding stop, willing to trade time to avoid a red node.
- **Alternative/balanced** — the standard `routeScore` below.

```
estimatedMinutes = Σ(leg minutes) + transfers × 8   // real duration shown to the user
routeScore       = estimatedMinutes + crowdPenalty + walkingPenalty
```

- `crowdPenalty`: `+0` (green), `+5` (yellow), `+15` (red), `+3` (unknown),
  applied once per transit ride segment based on its boarding stop.
- `walkingPenalty`: `walkingMinutes × (1.5 − 1)`, i.e. walking is perceived
  as a bit more costly than the same minutes on a vehicle.

Up to 3 alternatives are returned, deduplicated by node-sequence similarity
so the same route never appears twice under different labels; whichever
returned option has the lowest `routeScore` gets the "recommended" badge.
`routeScore` is never shown to the user directly — only the real
`estimatedMinutes` range, presented as "approximately X–Y min", since the
app never promises exact timing (see spec: no false precision).

For a desired arrival time, the suggested departure time is
`arrival − (estimatedMinutes + 5 min safety buffer)`.

## Authentication approach

**Supabase Auth with email magic links, no passwords.** Anyone can browse
`/`, `/live`, `/map` and search `/trip` anonymously (anonymous trip
searches are still logged for demand analytics via a random
`localStorage`-only session id, never linked to an identity). Submitting a
crowd report or saving a favorite requires being signed in.

Why magic links over a custom anonymous-session scheme: crowd reports feed
directly into `trust_score` and the 5-minute rate limit, both of which need
a stable, server-verifiable identity — a client-supplied anonymous session
id would be trivially forgeable, defeating both. Magic links are the
simplest Supabase-native option that gives us that, with no password
storage/reset flow to build or secure.

## Privacy approach

BakuFlow deliberately minimizes what it stores about people:

- **No location history.** GPS is only requested at the moment of
  submitting a crowd report, used once to compute a distance-to-node, and
  the raw coordinates are **never stored** — only the resulting
  `distance_to_node_m` and a `verified_near_node` boolean.
- **No raw crowd report is ever readable**, not by other users, not by the
  reporting user themself, not even by admins — there is no `SELECT`
  policy on `crowd_reports` at all. Every read path (the `/live` screen,
  the map, admin analytics) goes through `SECURITY DEFINER` SQL functions
  that only ever return aggregated, non-identifying numbers
  (`get_node_crowd_aggregates`, `get_node_recent_reports`,
  `admin_most_crowded_nodes`, etc.).
- **No per-user trip history** is exposed to anyone, including the user
  themselves or admins — `trip_requests` has no `SELECT` policy either;
  admins only ever see aggregated demand (top origins/destinations/OD
  pairs/peak search windows) via similar `SECURITY DEFINER` functions.
- **Zero reports ≠ green.** The UI always distinguishes "no data yet"
  (`UNKNOWN`, gray) from a genuinely low crowd level (`GREEN`).

## Testing

```bash
npm run test        # vitest run — crowd scoring, rate limiting, distance, routing
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run build        # next build
```

Unit tests cover the business logic that must be correct independent of any
UI: crowd score calculation, recency weighting, confidence buckets, the
rate-limit predicate, the Haversine distance/verification threshold, graph
construction, Dijkstra pathfinding, route scoring (transfers/crowd/walking
penalties), and route-alternative deduplication.

## Deployment

The app has no hosting-specific code — `proxy.ts` (Next.js 16's renamed
`middleware.ts`) only refreshes the Supabase session cookie and is portable
across any Node-compatible host. It has been built against Vercel and
Cloudflare's Next.js support without any provider-specific APIs.

1. Set the three environment variables from `.env.example` in your host's
   dashboard (never commit `.env.local`).
2. Run the migrations against your Supabase project (see above) before the
   first deploy.
3. Point your build command at `npm run build` / start command at
   `npm run start` (or your platform's Next.js adapter equivalent).

### PWA

The app ships a `manifest.json`, placeholder icons (`public/icons/` —
replace with real branded artwork before a public launch;
`scripts/generate-icons.mjs` shows how the placeholders were generated with
zero dependencies), and a minimal app-shell service worker (`public/sw.js`)
that caches static assets and the last-visited page so the app stays
installable and doesn't show a browser error page when offline. It never
pretends offline crowd data is current — the `OfflineBanner` component
makes that explicit whenever `navigator.onLine` is false.
