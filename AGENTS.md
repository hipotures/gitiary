# AGENTS.md

BEZWZGLEDNY ZAKAZ MODYFIKACJI pliku package.json bez wyrażnego polecenia. ZAKAZ!!!!!!!!!!!

Instructions for agents working in the `gitiary` repository.

## Mandatory Rules

1. Do not change the application version number in `package.json` without explicit user permission.
   - This is a hard-stop rule: no bump, downgrade, restore, or normalization of `version` unless the user explicitly asks for that exact change.
   - If there is any ambiguity, ask first and do not edit `package.json`.
2. Documentation and code must be written in English only.

## Scope

- Maintain and extend the commit analytics dashboard (SvelteKit + SQLite + Drizzle).
- Deliver changes end-to-end: implementation, migration (if needed), and validation.

## Safety Rules

- Do not revert or overwrite user changes unless explicitly requested.
- Do not run destructive git commands (`reset --hard`, `checkout --`) without permission.
- Keep changes minimal and consistent with existing project patterns.

## Workflow

1. Gather context (`rg`, file reads, `git status`).
2. Implement code changes.
3. If schema changes are required:
   - create/update Drizzle migration,
   - update sync/indexer paths that populate new fields.
4. Validate:
   - `npm run check`
   - `npm run test` when domain/API logic is touched.
5. Report what changed and any follow-up steps.

## Project Commands

- Dev server: `npm run dev`
- Static checks: `npm run check`
- Tests: `npm run test`
- Incremental sync: `npm run index -- --verbose`
- Full-history sync: `npm run index -- --full-history`
- Metrics reindex: `npm run reindex:metrics`
- Apply DB schema: `npx drizzle-kit push`

## Code Areas

- DB/schema/queries: `src/lib/server/db/`
- GitHub sync/indexer: `src/lib/server/indexer/`, `src/lib/server/github/`
- Domain logic: `src/lib/domain/`
- UI/routes: `src/routes/`
