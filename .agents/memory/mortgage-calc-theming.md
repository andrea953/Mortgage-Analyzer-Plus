---
name: Mortgage calc brand theming
description: Where the Modern Cents brand colors live and the dual-theme + contrast rules to keep when changing them.
---

# Modern Cents brand theming

Brand palette: indigo `#6366f1` → purple `#a855f7` → pink `#ec4899` (Tailwind indigo-500 / purple-500 / pink-500).

The whole calculator's color comes from CSS custom properties in `artifacts/mortgage-calculator/src/index.css`:
- `--primary` + `--ring` drive buttons, segmented toggles, sliders, switches, focus rings, `text-primary`, and `border-primary/*` cards. Set to brand indigo `239 84% 60%`.
- `--accent` / `--accent-foreground` are hover/focus backgrounds (dropdown, calendar) — soft lavender (light), muted indigo (dark).
- `--chart-1..5` feed all Recharts visualizations as an indigo→violet→purple→fuchsia→pink ramp. The housing donut/bar also has two extra hardcoded hues in `amortization-chart.tsx` (keep them brand-adjacent).

**Why / rules to apply:**
- There are TWO token blocks (`:root` light and `.dark`). Any brand token change must be made in BOTH or the themes drift.
- Contrast floor: `--primary` at lightness >67% fails WCAG AA (4.5:1) for white `--primary-foreground` on small button text; keep dark-mode primary ≤ ~60% lightness.
- The hero summary bubble (`scenario-results.tsx`) uses a translucent brand gradient (`from-indigo-500/90 via-purple-500/90 to-pink-500/90`, white text). User explicitly prefers it soft/translucent over a solid/dark fill — do not "fix" it back to an opaque dark fill without asking. The large $ figure carries the contrast; keep secondary labels at high white opacity.
