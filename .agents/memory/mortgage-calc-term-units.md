---
name: Mortgage calc term is fractional years, month granularity
description: termYears can be non-integer since the term-end-date input; date math and displays must handle it.
---

# termYears is fractional (month granularity)

`ScenarioState.termYears` is no longer guaranteed to be an integer: the Term input has a Years / End-date toggle, and End-date mode stores `months / 12`.

**Why:** users wanted to enter a term end date directly; keeping `termYears` as the single source of truth avoided touching all downstream math.

**How to apply:**
- Any date arithmetic on terms must convert to whole months first: `Math.round(termYears * 12)` and add months via `addMonthsClamped()` (lib/mortgage.ts), which clamps month-end overflow (Aug 31 + 6 mo → Feb 28). Never `setFullYear(+termYears)` or raw `setMonth` for term math.
- Any UI text showing the term must use `formatTermYears()` (lib/format.ts) — renders "5-year" or "4 yr 7 mo" — never interpolate `termYears` raw.
- The end-date input itself is local useState in scenario-form (escape-hatch pattern, see mortgage-calc-rhf-guards.md), valid range 1–120 months.
