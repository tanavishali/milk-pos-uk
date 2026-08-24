# Theme

The visual language is ported from the BLANKSYS POS mockup: a dark navy chrome
bar over a cool grey page, white cards with hairline borders and almost no
resting shadow, one blue accent, a vivid mint for money, small type at heavy
weights, and 12/16px radii.

The mockup had no tokens — it was a single HTML file with Tailwind classes and
hard-coded hex (`bg-[#1a2332]`, `text-[#2c6ecb]`, `bg-[#e8f0fe]`) repeated across
seven pages. Here it is a token set in [`app/globals.css`](../app/globals.css),
mirrored as raw hex in [`theme/colors.ts`](../theme/colors.ts).

**Don't reintroduce raw palette classes or hex literals.** `bg-slate-50` and
`text-[#2c6ecb]` don't respond to dark mode and don't survive a rebrand; their
token equivalents do.

> **History.** An earlier pass built these tokens from the Manzor Traders
> dashboard. The token *names* and structure survived; the *values* were
> re-pointed to BLANKSYS. Both are slate-on-white systems with a blue accent, so
> the shape held — what changed is the navy chrome group, the mint success
> colour, rose instead of red for danger, and the font.

## Tokens

### Chrome

The navy top bar has its own group. These five tokens only ever apply on that
dark surface, which is why they are not part of the body palette — one dark bar
in a light app shouldn't force every foreground token to have a dark twin.

| Token | Use |
|---|---|
| `bg-chrome` | The bar itself |
| `bg-chrome-hover` | Pressed/hover states on it |
| `text-chrome-foreground` | Brand wordmark, user name |
| `text-chrome-foreground-muted` | Tagline, page title, meta |
| `border-chrome-border` | The divider before the page title |
| `bg-chrome-accent` | The mint avatar chip |

### Surface

| Token | Use |
|---|---|
| `bg-background` | The page behind everything (`#f0f3f8` — cooler and darker than slate-50) |
| `bg-surface` | Cards, modals, sidebar, tab bar |
| `bg-surface-muted` | Input fills, table headers, hover on surface |
| `bg-surface-subtle` | Pressed states, the view-toggle track |
| `bg-surface-inset` | Progress tracks, pending stepper dots |

### Foreground

| Token | Use |
|---|---|
| `text-foreground-strong` | Stat values, page headings |
| `text-foreground` | Default body, card titles |
| `text-foreground-body` | Secondary copy, table cells |
| `text-foreground-muted` | Supporting text, icon strokes |
| `text-foreground-subtle` | Labels, captions, placeholders, uppercase headers |
| `text-foreground-on-accent` | Text on any solid accent/semantic fill |

The mockup leans on the gap between `foreground-strong` and `foreground-subtle`:
a stat card is a tiny grey uppercase label above a near-black extrabold number.
That contrast *is* the look — keep it.

### Accent and semantics

Each of `accent`, `success`, `danger`, `warning`, `info` has the same five-part
ramp, so a badge, a button and an alert are built the same way whatever they mean:

| Suffix | Use |
|---|---|
| *(base)* | Solid fill — primary button, stepper dot, the `+` stepper |
| `-hover` | That fill's hover |
| `-soft` | Tinted background — active nav item, selected wizard row, badges |
| `-muted` | One step stronger — status pills |
| `-ring` | Border on a soft background, and the tint inside `shadow-*` |
| `-text` | The readable text/icon colour on a `-soft` background |

Meaning, carried from the mockup: **mint** (`#00c980`) for money and positive
deltas, **rose** for destructive actions and negative deltas, **amber** for the
"On Credit" state, **blue** for everything interactive. `info` (violet) is
defined but currently unused.

### Radius

`rounded-control` (12px) for buttons, inputs, nav items, badges-as-chips.
`rounded-card` (16px) for cards, modals, toolbars. `rounded-t-card-lg` (24px) for
the top corners of a mobile bottom sheet. `rounded-full` for pills, avatars,
stepper dots. `rounded-control-sm` (8px) for small inline controls.

