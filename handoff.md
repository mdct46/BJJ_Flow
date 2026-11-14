# Handoff: BJJ Flow

## Current state (read this first)

The project is now an installable web app (PWA) in **`app/`**. `bjj-flow-map.html` is the
original single-file prototype. It is frozen: **content edits go in `app/js/data.js`**,
not the old file. Most of this document below the app section describes the data model
and content rules, which carried over unchanged.

### Roadmap and decisions (Nov 2026)

1. ~~App shell and home screen, PWA, on-device storage~~ **done (v0.1.0)**
2. Flow Notes v1: log sessions and rolls (partner, subs given/taken and from which position, notes), history list
3. Link the log back into the app: per-position stats on the map, My Game rating
   **suggestions** (user confirms; never auto-changed), Practice next weighted by what keeps catching you
4. Extras: partner records, trends

Single user for now, but the audience is expected to grow and will need accounts.
That's why all user data goes through `app/js/store.js` (see below).

### App structure (`app/`)

No build step, no framework. Plain ES modules, so it must be served over http(s);
opening `index.html` from disk won't work.

| Path | Purpose |
|---|---|
| `index.html` | Shell: top bar, `<main id="view">`, bottom nav (phones) |
| `js/app.js` | Hash router, nav, service worker registration. Routes: `#/home`, `#/map`, `#/map/<positionId>`, `#/glossary`, `#/glossary?q=<search>`, `#/notes`, `#/game`, `#/settings` |
| `js/data.js` | All technique content (positions, edges, chains, steps) plus derived glossary data |
| `js/store.js` | **The only module that touches persistence.** Async `get/set/exportAll/importAll` over IndexedDB. When accounts come, replace this file's internals with an API-backed version and keep the same interface |
| `js/ratings.js` | My Game ratings, skill list, Practice next scoring, radar SVG. Shared by Home and My Game |
| `js/ui.js` | Shared render helpers (`esc`, `subDetailHtml`, `positionLinks`, `matchesQuery`) and nav icons |
| `js/views/*.js` | One module per page, each exporting `mount(el, route)` and optionally `unmount()` |
| `js/version.js` + `sw.js` | Version number, in **two places**. Bump both on every release |
| `sw.js` | Precaches the app shell (the `SHELL` list must include every new file) and serves stale-while-revalidate, so it loads offline and fast on bad gym wifi |
| `manifest.webmanifest`, `icons/` | Install metadata. PNGs were rendered from `icons/icon.svg` |

**Run locally:** from `app/`, run `python -m http.server 8765` and open http://localhost:8765.
Because of stale-while-revalidate, a code change shows on the *second* reload. In
DevTools > Application > Service Workers, tick "Update on reload" while developing.

**Hosting:** GitHub Pages at https://mdct46.github.io/BJJ_Flow/ (repo
https://github.com/mdct46/BJJ_Flow, public). `.github/workflows/pages.yml` publishes
the `app/` folder on every push to `main`, which takes about a minute. To release:
bump the version in `sw.js` and `js/version.js`, commit, push. Installed copies pick
up the new version on their next launch.

**Install on a phone:** open the URL above. Then use "Add to Home Screen" (iOS Safari) or the install
prompt (Android Chrome). User data lives on the device. Settings has backup export/import.

### What changed from the prototype

- Glossary moved under the Map tab (Map / Glossary toggle). The legend and filters only show on the map.
- Selecting a position updates the URL (`#/map/mount`), so positions and searches are deep-linkable.
- Position names in the Glossary and My Game link to that position on the map.
- Ratings are stored in IndexedDB, not `window.storage`. Ratings from the Claude artifact version don't carry over.

---

# Reference: data model and content rules

(Written for the prototype. Everything here applies to `app/js/data.js`, except the
notes on `window.storage` and the bottom-sheet close behavior, which now live in
`app/js/store.js` and `app/js/views/map.js`.)

**Original file:** `bjj-flow-map.html`
**Fonts:** Oswald (display/headers) + JetBrains Mono (body/UI), loaded from Google Fonts via `<link>`

## What this is

An interactive reference map of a BJJ match: positions (nodes) connected by passes,
sweeps, escapes, and transitions (edges), plus submissions available from each
position with step-by-step basics. Three views, toggled by tabs in the header
(the third, **My Game**, is a self-rating tracker with a radar chart and a
"Practice next" list):

1. **Map** — SVG node-link diagram. Click a position to open a side panel (bottom
   sheet on mobile) with its description, submissions (expandable steps), submission
   chains (if any), and every way in/out. Sweep entries in "Ways out" have their own
   chevron toggle for step basics, separate from the row's tap-to-navigate behavior.
   Filter buttons dim edges by type.
2. **Glossary** — flat, searchable, alphabetized lookup of every submission, pass,
   sweep, escape, and transition in the dataset, grouped into sections with counts.
   Search matches technique names AND position names (e.g. "mount" surfaces every
   technique connected to Mount).

## Current content inventory

