---
name: Mortgage calc form validator guard + RHF numeric fields
description: Why clearing a numeric field can freeze the whole scenario form, and how new numeric fields must be wired.
---

# scenario-form validator guard is all-or-nothing

`scenario-form.tsx` emits state via a single `form.watch` guard that requires EVERY field to pass `typeof === "number" && !isNaN(...)` before calling `onChange`. If any one numeric field is invalid, the parent scenario state stops updating entirely — results, charts, and print silently go stale.

**Why:** numeric inputs registered with `{ valueAsNumber: true }` yield `NaN` the moment the user clears the field. For optional fields (e.g. the "Other Monthly Housing Costs" group: property tax, condo fees, maintenance, utilities, insurance, other) blank is a normal action, so a bare `valueAsNumber` guard would freeze the form whenever someone empties one.

**How to apply:** when adding any new numeric field to ScenarioState + this form:
1. Add a matching `typeof v.X === "number" && !isNaN(v.X)` line to the big guard `if`, AND
2. Register the input with `setValueAs: (v) => (v === "" || v === null || isNaN(Number(v)) ? 0 : Number(v))` (not `valueAsNumber`) so cleared/optional fields coerce to 0 and never block the guard.
   - Required fields where blank should be rejected can keep `valueAsNumber`, but then expect the form to pause until refilled.
Also remember to add the field to `defaultScenario` (scenario B inherits via `{ ...defaultScenario }`).
