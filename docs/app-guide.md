# App guide

## Navigation

The scene and side panel move together through four levels:

1. **Portfolio**: three exploded stacks with a label per center. Click a stack or label, or a center in the side panel.
2. **Center**: the stack fills the view. Levels are listed in the side panel; clicking a level or any store on it opens that level.
3. **Level**: top-down view of one floor with store names. Click a store, or a row in the Stores grid.
4. **Store**: profile in the side panel; the store stays raised in the scene.

The action queue in the portfolio and center panels also navigates: clicking an action jumps straight to its store, setting the center and level too.

The header has a Back button and a breadcrumb (Portfolio / center / level / store). Clicking empty space in the scene deselects the store. Every scene action has a keyboard path through the side panel (center list, level list, stores grid).

Controls: drag to orbit, scroll to zoom. Hover shows a tooltip.

## Lenses

The lens picker colors stores. All lens values arrive in one query, so switching is instant.

| Lens | Value | Ramp |
|---|---|---|
| Category | Store category | Categorical palette |
| Sales / m2 | Annualised sales per occupied m2 | Sequential, 5th-95th percentile |
| Sales growth | YoY, -15% to +15% | Diverging |
| Occupancy cost | Rent + service charge over sales, 20% (stretched) to 6% (comfortable) | Diverging |
| Lease runway | Years to expiry, 0 to 6 | Sequential |
| Footfall | Visitors in the store's zone | Sequential, percentile |
| Health score | 0-100 composite, 25 to 85 | Diverging |
| Actions | Status of the follow-ups raised for a store | Categorical: open, in progress, done, no action |

Vacant units are low, translucent and neutral under every lens except Actions, where they are colored by their action status so a vacant unit being marketed stands out.

## Period

Last 12 months (default), Year to date, Last quarter, Last month. Ranges are month-aligned and end at the last full month of data (September 2026). Trend charts always show the trailing 24 months.

## Panels

- **Portfolio**: headline KPIs (sales, visitors, sales per m2, occupancy, occupancy cost, WAULT), center list, action queue, monthly sales chart, sales by category.
- **Center**: KPIs, level list, action queue for that center, sales per m2 by level, sales by category, monthly sales with the center highlighted.
- **Level**: level KPIs and a sortable stores grid (tenant, category, area, current lens value).
- **Store**: health dial, plain-language flags, actions, KPI tiles, sales per m2 versus category average (24 months), occupancy cost components (12 months), zone footfall by weekday and hour, lease history.

### Store flags

Derived in `lib/insights.ts` from query values, never hardcoded: occupancy cost above 15%; lease ending within 12 months (information up to 24 months); sales density more than 15% below or above the category average; sales down or up 8% or more year on year; base rent 10% or more below market; for vacant units, a leasing note. Each flag has a stable id and, where a follow-up makes sense, a suggested action type.

## Action center

Reports show what is happening; actions record what the team does about it. Actions are saved through Rayfin and shared by every signed-in user (see [architecture.md](architecture.md#app-owned-data)).

| Flag | Suggested action |
|---|---|
| Vacant unit | Market vacant unit |
| Lease expires within 12 months | Lease renewal |
| Occupancy cost above 15%, or base rent 10% or more below market | Rent review |
| Sales density 15% below category, or sales down 8% or more | Performance review |

Flow:

1. In the store panel, the Actions section offers one button per suggested action (hidden once an active action of that type exists for the store).
2. The button opens a form pre-filled from the flag: title, priority (high for warnings, medium otherwise), optional due date, assignee (defaults to you).
3. The new action starts as Open. Its status can be changed to In progress, Done or Declined, it can be assigned to you, and it has a comment thread.
4. The Actions lens colors stores by status, so work in progress is visible on the map.
5. The portfolio and center panels show an action queue of open and in-progress actions, overdue first, with an "Assigned to me" filter.

Authors and assignees are shown by email address because the signed-in user only exposes an id and an email. Actions cannot be deleted; decline them instead.

## Design system

- Direction: architectural, Nordic. Warm paper background, deep ink-blue primary, a single vermilion accent (`--color-signal`) for selection and alerts. Dark mode is a blueprint-style navy.
- Fonts: Instrument Serif (headings, KPI values) and Instrument Sans (UI), loaded from Google Fonts in `index.html`.
- All colors and radii are tokens in `src/global.css`: semantic tokens, ten categorical data colors (`--color-data-1..10`), heat ramps (`--ramp-seq-1..5`, `--ramp-div-1..5`), 3D surface colors (`--color-vacant`, `--color-slab`, `--color-slab-edge`). The diverging ramp runs bad to good with a golden midpoint so neutral stores stay distinct from slabs.
- `src/data-palette-presets.json` holds three alternative categorical palettes (Harbour, Birch, Aurora) with light and dark variants.
- States: every query-backed block has loading (skeleton), empty and error (alert banner) states. `prefers-reduced-motion` shortens animations and disables camera transitions.
- Layout: on large screens the scene fills the left and a 28rem panel sits on the right; on small screens they stack.
