import { eq, and } from 'drizzle-orm';
import type { RepoConfig } from './config.js';
import { getDb } from '../db/connection.js';
import { repo, daily } from '../db/schema.js';
import { fetchCommits, type CommitNode } from '../github/client.js';

function daysAgo(n: number): string {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() - n);
	return d.toISOString();
}

function aggregateByDay(commits: CommitNode[]): Map<string, number> {
	const map = new Map<string, number>();
	for (const commit of commits) {
		const day = commit.committedDate.slice(0, 10); // YYYY-MM-DD
		map.set(day, (map.get(day) || 0) + 1);
	}
	return map;
}

export async function syncRepo(repoConfig: RepoConfig, verbose: boolean = false) {
	const db = getDb();
	const { owner, name } = repoConfig;

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
		const result = db
			.insert(repo)
			.values({ owner, name, createdAt: new Date().toISOString() })
			.run();
		repoRow = { id: Number(result.lastInsertRowid), owner, name, lastSyncAt: null, createdAt: new Date().toISOString() };
		if (verbose) {
			console.log(`[${owner}/${name}] Created new repo entry (id: ${repoRow.id})`);
		}
	}

	// Determine sync window: incremental + 30-day backfill
	const backfillDate = daysAgo(30);
	const sinceDate = repoRow.lastSyncAt && repoRow.lastSyncAt < backfillDate ? repoRow.lastSyncAt : backfillDate;

	if (verbose) {
		console.log(`[${owner}/${name}] Fetching commits since ${sinceDate.slice(0, 10)}...`);
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

	// Upsert into daily table
	for (const [day, count] of dailyMap) {
		db.insert(daily)
			.values({ repoId: repoRow.id, day, commits: count })
			.onConflictDoUpdate({
				target: [daily.repoId, daily.day],
				set: { commits: count }
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
