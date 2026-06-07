---
name: Mortgage calc ScenarioForm one-way dataflow + remount-to-seed
description: Why pushing parent-driven values into ScenarioForm requires remounting it, not just updating state.
---

# ScenarioForm is one-way: parent state -> form only at mount

`scenario-form.tsx` reads the parent `state` prop ONLY as React Hook Form `defaultValues` at mount. After that, data flows form -> parent via `form.watch` -> `onChange`. The parent state is never read back into the form during the form's lifetime. So updating parent scenario state alone does NOT change what the user sees in the inputs.

**Why:** RHF defaultValues are snapshotted once; later prop changes are ignored by design. This matters whenever the parent needs to *seed* or *override* a field programmatically (e.g. auto-updating the prime rate from a live Bank of Canada fetch).

**How to apply:** to push a parent-computed value into the visible form, REMOUNT the form by bumping its React `key` (e.g. `key={`A-${primeSeeded}`}`) after updating parent state. This is safe precisely because parent state always mirrors the form (one-way sync), so a remount loses no user edits — it just re-snapshots current state as new defaultValues.

- Guard the seed with a one-shot `useRef` + a value-equality "untouched" check (field still equals the build-time default) so customized scenarios aren't clobbered.
- Gate the remount on an actual delta (skip entirely when the live value already equals the default) to avoid a pointless remount on every load.
- Residual edge case (accepted as negligible): if a user edits a field back to *exactly* the build default within the sub-second fetch window, the value-equality check treats it as untouched and overwrites it.
