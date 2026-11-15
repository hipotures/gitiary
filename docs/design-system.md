# Shared design system (pilot)

Gitiary takes its shared visual foundation from the Intelitex design system: plain CSS with tokens, dark and light
themes and opt-in `ds-` primitives. There is no framework, no JavaScript and no build step. This document covers
where it comes from, how it is wired in, what uses it so far and how the pilot was verified.

## Source and version pin

- **Location:** `vendor/design-system/`, added with `git subtree` as a single squashed commit. It is not an npm
  dependency, and `package.json` is unchanged.
- **Version:** 0.1.0, tag `design-system-v0.1.0`.
- **Pin:** split commit `1a474ec2586b5ae7badfce1a26bd4874a8520185`, recorded as `git-subtree-split` in the subtree
  merge. It is the split of Intelitex commit `f0d0afa` (branch `feat/design-system-foundation`, folder
  `web/design-system`).
- **Temporary source:** the tag exists only in a local Intelitex clone. It has not been pushed and there is no
  separate repository yet; both are pending a decision. Until then, recreate the tag from Intelitex. The split is
  deterministic, so the same commit always gives the same hash:

  ```sh
  # in Intelitex
  git subtree split --prefix=web/design-system f0d0afa   # prints 1a474ec…
  git tag design-system-v0.1.0 1a474ec2586b5ae7badfce1a26bd4874a8520185
  ```

**Updating:** never edit `vendor/design-system/` here; changes go to Intelitex first. Then tag the new split there
and pull it:

```sh
git subtree pull --prefix=vendor/design-system <path-or-url-of-intelitex> design-system-vX.Y.Z --squash
```

Read `vendor/design-system/CHANGELOG.md` for breaking changes, then re-run the checks below.

## Wiring

- **`src/design-system.css`** is imported in `src/routes/+layout.svelte` before `app.css`. It does three things:
  - imports `vendor/design-system/ds.css`; Vite inlines its `@import`s into the app bundle;
  - sets the brand accent through the documented hooks (`--ds-accent-dark`, `--ds-accent-light` and their `-soft`
    variants), so the primitives use Gitiary's blue (`#58a6ff` dark, `#0969da` light);
  - works around the collisions and missing capabilities listed below.
- **Themes:** Gitiary already sets `<html data-theme="dark|light">` (`src/app.html`, `src/lib/stores/theme.ts`),
  which is exactly the design system's theme contract. No extra theme code is needed.
- **Tokens:** Gitiary's own tokens (`--color-*`, `--space-*`, `--radius`, `--font-*`) do not overlap with the design
  system's (`--bg`, `--panel`, `--line`, `--text*`, `--accent*`, status colors and `--ds-*`). Unmigrated code keeps
  using the Gitiary tokens.

## Components on the design system

| Where | Element | Primitive |
| --- | --- | --- |
| Settings | the five section cards | `.ds-panel` with `.ds-panel-head`, `.ds-panel-title`, `.ds-panel-body`; each `<section>` is labelled by its title |
| Settings, Appearance | Dark / Light theme choice | `.ds-segmented`: `role="group"` labelled "Theme", `<button type="button" aria-pressed>` bound to the `theme` store |
| Settings, Fork Filtering | Save | `.ds-btn .ds-btn-primary .ds-btn-compact` |
| Settings, Branch Tracking | Default branch input | `.ds-field` (the label stays in the description column, linked with `for`) |
| Settings, Branch Tracking | Save | `.ds-btn .ds-btn-primary .ds-btn-compact` |
| Settings, Repository Management | Sync with GitHub | `.ds-btn .ds-btn-primary` |
| Settings, delete dialog | Cancel / Delete | `.ds-btn` (secondary) and `.ds-btn .ds-btn-danger` |
| Settings, display-name dialog | Cancel / Save | `.ds-btn` (secondary) and `.ds-btn .ds-btn-primary` |
| Repository page header | fork and extra-branch indicators | `.ds-badge` with `data-tone="accent"` for Fork, neutral for Extra branches |

Event handlers, stores, API calls and routing are unchanged. Everything else in the app still uses Gitiary's own
styles, for example:

- the nav and the theme toggle;
- the selects and textarea on Settings;
- the repository rows and their icon actions;
- the repository cards on the home page;
- the charts, tables and the other pages.

## Intentional visual differences

Before and after images are in `docs/design-system/before/` and `docs/design-system/after/`, with the same file
names.

- **Settings cards:**
  - the design-system panel has a header strip with a divider and a smaller bold title (14px instead of 16px);
  - the body padding is tighter (14/15px instead of 24px);
  - the radius is 12px instead of 6px.
- **Theme choice:** a compact segmented control replaces two bordered buttons. The selected option is a filled
  segment instead of an accent border.
- **Buttons:**
  - 9px radius, bold labels;
  - the primary hover is a slight lift plus brightening; Gitiary's was a fade;
  - disabled buttons drop to 45% opacity (was 60%);
  - the danger button is a tinted outline instead of solid red;
  - the secondary button uses the design-system panel color.
