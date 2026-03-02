import { eq, and } from 'drizzle-orm';
import type { RepoConfig } from './config.js';
import { getDb } from '../db/connection.js';
import { repo, daily, commitStats } from '../db/schema.js';
import { fetchCommits, type CommitNode } from '../github/client.js';
import { getAuthorEmails } from '../db/queries.js';

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

export interface SyncRepoResult {
	repoId: number;
	owner: string;
	name: string;
	mode: SyncMode;
	fetchedCommits: number;
	upsertedDailyRows: number;
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

	// Determine author email filter for forks
	let authorEmails: string[] | undefined;
	if (repoRow.isFork) {
		authorEmails = getAuthorEmails();
		if (authorEmails.length === 0) {
			console.warn(
				`[${owner}/${name}] Fork repo but no author emails configured — syncing unfiltered`
			);
			authorEmails = undefined;
		} else if (verbose) {
			console.log(`[${owner}/${name}] Filtering by author emails: ${authorEmails.join(', ')}`);
		}
	}

	// Fetch commits from GitHub
	let commits: CommitNode[];
	try {
		commits = await fetchCommits(owner, name, sinceDate, authorEmails);
	} catch (error) {
		console.error(`[${owner}/${name}] Failed to fetch commits:`, error);
		throw new Error(`[${owner}/${name}] Failed to fetch commits`, { cause: error });
	}

	if (verbose) {
		console.log(`[${owner}/${name}] Fetched ${commits.length} commits`);
	}

	// Aggregate by day
	const dailyMap = aggregateByDay(commits);

	if (verbose) {
		console.log(`[${owner}/${name}] Aggregated into ${dailyMap.size} days`);
	}

	const syncedAt = new Date().toISOString();
	try {
		db.transaction((tx) => {
			// Full history mode replaces existing metrics atomically.
			if (mode === 'full') {
				tx.delete(commitStats).where(eq(commitStats.repoId, repoRow.id)).run();
				tx.delete(daily).where(eq(daily.repoId, repoRow.id)).run();
			}

			// Upsert into commit_stats table
			for (const commit of commits) {
				tx.insert(commitStats)
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
				tx.insert(daily)
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

			tx.update(repo).set({ lastSyncAt: syncedAt }).where(eq(repo.id, repoRow.id)).run();
		});
	} catch (error) {
		throw new Error(`[${owner}/${name}] Failed to persist sync data`, { cause: error });
	}

	if (verbose) {
		console.log(`[${owner}/${name}] ✓ Sync complete`);
	}

	return {
		repoId: repoRow.id,
		owner,
		name,
		mode,
		fetchedCommits: commits.length,
		upsertedDailyRows: dailyMap.size
	} satisfies SyncRepoResult;
}