### Elevation

| Token | Use |
|---|---|
| `shadow-card` | Resting card — deliberately almost invisible |
| `shadow-card-lg` | The `hover-lift` target |
| `shadow-dropdown` | The mobile tab bar and the FAB |
| `shadow-modal` | Dialogs and the open mobile drawer |
| `shadow-chrome` | Under the navy bar |
| `shadow-accent` / `-success` / `-danger` | Coloured glow under a matching solid fill |

### Type

Small and heavy. `text-sm` for headings, `text-xs` for body and controls, and
three sizes below that — `text-label` (11px) for uppercase captions,
`text-micro` (10px) for meta lines, `text-nano` (9px) for badge text and struck
prices. Weights run `font-bold` → `font-extrabold` → `font-black`; `font-medium`
is the lightest thing used for a label.

### Motion and custom utilities

`hover-lift` raises a card 2px with an overshoot curve (`--ease-spring`). It is
wrapped in `@media (hover: hover) and (pointer: fine)` — on touch there is no
hover to leave, so an unguarded rule leaves the card stuck up after a tap.

`press-scale` is the 0.96 tap feedback on buttons. `animate-modal-pop` is the
dialog entrance. `animate-slide-up` is available for a bottom sheet that should
slide rather than pop. `scrollbar-hide` is opt-in per container.

## Printing

Thermal receipts print through two data attributes rather than classes, so the
rule doesn't depend on Tailwind's output:

- `data-print-root` on the receipt subtree — the only thing left visible
- `data-no-print` on anything inside it that must not print (the modal's header
  and footer)

`@media print` in [globals.css](../app/globals.css) hides `body *` by
`visibility`, not `display`, so the printable node keeps its layout box.
[`InvoiceModal`](../features/orders/components/InvoiceModal.tsx) is the only
current consumer.

## Dark mode

**Every dark value is derived, not ported** — the mockup is light-only. Surfaces
walk down the slate scale (`#020617` page, `#0f172a` card), accent and semantic
hues brighten for contrast, and the `-soft`/`-muted`/`-ring` tints become
translucent overlays of the light hue rather than opaque pastels, because a
pastel chip is unreadable on a dark card.

**There is no theme toggle wired up.** The tokens flip on a `dark` class on
`<html>`, but nothing sets it — `next-themes` is not installed. Adding it is one
provider plus a toggle in `Chrome`. Worth a design pass first; the structure is
right but the exact steps are nobody's considered judgement yet.

## Mechanics

`@theme inline` is what makes the tokens theme-aware: the palette lives as plain
custom properties on `:root` and `.dark`, and the `@theme` block maps Tailwind's
`--color-*` names onto them *by reference*. Utilities therefore resolve through
the variable at runtime instead of being frozen at build time, which is what lets
one `bg-surface` be white in light and `#0f172a` in dark.

`--font-sans` points at `--font-plus-jakarta`, the CSS variable
[`app/layout.tsx`](../app/layout.tsx) gets from `next/font/google`. The family is
named in exactly one place; everything else inherits it through `font-sans`.

`@custom-variant dark (&:where(.dark, .dark *))` uses `:where()` to keep the
variant at zero specificity, so `dark:` never outranks an unrelated utility by
accident.

## Deliberately not ported

- **`::-webkit-scrollbar` on everything.** The mockup styled scrollbars to 4px
  globally; kept, since it is part of the look.
- **`select-none` on `<body>`.** The mockup disabled text selection app-wide.
  Not carried over — it breaks copying an order ID or a phone number, which a
  cashier actually needs to do.
- **`maximum-scale=1, user-scalable=no`.** The mockup's viewport meta blocked
  pinch-zoom. Not carried over: it fails WCAG 1.4.4, and this app's 9–11px type
  is exactly the case where someone needs to zoom.