- **Default branch field:** the design-system field look (8px radius, 1px line, inset panel color) replaces the
  2px-border input.
- **Repository badges:** labelled pills ("Fork", "Extra branches") with an icon replace the icon-only squares.
  Screen readers now get a text label; before, the icons were hidden from them and had no label.
- **Settings on narrow screens:** each row now wraps, so its controls sit below the description. `.ds-panel`
  clips overflow; without the wrap, the sort selects would have been cut off instead of spilling out of the card as
  they did before.

## Collisions found

- **`app.css` gives every `h2` a bottom margin.** The design system's resets have zero specificity, so that rule
  beat the panel title's `margin:0`. Fixed in `src/design-system.css` with `.ds-panel-title { margin: 0 }`.
- **`color-scheme` is now set on the root element** (`dark` or `light`, following `data-theme`). Native popups, form
  control internals and scrollbars follow the theme. Before, they were always light. It is the only global effect
  of `ds.css`. All 24 screenshots of unrelated screens are pixel-identical to before.
- **Gitiary's global reset** (`* { margin:0; padding:0 }`) and its `.badge` and `.card` classes do not collide; the
  primitives set their own padding at class weight.

## Missing in the design system (worked around in `src/design-system.css`)

- **Control font size.** Buttons and fields inherit the page font size, and Gitiary's body is 16px. A zero-specificity
  rule sets them to `--ds-text-base` (14px). A token or hook such as `--ds-control-font-size` would remove this.
- **Icon plus label layout.** Buttons, segmented options and badges do not lay out an icon next to text.
  `:has(> svg)` adds `inline-flex` and a gap. A documented icon slot would remove this.
- **Panel overflow.** `.ds-panel` clips overflow, which is a problem for responsive rows inside it. There is no
  `overflow: visible` variant.
- **Not available yet:** a select, textarea or checkbox list styled as one control family outside `.ds-field`, a
  modal or dialog primitive, and a neutral or warning badge tone (only accent, success and danger).

## Verification

**Static checks and tests:**

```sh
npm run check   # 0 errors; 22 warnings, the same set as before the pilot
npm run test    # 3 files, 22 tests
npm run build   # client and server bundles compile; prerender then fails, exactly as on main (see below)
```

`npm run build` fails during prerendering on `main` too. `src/routes/+layout.svelte` reads `url.searchParams`
(capture mode) on prerendered pages. The pilot does not change this.

**Browser checks.** These need a running `vite dev` and seeded data (`npm run seed`). Playwright, pngjs and pixelmatch
come from another install, so Gitiary's dependencies stay unchanged:

```sh
export DS_TOOLS_NODE_MODULES=/path/to/node_modules GITIARY_URL=http://127.0.0.1:5299
node scripts/design-system-pilot.mjs capture <dir>          # 7 pages and 7 crops × dark/light × desktop/mobile
node scripts/design-system-pilot.mjs compare <before> <after>
node scripts/design-system-pilot.mjs verify                 # 43 checks
```

`verify` covers:

- **Theme switching:**
  - from the segmented control and from the nav toggle;
  - `aria-pressed` follows the store, and `localStorage` and `color-scheme` update;
  - panel tokens and the accent change per theme.
- **Keyboard:**
  - every migrated control is reachable by Tab and shows the 2px accent focus ring in both themes;
  - Space activates a theme option.
- **Field binding:** `bind:value` reaches the save request.
- **Disabled state while saving:** 45% opacity, `not-allowed` cursor, and hover does not restyle it.
- **Dialogs:** both dialog flows.
- **Badges:** text labels and tones.
- **Layout:** no migrated control overflows its panel at 1280px or 390px.

Every request that would write is intercepted, so the database is never changed.

## Before a wider rollout

1. **Decide the distribution home:** push the `design-system-v*` tags to Intelitex, or create a separate private
   repository. The pin then becomes fetchable from any machine.
2. **Add the missing capabilities to the design system,** in Intelitex, with its own tests:
   - a control font size;
   - icon slots;
   - an `overflow: visible` panel variant;
   - neutral and warning badge tones;
   - a dialog primitive;
   - styled selects and textareas outside `.ds-field`.

   Then drop the matching workarounds here.
3. **Migrate the remaining Settings controls,** so the page is consistent:
   - the selects, textarea and display-name input;
   - the repository rows and their icon actions;
   - the version chip.
4. **Decide the palette:** map or retire the `--color-*` tokens, so the rest of the app moves to the shared palette
   instead of mixing it with GitHub's grays.
5. **Then the other screens:**
   - nav and theme toggle (`.ds-icon-btn`), date-range select;
   - home cards and sort controls (`.ds-segmented`);
   - the tables (`.ds-table`) and impact pagination.
6. **Fix the existing narrow-screen overflow of the nav,** which predates the pilot.
