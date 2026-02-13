# git-diary

Personal build diary visualizing commit activity across GitHub repositories.

## Features

- **Repository overview** - Track commits across multiple repos with 7/30/90-day statistics
- **Detailed views** - Daily time-series charts and GitHub-style calendar heatmaps
- **Comparisons** - Cross-repo rankings with regularity, streaks, and gaps analysis
- **Impact analytics** - Track lines added/deleted, files changed, top days, and largest commits
- **Story views** - Narrative summaries highlighting exceptional activity
- **Static export** - Generate fully static HTML site for hosting anywhere
- **Incremental sync** - Efficient GitHub GraphQL indexer with configurable backfill (default: 30 days)

## Stack

- **TypeScript** - Type-safe codebase
- **SvelteKit** - SSR framework with static export
- **SQLite + Drizzle ORM** - Local commit cache
- **Apache ECharts** - Interactive charts and heatmaps
- **GitHub CLI (`gh`)** - Authenticated API access

## Installation

### Prerequisites

- Node.js 22 LTS
- GitHub CLI authenticated: `gh auth status`

### Setup

```bash
# Clone repository
git clone git@github.com:hipotures/git-diary.git
cd git-diary

# Install dependencies
npm install

# Initialize database
npx drizzle-kit push

# Configure repositories (edit repos.json)
cat > repos.json << 'EOF'
{
  "repos": [
    { "owner": "your-username", "name": "repo-name" }
  ]
}
EOF

# Seed with initial data
npm run index -- --verbose
```

## Usage

### Development Server

```bash
npm run dev
```

Open http://localhost:5173

### Indexer CLI

```bash
# Sync all repositories (default: last 30 days)
npm run index

# Sync specific repo
npm run index -- --repo owner/name

# Verbose output
npm run index -- --verbose

# Custom backfill period (e.g., 365 days for full year)
npm run index -- --backfill-days 365

# Full-history sync with commit-level metrics
npm run index -- --full-history

# Combine options
npm run index -- --repo owner/name --backfill-days 90 --verbose

# One-shot reindex for additions/deletions/files_changed
npm run reindex:metrics
```

### Static Export

```bash
# Sync data
npm run index

# Generate snapshot
npm run snapshot

# Build static site
npm run build

# Preview
cd build && python -m http.server 8000
```

Static site is in `build/` - deploy anywhere (Netlify, Vercel, GitHub Pages, etc.)

## Systemd Automation

Run indexer automatically every 6 hours:

```bash
# Copy service files
sudo cp systemd/git-diary-indexer.service /etc/systemd/system/
sudo cp systemd/git-diary-indexer.timer /etc/systemd/system/

# Edit service file to match your installation path
sudo systemctl edit git-diary-indexer.service

# Enable and start timer
sudo systemctl enable --now git-diary-indexer.timer

# Check status
systemctl status git-diary-indexer.timer
sudo journalctl -u git-diary-indexer -f
```

Or use cron:

```cron
0 */6 * * * cd /home/xai/DEV/git-diary && npm run index
```

## Configuration

### repos.json

```json
{
  "repos": [
    { "owner": "owner1", "name": "repo1" },
    { "owner": "owner2", "name": "repo2" }
  ]
}
```

### Database

SQLite database at `data/diary.db` (gitignored).

**Schema:**
- `repo` - Repository metadata
- `daily` - Aggregated daily commits (UTC)

### Environment Variables

Optional `.env`:

```env
DATABASE_PATH=./data/diary.db
```

## Architecture

```
GitHub GraphQL API
       │
       v
  [CLI Indexer]  ───>  SQLite
       │                  │
       v                  v
  systemd timer    [SvelteKit SSR] ──> Dev Server
                         │
                         v
                   [adapter-static] ──> Static HTML/JSON
```

**Key principles:**
- Domain logic in pure functions (`src/lib/domain/`)
- All DB queries in `queries.ts`
- ECharts loaded client-side only (`onMount`)
- Static export via prerendering

## Project Structure

```
git-diary/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/           # Schema, connection, queries
│   │   │   ├── github/       # GraphQL client
│   │   │   └── indexer/      # CLI sync logic
│   │   ├── domain/           # Pure functions (stats, rankings)
│   │   └── components/       # Svelte components
│   └── routes/
│       ├── +page.svelte      # Home (repo list)
│       ├── repo/[id]/        # Single repo detail
│       ├── compare/          # Cross-repo comparison
│       ├── story/            # Narrative summaries
│       ├── impact/           # Line/file change analytics
│       └── api/              # JSON endpoints
├── scripts/
│   ├── seed.ts               # Fixture data generator
│   └── generate-snapshot.ts  # Static data export
├── systemd/                  # Service + timer units
└── repos.json                # Repository configuration
```

## License

CC0 1.0 Universal (Public Domain)
