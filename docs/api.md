# API Reference

This project exposes JSON endpoints under `/api/*`.

All endpoints are unauthenticated by default.

- Content type: `application/json`
- Error format in many handlers is generated via SvelteKit `error(status, message)`.

## Security

Because mutating endpoints are public inside the app by default, do not expose this API directly to untrusted networks without additional access controls.

Recommended controls:

- reverse-proxy authentication,
- private network/VPN,
- firewall/IP allowlist.

## Endpoints

## `GET /api/repos`

Returns all repositories (active and inactive) from local DB.

### Response 200

```json
[
  {
    "id": 1,
    "owner": "alice",
    "name": "repo-a",
    "displayName": "Repo A",
    "isActive": true,
    "lastSyncAt": "2026-02-16T12:34:56.000Z"
  }
]
```

## `POST /api/repos/sync`

Fetches repositories from GitHub (`viewer.repositories`) and upserts them into local DB.

New repositories are inserted with `isActive = false`.

### Request body

No body required.

### Response 200

```json
{
  "success": true,
  "total": 42,
  "added": 42,
  "skipped": 0
}
```

### Notes

- `added`/`skipped` are implementation-level counters and may not represent true "new vs existing" split.

### Error 500

- GitHub API failure (`gh` command/auth/network)
- local DB failures

## `PATCH /api/repos/:id`

Updates repository fields.

### Request body

```json
{
  "isActive": true,
  "displayName": "My Display Name"
}
```

Both fields are optional.

- `isActive`: boolean
- `displayName`: string or `null` (empty/whitespace becomes `null`)

### Response 200

```json
{
  "success": true,
  "id": 1,
  "isActive": true,
  "displayName": "My Display Name"
}
```

### Errors

- `400`: invalid repository id
- `400`: `displayName` has invalid type
- `404`: repository not found
- `500`: update failure

### Notes

- Current implementation may return the pre-update `isActive` value from the initial DB read.

## `DELETE /api/repos/:id`

Deletes repository and associated `daily` + `commit_stats` records.

### Response 200

```json
{
  "success": true,
  "id": 1,
  "owner": "alice",
  "name": "repo-a"
}
```

### Errors

- `400`: invalid repository id
- `404`: repository not found
- `500`: delete failure

## `POST /api/repos/:id/sync`

Syncs a single repository using indexer logic.

### Request body

```json
{
  "mode": "backfill",
  "backfillDays": 30
}
```

- `mode`: `"full"` or `"backfill"` (default `"backfill"`)
- `backfillDays`: finite number, clamped to non-negative integer (default `30`)

### Response 200

```json
{
  "success": true,
  "owner": "alice",
  "name": "repo-a",
  "mode": "backfill",
  "backfillDays": 30
}
```

### Errors

- `400`: invalid repository id
- `404`: repository not found
- `500`: sync failure

## `GET /api/stats`

Returns comparison stats for repositories.

### Behavior

- Fixed dataset period in handler: `360d`
- Includes streaks, regularity, max gaps, and commit totals

### Response 200 (shape)

```json
{
  "period": "360d",
  "repos": [
    {
      "id": 1,
      "owner": "alice",
      "name": "repo-a",
      "displayName": null,
      "totalCommits": 123,
      "activeDays": 45,
      "regularity": 0.125,
      "maxGap": 10,
      "currentStreak": 3,
      "longestStreak": 9,
      "firstCommitDate": "2025-01-20"
    }
  ]
}
```

## `GET /api/impact?range=...`

Returns impact analytics view.

### Query params

- `range=7|30|90|180|360|all`

Parsing behavior:

- missing `range` -> `all`
- `range=all` -> `all`
- invalid numeric value -> fallback `90`

### Response 200

Returns `ImpactView` object with:

- `summary`
- `dailyRows`
- `topByCommits`
- `topByChanges`
- `topByFiles`
- `largestCommits`
- `repoRows`

See domain type definitions in `src/lib/domain/impact.ts` and `src/lib/domain/types.ts`.
