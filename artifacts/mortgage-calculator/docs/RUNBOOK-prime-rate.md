# Runbook — Quarterly Prime Rate Review & Update

**App:** Modern Cents (mortgage calculator)
**Purpose:** Keep the default **prime rate** used by the calculator in sync with the
Canadian prime rate after each Bank of Canada (BoC) interest-rate announcement.
**Owner:** _(assign a person/role)_
**Last reviewed:** _(fill in YYYY-MM-DD each time you run this)_

---

## Why this matters

When a user switches a scenario to a **Variable** rate, the calculator seeds the
effective rate from **Prime + spread**. If our default prime is stale, every new
variable-rate estimate starts from a wrong number. The prime rate moves whenever the
BoC changes its policy (overnight) rate, so this needs a recurring check.

> **Note on cadence.** The BoC does **not** announce quarterly — it has **8 fixed
> announcement dates per year** (roughly every 6 weeks). "Quarterly" is fine as a
> *minimum* review rhythm, but the safest practice is to check after **every**
> scheduled announcement, because prime can change on any of them. See the schedule
> link in [References](#references).

## How prime relates to the BoC rate

- The BoC sets the **target for the overnight rate** (the policy rate).
- Canadian banks set their own **prime rate**, but in practice it moves in lockstep
  with the policy rate — historically **prime = overnight target + 2.20%**.
- When the BoC changes the overnight rate, the major banks update prime within a few
  business days. Always confirm the actual posted prime rather than computing it.

---

## Where the value lives

A single default drives the whole app:

- **Field:** `defaultScenario.primeRatePct`
- **File:** `artifacts/mortgage-calculator/src/pages/Calculator.tsx`

To locate it regardless of line moves:

```bash
rg -n "primeRatePct:" artifacts/mortgage-calculator/src/pages/Calculator.tsx
```

`Scenario B` and any compare scenario inherit this same default (they spread
`defaultScenario`), so you only change it in **one** place.

> Spread / discount (`spreadPct`) is a per-user input, not something this runbook
> changes. We only maintain the **prime** baseline.

---

## Procedure

Run this within a few business days **after each BoC announcement** (and no less than
once a quarter).

### 1. Check the announcement
- Open the BoC policy-rate page (see [References](#references)).
- Note whether the overnight target **changed** and the new value.

### 2. Confirm the new prime rate
- Check the posted **prime rate** at one or two major Canadian banks (RBC, TD, etc.),
  or a reputable aggregator.
- Confirm all sources agree on the same prime figure.
- If the overnight rate did **not** change, prime almost certainly did **not** change
  — record "no change" below and stop.

### 3. Update the default (only if prime changed)
- Edit `defaultScenario.primeRatePct` in `Calculator.tsx` to the new prime value
  (e.g. `5.45` → `5.20`).

### 4. Verify
```bash
pnpm --filter @workspace/mortgage-calculator exec tsc --noEmit
```
- In the preview, add a scenario, switch the rate type to **Variable**, and confirm
  the **Prime Rate** field shows the new value and the effective rate (Prime + spread)
  recalculates correctly.

### 5. Ship
- Commit the change with a clear message, e.g.
  `chore: update default prime rate to X.XX% (BoC <date> announcement)`.
- Publish/deploy so the live app picks up the new default.

### 6. Record it
- Update **Last reviewed** at the top of this file and add a row to the
  [Change log](#change-log).

---

## Rollback

If a wrong value ships:
1. Re-edit `defaultScenario.primeRatePct` back to the previous value (see the change
   log below for history), or roll back to the prior checkpoint.
2. Re-run the typecheck and redeploy.

This is a single numeric constant with no data migration, so rollback is low-risk.

---

## Change log

| Date (YYYY-MM-DD) | BoC overnight target | Prime rate set in app | Changed by | Notes |
|---|---|---|---|---|
| _initial_ | — | 5.45% | — | Value present at runbook creation |

---

## References

- Bank of Canada — policy interest rate & announcements:
  https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/
- Bank of Canada — schedule of fixed announcement dates:
  https://www.bankofcanada.ca/press/upcoming-events/
- Major bank prime rates: check RBC / TD / Scotiabank / BMO / CIBC posted prime, or a
  reputable rate aggregator, to confirm the current figure.
