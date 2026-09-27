# Design system

## Tokens

Every colour in the app is a CSS custom property defined in
`frontend/src/app/globals.css` and exposed to Tailwind through `@theme inline`.
Nothing hard-codes a hex value except the token definitions themselves.

Light is the base palette. Dark is a **selected** set of steps for the dark
surface, not an automatic inversion — the categorical series, for example, use
different hexes in each mode so they clear contrast against their own surface.

The dark values are declared **twice**, on purpose:

```css
:root { /* light */ }

@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) { /* dark, following the OS */ }
}

:root[data-theme="dark"] { /* dark, following the in-app switch */ }
```

The `:not([data-theme="light"])` guard lets an explicit light choice beat OS
dark, and `:where()` keeps the media block's specificity at zero so the
`[data-theme]` scope wins in both directions. A small blocking script
(`themeBootstrapScript`) stamps the attribute before first paint, so there is no
flash.

Surfaces are warm neutral (`#fcfcfb` / `#17171a`) rather than the usual cold
slate — it is the cheapest way to not look like every other dashboard.

## Chart palette

Charts use a colourblind-validated categorical palette, exposed as
`--series-1` … `--series-8`. Rules that are not negotiable:

- **Categorical hues are assigned in fixed order, never cycled.** Colour follows
  the entity, not its rank, so a filter that changes the series count never
  repaints the survivors.
- **One axis per chart.** Two measures of different scale get two charts.
- **Status colours are reserved** — `--good`, `--warning`, `--serious`,
  `--critical` are for state, never for "series 4", and every status pill pairs
  the colour with an icon or a label so hue never carries meaning alone.
- **Thin marks, recessive chrome.** 2 px lines, 4 px rounded data-ends anchored
  to the baseline, hairline gridlines, muted axis ink.
- **Hover is part of the chart**, not an extra. The line chart ships a crosshair
  and tooltip; bars have a hit target wider than the mark.
- A **table view** exists wherever the numbers matter (`/app/reports`), which is
  also the mitigation for the light-mode series steps that sit below 3:1.

Charts are hand-built SVG (`frontend/src/components/charts/`) rather than a
charting library, so these rules are enforced in the component rather than
fought with overrides.

## Bidirectional layout

The whole app is direction-agnostic: logical properties (`ms-`, `pe-`,
`start-`, `end-`, `border-s`) everywhere, with `ltr:` / `rtl:` variants only
where a value genuinely differs.

Two deliberate exceptions inside charts:

1. **The plot area is always LTR.** A time axis running left-to-right is the
   convention in Iranian dashboards, and mirroring it confuses the read. Labels
   and numbers are still localised.
2. **Ordinal category axes flip.** The driver-score bands (risk → bronze →
   silver → gold) are reversed in Persian so the first band starts at the
   reading edge.

Units that would be reordered by the bidi algorithm (`°C`, `V`) are wrapped in
`<bdi>`.

One more bidi trap worth knowing: **Leaflet writes path colours into SVG
presentation attributes**, where `var(--token)` is not resolved. Anything handed
to Leaflet goes through `readCssVar()` first (`frontend/src/lib/css-var.ts`),
recomputed when the theme changes. Marker icons are HTML div icons, so those
may use tokens directly.

## Typography

Vazirmatn for Persian, Inter for Latin, both via `next/font`. Persian body copy
gets a looser line-height (1.85) — it needs the room. Tabular figures are
applied with a `.tnum` class only where columns must align (tables, axis ticks,
stat values); body prose keeps proportional figures.

## Motion

Entrances are short and spring-ish (`cubic-bezier(0.22, 1, 0.36, 1)`), scroll
reveals fire once, and everything collapses to near-zero duration under
`prefers-reduced-motion: reduce`.