- **13 positions:** Standing, Closed Guard, Butterfly Guard, Open Guard, Half Guard,
  50/50 Guard, Turtle, Side Control, North-South, Knee on Belly, Mount, Back Control,
  Crucifix
- **44 edges** across 4 types: pass, sweep, escape, transition
- **19 unique submissions**, each with 3–4 step basics in `SUB_STEPS`
- **7 unique sweeps**, each with 3–4 step basics in `SWEEP_STEPS`
- **5 submission chains** (closed guard, mount, back control, side control, 50/50) —
  sequential re-attacks triggered by a defensive reaction, without leaving the position

## Data model (all defined inline in the `<script>` block)

### `POSITIONS` — array of position nodes
```js
{
  id: 'closedguard',        // unique key, used everywhere as a foreign key
  name: 'Closed Guard',     // display name
  sub: 'bottom',            // small caption under the name on the node
  adv: 'bottom',            // 'top' | 'bottom' | 'neutral' — controls node border color
  x: 190, y: 230,           // SVG coordinates (viewBox is 0 0 1360 900)
  w: 165, h: 56,            // node box size
  desc: '...',              // shown in the side panel header
  subs: ['Armbar', 'Triangle choke', 'Kimura', 'Guillotine']  // submission names
}
```
`subs` entries can include a parenthetical variant suffix, e.g. `'D'Arce (off sprawl)'`
or `'Guillotine (off sprawl)'`. These resolve to the base technique's steps via
`getSteps()` / `canonicalSubName()`, which strip a trailing parenthetical before
looking up `SUB_STEPS`. This lets the same core technique show up contextually under
different names without duplicating the step data.

Two rules on top of that:
- **A trailing `(gi)` is never stripped.** It marks a gi-only technique, so
  `'Clock choke (gi)'` is its own canonical name and its own `SUB_STEPS` key.
- **A variant with its own `SUB_STEPS` key keeps its steps.** E.g.
  `'Rear naked choke (one arm free)'` is grouped under Rear naked choke in the Glossary
  and My Game, but shown as a separate "Variant" block with its own steps
  (`entry.variants`, rendered by `subDetailHtml()`).

Every submission named in a `CHAINS` entry should also appear in that position's `subs`.

### `EDGES` — array of directed connections between positions
```js
{ from: 'closedguard', to: 'sidecontrol', type: 'pass', label: 'Guard pass' }
```
`type` is one of `pass | sweep | escape | transition` — this drives edge color, the
filter buttons, and the Glossary's section grouping. `label` is the human-readable
technique/action name shown in the panel and Glossary (and used as the Glossary
dedup key — see Known Quirks below).

### `CHAINS` — array of submission-chain sequences, keyed by position
```js
{
  position: 'closedguard',
  note: 'Classic guard attack sequence',
  steps: [
    { sub: 'Armbar', trigger: 'Opponent posts up (hitchhiker grip)' },
    { sub: 'Triangle choke', trigger: 'Opponent stacks / defends the arm' },
    { sub: 'Omoplata', trigger: 'Opponent postures out of the triangle' },
  ]
}
```
Only positions with a matching entry show a "Submission chain" section in the panel.

### `SUB_STEPS` — dictionary of technique basics, keyed by canonical submission name
```js
'Armbar': [
  'Isolate one arm and control the wrist with both hands.',
  'Swing a leg over the head so the opponent's arm is trapped between your thighs.',
  'Squeeze your knees together and pinch the elbow to your chest.',
  'Lift your hips while pulling the wrist down to hyperextend the elbow.'
]
```
Position-independent — same steps regardless of where the submission is attacked from.

### `SWEEP_STEPS` — dictionary of sweep basics, keyed by the edge `label` used in `EDGES`
```js
'Butterfly sweep': [
  'From butterfly guard, sit chest to chest and get a deep hook under one of their thighs.',
  'Control one arm at the wrist and hook or hug behind their same-side tricep or back with the other.',
  'Load their weight onto the hooking leg by pulling with your upper body toward that side.',
  'Elevate hard with the hook, lifting their base leg off the mat, and follow their fall over the top into mount.'
]
```
Covers all 7 unique sweep labels in `EDGES` (Scissor / hip-bump sweep, Butterfly
sweep, Hook sweep to back, Flower / X-guard sweep, Berimbolo, Old-school sweep,
Waiter sweep). Unlike `SUB_STEPS`, there's no canonicalization step — the lookup key
is the edge `label` verbatim, since sweep labels aren't reused with parenthetical
variants the way submission names are. Consumed in three places: the Glossary's
sweep entries (`renderEdgeEntry`), the panel's "Ways out" list on the Map (only
sweep-type `conn-item`s get the expandable steps affordance), and the "My Game" tab's
skill detail view.

### Derived/computed data (built once at load, not hand-authored)
- `byId` — `{ [position.id]: position }` lookup map
- `SUB_GLOSSARY` — built by `buildSubGlossary()`: canonicalizes every `subs` entry
  across all positions and collects which positions each submission is available from
- `EDGE_GLOSSARY` — built by `buildEdgeGlossary(type)`: groups edges by `label` within
  a type and collects every `{from, to}` route that label appears on

