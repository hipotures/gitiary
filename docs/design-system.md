# Shared design system

Gitiary takes its shared visual foundation from the Intelitex design system: plain CSS with tokens, dark and light
themes and opt-in `ds-` primitives. There is no framework, no JavaScript and no build step. This document covers
where it comes from, how it is wired in, what uses it and how it is verified.

## Source and version pin

- **Location:** `vendor/design-system/`, a `git subtree` with squashed updates. It is not an npm dependency, and
  `package.json` is unchanged.
- **Version:** **v0.2.0**, tag `design-system-v0.2.0` on `https://github.com/hipotures/intelitex.git`.
- **Pin:** split commit `40b876a321281e7397deb25e0262f6e90f2fb1b9`, recorded as `git-subtree-split` in the subtree
  merge. It is the split of Intelitex commit `25e364a` (folder `web/design-system`). The vendored tree equals the
  tag's tree.
- **History:**

  | Version | Split | Intelitex commit |
  | --- | --- | --- |
  | v0.1.0 | `1a474ec` | `f0d0afa` |
  | v0.2.0 | `40b876a` | `25e364a` |

  Tags are immutable: a fix is a new version.

**Updating.** Never edit `vendor/design-system/` here. Change the package in Intelitex, release a new tag there (see
its README, "Distribution"), then pull it:

```sh
git subtree pull --prefix=vendor/design-system https://github.com/hipotures/intelitex.git design-system-vX.Y.Z --squash
git rev-parse HEAD:vendor/design-system   # must equal: git rev-parse 'design-system-vX.Y.Z^{tree}'
```

Read `vendor/design-system/CHANGELOG.md` for breaking changes, then re-run the checks below.

## Wiring

- **`src/design-system.css`** is imported in `src/routes/+layout.svelte` before `app.css`. It does three things:
  - imports `vendor/design-system/ds.css`; Vite inlines its `@import`s into the app bundle;
  - sets the documented hooks:
    - the brand accent (`--ds-accent-dark`, `--ds-accent-light` and their `-soft` variants): `#58a6ff` dark,
      `#0969da` light;
    - `--ds-control-font-size: var(--ds-text-base)`, because Gitiary's body text is 16px and controls are 14px;
  - fixes the one collision that remains (see below).
- **Themes:** Gitiary already sets `<html data-theme="dark|light">` (`src/app.html`, `src/lib/stores/theme.ts`),
  which is exactly the design system's theme contract.
- **Tokens:** Gitiary's own tokens (`--color-*`, `--space-*`, `--radius`, `--font-*`) do not overlap with the design
  system's (`--bg`, `--panel`, `--line`, `--text*`, `--accent*`, status colors and `--ds-*`). Unmigrated code keeps
  using the Gitiary tokens.
- **`src/lib/actions/modal.ts`** (`use:modal={onDismiss}`) opens a `<dialog class="ds-dialog">` with `showModal()`
  while it is mounted:
  - `onDismiss` runs on Esc, the back gesture or a click outside (`closedby="any"`, with a pointer-position fallback
    where `closedby` is missing, i.e. Safari);
  - when the caller unmounts the dialog itself, the action returns focus to the control that opened it.

## Components on the design system (all on Settings unless noted)

| Element | Primitive |
| --- | --- |
| Five section cards | `.ds-panel` with head, title and body; each `<section>` is labelled by its title |
| Theme choice (Dark / Light) | `.ds-segmented`, `role="group"`, `aria-pressed` bound to the `theme` store |
| Save ×2, Sync with GitHub | `.ds-btn .ds-btn-primary` (`-compact` for Save); the icon sits next to the label through the package's icon layout |
| Default branch input | `.ds-field` |
| Sort field, sort direction, Impact page size | `.ds-select` (the sort field now has a real label; the direction select has `aria-label`) |
| Author emails | `.ds-textarea` (Gitiary keeps the monospace font) |
| Version chip | `.ds-badge` (neutral) |
| Repository rows | Row layout stays Gitiary's, colored with the shared tokens; actions are `.ds-icon-btn` (32px) with `aria-label`s |
| Fork marker in a row | `.ds-icon-btn` with `aria-pressed`; the pressed look (accent outline, soft accent fill) is Gitiary's |
| Include toggle in a row | `aria-pressed` and an `aria-label`, plus `.ds-focus-ring` (before, it had no visible focus) |
| Delete and display-name dialogs | Native `<dialog class="ds-dialog">` with `.ds-dialog-title`, `.ds-dialog-actions`; the edit field is a `.ds-field`; Cancel `.ds-btn`, Save `.ds-btn-primary`, Delete `.ds-btn-danger` |
| Repository page header | `.ds-badge` "Fork" (accent tone) and "Extra branches" |

