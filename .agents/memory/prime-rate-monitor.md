---
name: Prime-rate monitor architecture (Modern Cents)
description: How the automated Canadian prime-rate check + in-app banner is wired and why.
---

The mortgage calculator's automated prime-rate alert is a chain:
scheduled job → DB → api-server → client banner.

- Job: `scripts/src/check-prime-rate.ts` fetches BoC Valet series `V80691311`
  (free, no key) and upserts one row per `observed_date` into `prime_rate_readings`.
  Run via `pnpm --filter @workspace/scripts run check-prime-rate`. Intended to run as
  a separate **Scheduled Deployment** (shares the prod DB), NOT the main app deploy.
- API: `GET /api/prime-rate` returns the latest reading; 404 when none.
- Banner: `PrimeRateBanner` compares live prime to the CODE default
  (`DEFAULT_PRIME_RATE_PCT` in `Calculator.tsx`) client-side; shows only if drift ≥ 0.01.

**Why this shape:** comparison is against the code constant, so the banner clears
itself once someone updates `DEFAULT_PRIME_RATE_PCT` and redeploys — no DB "baseline"
column and no acknowledge endpoint to drift out of sync. Keep it that way.

**How to apply:** the banner is pure progressive enhancement — if the API errors or
has no data it renders nothing, preserving the static-first/SEO calculator. Don't make
the calculator depend on the API. Production needs (a) the `prime_rate_readings` table
pushed to the prod DB and (b) the Scheduled Deployment created before alerts work live.
