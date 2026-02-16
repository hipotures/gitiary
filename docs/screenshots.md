# Screenshot Generation Guide

This project includes a fully automated screenshot generator for statistics sections.

The generator:
- starts the app automatically (unless you provide `--base-url`)
- captures all supported time ranges
- captures all supported pages and repo detail pages
- exports section-level PNG files with stable naming
- writes a manifest file with metadata

## Quick Start

From repository root:

```bash
node --import tsx scripts/capture-sections.ts
```

Default output directory:

```text
shots/
```

## What Gets Captured

The script captures all elements marked with:

```text
data-shot-section="..."
```

Current scope includes:
- home page sections
- compare page sections
- story page sections
- heat page sections
- impact page sections
- repo detail page sections for every repository

Heat page is captured per year (for example `heat-year-2025`, `heat-year-2026`).

## Time Ranges

The script captures all ranges:
- `7d`
- `30d`
- `90d`
- `180d`
- `360d`
- `all`

## Output Structure

Single theme:

```text
shots/{range}/{route-key}/{section-id}.png
shots/manifest.json
```

Examples:
- `shots/7d/home/repositories.png`
- `shots/all/impact/top-10-largest-commits.png`
- `shots/all/heat-year-2025/activity-timeline.png`

Both themes (`--theme both`):

```text
shots/{theme}/{range}/{route-key}/{section-id}.png
```

## CLI Options

```bash
node --import tsx scripts/capture-sections.ts [options]
```

Options:
- `--theme <dark|light|both>`: theme mode (default: `dark`)
- `--out-dir <path>`: output directory (default: `shots`)
- `--base-url <url>`: use an already running server
- `--viewport <width>x<height>`: viewport size (default: `1600x1200`)
- `--timeout-ms <number>`: operation timeout (default: `20000`)
- `--section-padding <number>`: outer padding around each section (default: `16`)

## Typical Commands

Generate dark theme screenshots to default folder:

```bash
node --import tsx scripts/capture-sections.ts
```

Generate both themes:

```bash
node --import tsx scripts/capture-sections.ts --theme both
```

Use custom output directory:

```bash
node --import tsx scripts/capture-sections.ts --out-dir /tmp/git-diary-shots
```

Use existing running server:

```bash
node --import tsx scripts/capture-sections.ts --base-url http://127.0.0.1:4173
```

Increase screenshot margin:

```bash
node --import tsx scripts/capture-sections.ts --section-padding 24
```

## Important Behavior

- The output directory is cleared before generation.
- You only need to run one command; no manual clicking is required.
- Header/nav and interactive sorting controls are hidden in capture mode.

## Troubleshooting

### Browser executable is missing

Install Playwright and Chromium:

```bash
npm install -D playwright
npx playwright install chromium
```

### Port conflict on auto-start

If auto-start fails, run app manually and pass `--base-url`.

### A section looks clipped

1. Ensure you are using the latest `scripts/capture-sections.ts`.
2. Regenerate from scratch (default behavior already clears output).
3. Increase `--section-padding` if needed.

## Adding New Sections

To include a new section in automation:

1. Add `data-shot-section="your-stable-id"` to the section container.
2. Optionally add `data-shot-title="Human Title"`.
3. Run the generator again.

No script changes are needed for standard sections.