## Key functions

| Function | Purpose |
|---|---|
| `buildSVG()` | Renders all nodes, edges, arrowheads, and belt-stripe tick marks into the `<svg>`. Called once on load. |
| `edgeAnchor(a, b)` | Computes start/end/control points for a curved edge between two node boxes. |
| `selectNode(id)` / `renderPanel(id)` | Opens the side panel and builds its HTML for a given position. |
| `getSteps(name)` / `canonicalSubName(name)` | Resolves a submission's step list, stripping parenthetical variant suffixes if an exact key isn't found. |
| `applyFilter()` | Dims/undims edges and their tick marks based on the active filter button. |
| `buildSubGlossary()` / `buildEdgeGlossary(type)` | Build the Glossary's data from `POSITIONS`/`EDGES` (see above). |
| `renderGlossary(query)` | Renders the Glossary body, filtered by `query`, grouped into the 5 sections, hiding empty sections. |
| `matchesQuery(entry, q)` | Glossary search predicate — matches on name, and secondarily on position names / route endpoints. |

## Design system (CSS custom properties in `:root`)

```
--bg / --panel / --panel-hi / --line / --ink / --ink-dim   → dark gym theme neutrals
--gold (top control) / --slate (bottom) / --grey (neutral) → node border by advantage
--pass / --sweep / --escape / --transition                 → edge color by type
--sub                                                       → submission accent (tags, chain markers)
```
Edges get small perpendicular "belt-stripe" tick marks along their curve
(`tickLayer` in `buildSVG()`) as a thematic detail — purely decorative, driven by the
same `type` color as the edge.

## Known quirks / things to watch

- **Edge label collisions are intentional.** `buildEdgeGlossary()` groups by `label`,
  so if you add a new edge with a label that already exists (e.g. another `'Stand up'`),
  it will merge into the same Glossary entry with an additional route rather than
  creating a duplicate. This is usually what you want, but be aware when naming labels.
- **`getSteps()` fallback is silent.** If you add a new submission variant name that
  doesn't match any `SUB_STEPS` key even after stripping parens, the panel shows
  "Steps coming soon." instead of erroring. Worth a periodic manual check (see below).
- **My Game ratings use `window.storage`** (Claude artifact storage). Opened as a
  local file, that call fails silently and ratings don't persist between loads.
  `migrateRatingKeys()` moves ratings saved under old keys (gi chokes without the
  `(gi)` suffix) to the current keys.
- **Mobile panel** is a bottom sheet that closes from its × button, a tap on empty
  map space, or Escape (`closePanel()`).
- Layout is **hand-placed**, not force-directed — adding a position means manually
  picking `x`/`y` that doesn't overlap. Canvas `viewBox` is `0 0 1360 900`.

## Validating content after edits

There's no automated test suite (single static HTML file). Node isn't installed on the
dev machine, so the easiest check is to open the page in a browser and paste this
into the DevTools console. Every array should come back empty:

In the app, the data lives in a module, so load it first and then run the check:

```js
const { POSITIONS, EDGES, CHAINS, SWEEP_STEPS, SUB_GLOSSARY, byId, getSteps } = await import('./js/data.js');
({
  missingPanel: POSITIONS.flatMap(p=>p.subs.filter(s=>!getSteps(s)).map(s=>p.id+' -> '+s)),
  missingGlossary: SUB_GLOSSARY.filter(e=>!getSteps(e.name)).map(e=>e.name),
  missingSweep: [...new Set(EDGES.filter(e=>e.type==='sweep').map(e=>e.label))].filter(l=>!SWEEP_STEPS[l]),
  chainGaps: CHAINS.flatMap(c=>c.steps.filter(st=>!byId[c.position].subs.includes(st.sub)).map(st=>c.position+' -> '+st.sub)),
})
```

`missingGlossary` matters separately from `missingPanel`: the panel looks up raw names,
while the Glossary and My Game look up canonical names, so one can pass while the other fails.

## Natural next steps (not yet built)

- **Pass and escape basics** — submissions and sweeps both have step-by-step basics
  now; passes and escapes don't yet. Same pattern would apply: a `PASS_STEPS` /
  `ESCAPE_STEPS` dict keyed by edge label, wired into the Glossary, the panel's
  ways-in/out lists, and My Game.
- **Gi vs. no-gi toggle** — several techniques (bow and arrow, clock choke, Ezekiel)
  are gi-specific; a ruleset filter would let no-gi users hide them.
- **Named open-guard variants** — De La Riva, spider, and X-guard are currently
  folded into one "Open Guard" node; could be split into their own nodes with their
  own submission/sweep menus.
- **Path finder** — highlight the shortest route from any position to Back Control.
- **Deep-linkable state** — currently no URL hash / query param support, so a
  selected position or search query can't be shared via link.

## Priorities (per project owner)

More content (positions, submissions, chains) has consistently been prioritized over
visual polish or new functionality. Default to that when in doubt about where to spend
effort next.
