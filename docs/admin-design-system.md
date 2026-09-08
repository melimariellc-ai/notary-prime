# Enliven Notary — Admin/CRM Design System

Unchanged by design: navy header (`--charcoal`), cream page background
(`--background`), brass/gold accent (`--gold`), and serif headline with an
italic accent word (`font-display` + `italic font-light text-gradient-gold`).

Reusable primitives live in `src/components/admin/ui/`.
Apply them by swapping containers/controls only — never re-style per page.

---

## 1. Button hierarchy — `src/components/admin/ui/Button.tsx`

All buttons: pill radius (9999px), `font-medium`, gap 0.5rem, icon **16px
(h-4 w-4) and always before the label**, focus ring `gold/60` with 2px offset,
disabled = 50% opacity. No small-caps chip buttons anywhere.

| Variant | Background | Text | Border |
|---|---|---|---|
| primary | gold gradient `oklch(0.84 0.105 86) → oklch(0.78 0.115 82)` (`btn-gold`) | `oklch(0.16 0.035 260)` navy | none | contrast 5.24:1 (AA) |
| secondary | transparent (hover `--secondary`) | `--foreground` `oklch(0.22 0.035 258)` | 1px `--border` |
| tertiary | none (hover `secondary/60`) | `--accent-foreground` `oklch(0.28 0.05 80)`, underline on hover | none |
| destructive | `--destructive` `oklch(0.51 0.2 27)` | `--destructive-foreground` near-white | none |

Sizes: `md` = height 2.5rem / padding-x 1.25rem / 14px (default).
`sm` = height 2.25rem / padding-x 1rem / 13px.

## 2. Badge / status indicator — `src/components/admin/ui/Badge.tsx`

One component for pipeline stages, SMS status, quote status, overdue flags,
role labels, and any other status text.

- Radius: 9999px. Padding: `0.25rem 0.625rem`. Text: 12px, `font-medium`,
  **normal letter-spacing** (no uppercase small-caps tracking).
- Border: 1px, tinted to the tone. Background: 10–12% tone tint.
- Dot: optional 6px circle before the label, used **only** to carry a
  data colour (pipeline stage). Text colour never changes with the dot.

Tones (all text/background pairs verified AA):
`neutral` (secondary/foreground), `accent` (gold tint/accent-foreground),
`positive` `--status-positive oklch(0.46 0.11 155)`,
`warning` `--status-warning oklch(0.46 0.10 62)`,
`critical` `--destructive`, `info` `--status-info oklch(0.45 0.09 258)`.

## 3. Card — `src/components/admin/ui/Card.tsx`

Every card container is identical: `bg-card`, 1px `--border`,
radius `1.5rem` (rounded-3xl), padding `1.5rem` (`2rem` at ≥768px),
hairline shadow `0 1px 0 var(--color-border)`. Only content varies.
`CardHeader` supplies the 24px serif title, optional 20px accent icon, and
right-aligned meta slot.

## 4. Spacing & type scale

Spacing (Tailwind steps only):
- Page section padding: `px-4 py-8` (`md:px-8 md:py-10`).
- Gap between cards: `1.5rem` (`gap-6`); grid of stat tiles: `gap-4`.
- Inside a card: title → body `1.5rem` (`mt-6`); stacked rows `gap-2`;
  list row padding-y `1rem`.

Type scale:
| Role | Size / style |
|---|---|
| Page title (h1) | serif 30px, `md:36px`, tracking-tight |
| Card title (h2) | serif 24px, tracking-tight |
| Stat figure | serif 36px, `md:48px` |
| Section label | 11px, uppercase, `0.18em`, semibold, muted (`SectionLabel`) |
| Body | 14px, `leading-relaxed` |
| Small print / meta | 12px, muted |

Never below 12px for real text.