Logic, stores, API calls and routing are unchanged. Not yet on the design system:

- the nav, the theme toggle and the date-range select;
- the home cards and their sort controls;
- the tables and impact pagination;
- the charts and the other pages.

## Intentional visual differences

Images, with the same file names in `before/` and `after/`:

- `docs/design-system/before/`, `after/`: the v0.1.0 pilot;
- `docs/design-system/v0.2.0/before/`, `after/`: completing Settings.

**v0.1.0 pilot:**

- **Cards:**
  - header strip with a divider and a smaller bold title;
  - tighter body padding;
  - 12px radius.
- **Theme choice:** a compact segmented control.
- **Buttons:**
  - 9px radius and bold labels;
  - the primary button lifts on hover;
  - disabled is at 45% opacity;
  - danger is a tinted outline.
- **Default branch field:** the design-system field look.
- **Repository badges:** labelled pills.
- **Narrow screens:** rows wrap so that nothing is clipped by the panel.

**v0.2.0:**

- **Selects and textarea:** 1px line and 8px radius on the inset panel color. They were 2px borders on the page
  background.
- **Version chip:** a pill badge instead of a square chip.
- **Repository row actions:** bordered 32px icon buttons with a hover border, instead of bare icons that grew an
  accent outline on hover. Delete hovers red.
- **Fork marker:** off markers are dimmed through the text color instead of 25% opacity.
- **Include toggle:** checked boxes use the accent.
- **Narrow screens:** row actions wrap below the repository name instead of being cut off.
- **Dialogs:**
  - native modal with the design-system card (12px radius, bold 16px title);
  - the backdrop is a plain dimmer without blur;
  - the edit field has the design-system field label (12px, dimmed, semibold).
- **New dialog behavior:**
  - Esc and the back gesture close the dialog;
  - the page behind is inert;
  - focus starts in the dialog and returns to the opener.

  Click-outside still closes, as before.
- **Side effects of dropping the local workarounds:**
  - the repository-page badges' icon gap is 7px (package default) instead of 6px;
  - Branch Tracking and Repository Management move by sub-pixel amounts because the selects above them changed
    height.

## Collisions and workarounds

- **h2 margin:** `app.css` gives every `h2` a bottom margin. The design system's resets have zero specificity, so
  that rule beats the panel title's `margin: 0`. `src/design-system.css` restores it; this is the only rule left
  there.
- **`color-scheme`:** it is set on the root element (`dark` or `light`, following `data-theme`). Native popups,
  form control internals and scrollbars follow the theme. It is the only global effect of `ds.css`.
- **Removed in v0.2.0:** the font-size override and the icon-layout rule. The package now provides
  `--ds-control-font-size` and the icon layout.

## Verification

**Static checks and tests:**

```sh
npm run check   # 0 errors; 12 warnings (22 before; the overlay <div>s with click handlers are gone)
npm run test    # 3 files, 22 tests
```

**Browser checks.** These need a running `vite dev` with seeded data (`npm run seed`). Playwright, pngjs and
pixelmatch come from another install, so Gitiary's dependencies stay unchanged:

```sh
export DS_TOOLS_NODE_MODULES=/path/to/node_modules GITIARY_URL=http://127.0.0.1:5299
node scripts/design-system-pilot.mjs capture <dir>          # 7 pages and 7 crops × dark/light × desktop/mobile
node scripts/design-system-pilot.mjs compare <before> <after>
node scripts/design-system-pilot.mjs verify                 # 81 checks
```

`verify` covers:

- **Theme switching** from both controls.
- **Keyboard:** Tab reaches every migrated control, including the selects, the textarea, row toggles and row actions,
  and each shows the 2px accent ring in both themes.
- **Control sizes and fonts.**
- **Row state:** `aria-pressed` and accessible names.
- **Field binding** and the disabled state while saving.
- **Dialogs:**
  - named native modal, the page behind inert, initial focus;
  - Esc, click outside and Cancel close without a request;
  - focus returns to the opener;
  - Save and Delete send their requests.
- **Badges.**
- **Layout:** nothing in a migrated panel overflows it at 1280px or 390px.

Every request that would write is intercepted, so the database is never changed. Screenshots outside the migrated
scope are pixel-identical between versions.

## Before a wider rollout

1. **Palette decision:** map or retire the `--color-*` tokens, so the rest of the app moves to the shared palette.
2. **Other screens:**
   - nav and theme toggle (`.ds-icon-btn`), date-range select (`.ds-select`);
   - home cards and sort controls (`.ds-segmented`);
   - tables (`.ds-table`) and impact pagination.
3. **Pressed icon button:** a pressed state for `.ds-icon-btn` (Gitiary's fork marker) could move into the package
   if a second application needs it.
