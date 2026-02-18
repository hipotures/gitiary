# gitiary

Personal dashboard for visualizing GitHub commit activity across multiple repositories.

## Features

- Repository overview with `7d/30d/90d/180d/360d/all` selectors
- Detailed repository pages (daily chart + calendar heatmap)
- Cross-repository comparison (regularity, streaks, gaps)
- Impact analytics (additions, deletions, files changed, largest commits)
- Story view with narrative highlights
- Settings UI for repository sync/activation and display names
- Automated section screenshot generation for all pages and date ranges

## Stack

- TypeScript
- SvelteKit + Vite
- SQLite + Drizzle ORM
- Apache ECharts
- GitHub CLI (`gh`) for GitHub API access

## Prerequisites

- Node.js 22 LTS
- GitHub CLI authenticated (`gh auth status`)

## Quick Start

```bash
# Clone repository
git clone git@github.com:hipotures/gitiary.git
cd gitiary

# Install dependencies
npm install

# Optional: create local env file
cp .env.example .env

# Initialize/update SQLite schema
npx drizzle-kit push

# Start app
npm run dev
```

Open `http://localhost:5173/settings` and then:

1. Click **Sync with GitHub** (imports repositories into local DB as inactive).
2. Activate repositories you want to track.
3. Run per-repo sync from Settings (30d or full), or use CLI sync.

## Repository Source of Truth

Repository configuration is stored in SQLite table `repo`.

- Indexer reads active repositories from DB (`repo.is_active = 1`).
- `/api/repos/sync` and `/settings` populate/update repository records.
- `repos.json` is not used by the runtime indexer path.

## CLI Usage

### Development

```bash
npm run dev
```

### Indexer

```bash
# Sync all active repositories (default: backfill 30 days)
npm run index

# Sync specific active repo
npm run index -- --repo owner/name

# Verbose mode
npm run index -- --verbose

# Custom backfill window
npm run index -- --backfill-days 365

# Full history sync
npm run index -- --full-history

# Full-history metrics rebuild
npm run reindex:metrics
```

### Indexer Flags

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--repo`, `-r` | `owner/name` | all active repos | Sync one repository (must already exist and be active in DB) |
| `--verbose`, `-v` | boolean | `false` | Verbose logs |
| `--backfill-days` | integer | `30` | Backfill window for incremental mode |
| `--full-history` | boolean | `false` | Full history mode (replaces stored daily and commit stats for repo) |

## Date Range Semantics

The global date selector supports: `7`, `30`, `90`, `180`, `360`, `all`.

Important behavior:

- `Impact` truly supports all listed ranges from full `impactData`.
- `Compare` and `Story` server loaders fetch `360` days and then filter client-side, so `all` is effectively bounded by the loaded dataset in those views.

## API

Full API documentation (routes, request/response, error codes, examples):

- `docs/api.md`

## Static Export

```bash
# Optional JSON snapshot export (not required by runtime pages)
npm run snapshot

# Build static output
npm run build

# Preview output
npm run preview
```

Notes:

- Build output is generated in `build/`.
- `snapshot` writes `static/snapshot.json` for offline/export workflows.
- Settings page and mutating API routes are server-only (`prerender = false`) and are not available on pure static hosting.

## Screenshot Automation

Generate screenshots for every marked section across all ranges:

```bash
node --import tsx scripts/capture-sections.ts
```

Guide and CLI options:

- `docs/screenshots.md`

## Configuration

### Environment Variables

`.env` (optional):

```env
DATABASE_PATH=./data/diary.db
```

### Database Schema

- `repo`: repository metadata and active/sync state
- `daily`: daily aggregated commit counts and impact metrics
- `commit_stats`: commit-level metrics (`sha`, message, additions/deletions/files changed)
- `metadata`: internal key-value metadata (for example `lastGithubSync`)

## Validation and Tests

```bash
npm run check
npm run test
npm run test:coverage
npm run build
```

Current automated tests cover:

- Domain logic (`src/lib/domain/*.test.ts`)
- Selected DB behavior (`src/lib/server/db/queries.test.ts`)

## Security Notes

By default, API endpoints are unauthenticated.

- Do not expose this app directly to untrusted networks without access controls.
- Protect mutating routes (`/api/repos/sync`, `/api/repos/:id`, `/api/repos/:id/sync`) behind reverse proxy auth, VPN, or private network.

## Troubleshooting

### No repositories are synced by CLI

Cause: no active repositories in DB.

Fix:

1. Open `/settings`.
2. Sync from GitHub.
3. Mark repositories as active.
4. Run `npm run index` again.

### GitHub sync fails

Check GitHub CLI auth:

```bash
gh auth status
```

### Static build fails with prerender/searchParams error

If you see errors about `url.searchParams` during prerender:

- check components/routes that access query params in prerendered pages,
- or limit those routes from prerendering.

### Playwright browser missing for screenshot script

```bash
npm install -D playwright
npx playwright install chromium
```

## Optional Python Helper Scripts

The repository also includes local helper scripts:

- `scripts/commit-stats.py`
- `scripts/commit-stats-detailed.py`

Notes:

- They are optional and not part of the main app runtime.
- They use `gh api` and target a hardcoded repository path in the script.
- They require Python dependencies (for example `rich`) in your local environment.

## Systemd Automation

Run indexer every 6 hours:

```bash
sudo cp systemd/gitiary-indexer.service /etc/systemd/system/
sudo cp systemd/gitiary-indexer.timer /etc/systemd/system/
sudo systemctl enable --now gitiary-indexer.timer
systemctl status gitiary-indexer.timer
sudo journalctl -u gitiary-indexer -f
```

If needed, adjust `WorkingDirectory` in `systemd/gitiary-indexer.service` before enabling.

## Project Structure

```text
gitiary/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/           # Schema, connection, queries
│   │   │   ├── github/       # GitHub API client
│   │   │   └── indexer/      # CLI sync logic
│   │   ├── domain/           # Pure domain functions
│   │   └── components/       # Svelte components
│   └── routes/               # UI pages + API routes
├── scripts/                  # Seed/snapshot/screenshots/helpers
├── drizzle/                  # SQL migrations
├── docs/                     # Project documentation
└── systemd/                  # Service + timer units
```

## License

CC0 1.0 Universal (Public Domain)
