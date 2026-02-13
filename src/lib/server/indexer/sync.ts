import { eq, and } from 'drizzle-orm';
import type { RepoConfig } from './config.js';
import { getDb } from '../db/connection.js';
import { repo, daily, commitStats } from '../db/schema.js';
import { fetchCommits, type CommitNode } from '../github/client.js';

function daysAgo(n: number): string {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() - n);
	return d.toISOString();
}

type SyncMode = 'backfill' | 'full';

interface DailyAggregate {
	commits: number;
	additions: number;
	deletions: number;
	filesChanged: number;
}

export interface SyncRepoOptions {
	verbose?: boolean;
	backfillDays?: number;
	mode?: SyncMode;
}

function aggregateByDay(commits: CommitNode[]): Map<string, DailyAggregate> {
	const map = new Map<string, DailyAggregate>();
	for (const commit of commits) {
		const day = commit.committedDate.slice(0, 10); // YYYY-MM-DD
		const existing = map.get(day) ?? { commits: 0, additions: 0, deletions: 0, filesChanged: 0 };
		existing.commits += 1;
		existing.additions += commit.additions;
		existing.deletions += commit.deletions;
		existing.filesChanged += commit.changedFilesIfAvailable ?? 0;
		map.set(day, existing);
	}
	return map;
}

export async function syncRepo(repoConfig: RepoConfig, options: SyncRepoOptions = {}) {
	const db = getDb();
	const { owner, name } = repoConfig;
	const verbose = options.verbose ?? false;
	const backfillDays = options.backfillDays ?? 30;
	const mode = options.mode ?? 'backfill';

	if (verbose) {
		console.log(`\n[${owner}/${name}] Starting sync...`);
	}

	// Ensure repo exists in DB
	let repoRow = db
		.select()
		.from(repo)
		.where(and(eq(repo.owner, owner), eq(repo.name, name)))
		.get();

	if (!repoRow) {
		const createdAt = new Date().toISOString();
		const result = db
			.insert(repo)
			.values({ owner, name, createdAt })
			.run();
		const insertedId = Number(result.lastInsertRowid);
		repoRow = db.select().from(repo).where(eq(repo.id, insertedId)).get();
		if (!repoRow) {
			throw new Error(`Failed to create repo row for ${owner}/${name}`);
		}
		if (verbose) {
			console.log(`[${owner}/${name}] Created new repo entry (id: ${repoRow.id})`);
		}
	}

	// Determine sync window: full history or incremental+backfill
	const backfillDate = daysAgo(backfillDays);
	const sinceDate: string | null =
		mode === 'full'
			? null
			: repoRow.lastSyncAt && repoRow.lastSyncAt < backfillDate
				? repoRow.lastSyncAt
				: backfillDate;

	if (verbose) {
		if (mode === 'full') {
			console.log(`[${owner}/${name}] Fetching full commit history...`);
		} else {
			const syncStart = sinceDate ?? backfillDate;
			console.log(
				`[${owner}/${name}] Fetching commits since ${syncStart.slice(0, 10)} (backfill: ${backfillDays} days)...`
			);
		}
	}

	// Fetch commits from GitHub
	let commits: CommitNode[];
	try {
		commits = await fetchCommits(owner, name, sinceDate);
	} catch (error) {
		console.error(`[${owner}/${name}] Failed to fetch commits:`, error);
		return;
	}

	if (verbose) {
		console.log(`[${owner}/${name}] Fetched ${commits.length} commits`);
	}

	// Aggregate by day
	const dailyMap = aggregateByDay(commits);

	if (verbose) {
		console.log(`[${owner}/${name}] Aggregated into ${dailyMap.size} days`);
	}

	// In full mode, replace stats for the repo to avoid stale rows.
	if (mode === 'full') {
		db.delete(commitStats).where(eq(commitStats.repoId, repoRow.id)).run();
		db.delete(daily).where(eq(daily.repoId, repoRow.id)).run();
	}

	// Upsert into commit_stats table
	for (const commit of commits) {
		db.insert(commitStats)
			.values({
				repoId: repoRow.id,
				sha: commit.oid,
				committedAt: commit.committedDate,
				day: commit.committedDate.slice(0, 10),
				message: commit.messageHeadline,
				additions: commit.additions,
				deletions: commit.deletions,
				filesChanged: commit.changedFilesIfAvailable ?? 0
			})
			.onConflictDoUpdate({
				target: [commitStats.repoId, commitStats.sha],
				set: {
					committedAt: commit.committedDate,
					day: commit.committedDate.slice(0, 10),
					message: commit.messageHeadline,
					additions: commit.additions,
					deletions: commit.deletions,
					filesChanged: commit.changedFilesIfAvailable ?? 0
				}
			})
			.run();
	}

	// Upsert into daily table
	for (const [day, values] of dailyMap) {
		db.insert(daily)
			.values({
				repoId: repoRow.id,
				day,
				commits: values.commits,
				additions: values.additions,
				deletions: values.deletions,
				filesChanged: values.filesChanged
			})
			.onConflictDoUpdate({
				target: [daily.repoId, daily.day],
				set: {
					commits: values.commits,
					additions: values.additions,
					deletions: values.deletions,
					filesChanged: values.filesChanged
				}
			})
			.run();
	}

	// Update last_sync_at
	db.update(repo)
		.set({ lastSyncAt: new Date().toISOString() })
		.where(eq(repo.id, repoRow.id))
		.run();

	if (verbose) {
		console.log(`[${owner}/${name}] ✓ Sync complete`);
	}
}
