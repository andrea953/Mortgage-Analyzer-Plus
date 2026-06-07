---
name: Prime-rate monitor architecture (Modern Cents)
description: How the automated Canadian prime-rate check + in-app banner is wired and why.
---

The mortgage calculator's automated prime-rate refresh is a chain:
api-server (lazy refresh) → DB → client banner + scenario seeding.

- Source of truth: `lib/db/src/prime-rate.ts` — `fetchPrimeRateFromBoC()` (BoC Valet
  series `V80691311`, free/no key, 5s timeout), `upsertPrimeRate()` (idempotent on
  `observed_date`), `getLatestPrimeRate()`, and `ensureFreshPrimeRate()`.
- API: `GET /api/prime-rate` calls `ensureFreshPrimeRate()`: returns stored reading,
  but if missing or older than 12h it fetches from BoC and upserts, then returns.
  Resilient — on fetch failure it serves the existing stale row (never throws); 404
  only when there is genuinely nothing. Throttle: per-instance module-level
  `lastFetchAttempt`, 30min when a stale fallback exists, 30s on cold start.
- `scripts/src/check-prime-rate.ts` still exists as a thin manual one-off refresh
  reusing the same helpers (NOT required in production anymore).
- Banner: `PrimeRateBanner` compares live prime to the CODE default
  (`DEFAULT_PRIME_RATE_PCT` in `Calculator.tsx`) client-side; shows only if drift ≥ 0.01.

**Why lazy-refresh, not a Scheduled Deployment:** this repl deploys as ONE unified
autoscale deployment (`router = "application"` in `.replit`) — calculator static at `/`,
api-server process at `/api`. One repl = one deployment, so a separate Scheduled
Deployment cron isn't available. Lazy refresh on read needs no extra infra and works
the moment the app is published.

**Why compare against the code constant:** the banner clears itself once someone bumps
`DEFAULT_PRIME_RATE_PCT` and redeploys — no DB "baseline" column / acknowledge endpoint
to drift out of sync. Keep it that way.

**How to apply / production:** banner + seeding are pure progressive enhancement — if the
API errors or has no data the calculator still works (static-first/SEO). Don't make the
calculator depend on the API. The only production prerequisite is the `prime_rate_readings`
table, which Replit's Publish flow migrates to prod automatically (do NOT hand-write prod
migrations). On first prod request the api-server self-populates the table from BoC.
