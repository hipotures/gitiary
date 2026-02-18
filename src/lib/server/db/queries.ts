import { eq, sql, and, gte } from 'drizzle-orm';
import { getDb } from './connection.js';
import { repo, daily, metadata, commitStats } from './schema.js';
import type {
	RepoSummary,
	DailyEntry,
	HeatYearData,
	HeatMonthSection,
	HeatMonthRepoCommits,
	ImpactData
} from '$lib/domain/types.js';

function daysAgo(n: number): string {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() - n);
	return d.toISOString().slice(0, 10);
}

export function getReposWithStats(): RepoSummary[] {
	const db = getDb();
	const repos = db.select().from(repo).where(eq(repo.isActive, true)).all();
	const day7 = daysAgo(7);
	const day30 = daysAgo(30);
	const day90 = daysAgo(90);
	const day180 = daysAgo(180);
	const day360 = daysAgo(360);

	return repos.map((r) => {
		const countSince = (since: string) => {
			const result = db
				.select({ total: sql<number>`coalesce(sum(${daily.commits}), 0)` })
				.from(daily)
				.where(and(eq(daily.repoId, r.id), gte(daily.day, since)))
				.get();
			return result?.total ?? 0;
		};

		const countAll = () => {
			const result = db
				.select({ total: sql<number>`coalesce(sum(${daily.commits}), 0)` })
				.from(daily)
				.where(eq(daily.repoId, r.id))
				.get();
			return result?.total ?? 0;
		};

		const getFirstCommitDate = () => {
			const result = db
				.select({ minDay: sql<string>`MIN(${daily.day})` })
				.from(daily)
				.where(and(eq(daily.repoId, r.id), sql`${daily.commits} > 0`))
				.get();
			return result?.minDay ?? null;
		};

		return {
			id: r.id,
			owner: r.owner,
			name: r.name,
			displayName: r.displayName,
			isFork: r.isFork,
			commits7d: countSince(day7),
			commits30d: countSince(day30),
			commits90d: countSince(day90),
			commits180d: countSince(day180),
			commits360d: countSince(day360),
			commitsAll: countAll(),
			lastSyncAt: r.lastSyncAt,
			firstCommitDate: getFirstCommitDate()
		};
	});
}

export function getRepoById(id: number) {
	const db = getDb();
	return db.select().from(repo).where(eq(repo.id, id)).get();
}

export function getRepoDailyData(repoId: number, days: number | null = 90): DailyEntry[] {
	const db = getDb();
	const baseQuery = db
		.select({ day: daily.day, commits: daily.commits })
		.from(daily)
		.orderBy(daily.day);

	if (days === null) {
		return baseQuery.where(eq(daily.repoId, repoId)).all();
	}

	const since = daysAgo(days);
	return baseQuery.where(and(eq(daily.repoId, repoId), gte(daily.day, since))).all();
}

export function getAllRepoIds(): Array<{ id: number }> {
	const db = getDb();
	return db.select({ id: repo.id }).from(repo).all();
}

export function getAllDailyData(days: number = 90) {
	const db = getDb();
	const since = daysAgo(days);

	const repos = db.select().from(repo).where(eq(repo.isActive, true)).all();

	return repos.map((r) => {
		const dailyData = db
			.select({ day: daily.day, commits: daily.commits })
			.from(daily)
			.where(and(eq(daily.repoId, r.id), gte(daily.day, since)))
			.orderBy(daily.day)
			.all();

		// Get first commit date from entire history, not just filtered period
		const firstCommitResult = db
			.select({ minDay: sql<string>`MIN(${daily.day})` })
			.from(daily)
			.where(and(eq(daily.repoId, r.id), sql`${daily.commits} > 0`))
			.get();

		return {
			repo: { id: r.id, owner: r.owner, name: r.name, displayName: r.displayName },
			daily: dailyData,
			firstCommitDate: firstCommitResult?.minDay ?? null
		};
	});
}

export function getImpactData(): ImpactData {
	const db = getDb();

	const activeRepos = db
		.select({
			id: repo.id,
			owner: repo.owner,
			name: repo.name,
			displayName: repo.displayName
		})
		.from(repo)
		.where(eq(repo.isActive, true))
		.all();

	const aggregatedDaily = db
		.select({
			day: daily.day,
			commits: sql<number>`cast(coalesce(sum(${daily.commits}), 0) as integer)`,
			additions: sql<number>`cast(coalesce(sum(${daily.additions}), 0) as integer)`,
			deletions: sql<number>`cast(coalesce(sum(${daily.deletions}), 0) as integer)`,
			filesChanged: sql<number>`cast(coalesce(sum(${daily.filesChanged}), 0) as integer)`
		})
		.from(daily)
		.innerJoin(repo, eq(daily.repoId, repo.id))
		.where(eq(repo.isActive, true))
		.groupBy(daily.day)
		.orderBy(daily.day)
		.all();

	const repos = activeRepos.map((r) => {
		const dailyData = db
			.select({
				day: daily.day,
				commits: daily.commits,
				additions: daily.additions,
				deletions: daily.deletions,
				filesChanged: daily.filesChanged
			})
			.from(daily)
			.where(eq(daily.repoId, r.id))
			.orderBy(daily.day)
			.all();

		const commits = db
			.select({
				sha: commitStats.sha,
				day: commitStats.day,
				committedAt: commitStats.committedAt,
				message: commitStats.message,
				additions: commitStats.additions,
				deletions: commitStats.deletions,
				filesChanged: commitStats.filesChanged
			})
			.from(commitStats)
			.where(eq(commitStats.repoId, r.id))
			.orderBy(commitStats.committedAt)
			.all();

		return {
			repo: {
				id: r.id,
				owner: r.owner,
				name: r.name,
				displayName: r.displayName
			},
			daily: dailyData,
			commits
		};
	});

	return {
		daily: aggregatedDaily,
		repos
	};
}

export function getHeatYearData(minYear: number = 2025): HeatYearData[] {
	const db = getDb();
	const minDay = `${minYear}-01-01`;
	const monthExpr = sql<string>`substr(${daily.day}, 1, 7)`;

	const dailyRows = db
		.select({
			day: daily.day,
			commits: sql<number>`cast(coalesce(sum(${daily.commits}), 0) as integer)`
		})
		.from(daily)
		.innerJoin(repo, eq(daily.repoId, repo.id))
		.where(and(eq(repo.isActive, true), gte(daily.day, minDay)))
		.groupBy(daily.day)
		.orderBy(daily.day)
		.all();

	const monthlyRows = db
		.select({
			month: monthExpr,
			repoId: repo.id,
			owner: repo.owner,
			name: repo.name,
			displayName: repo.displayName,
			commits: sql<number>`cast(coalesce(sum(${daily.commits}), 0) as integer)`
		})
		.from(daily)
		.innerJoin(repo, eq(daily.repoId, repo.id))
		.where(and(eq(repo.isActive, true), gte(daily.day, minDay)))
		.groupBy(monthExpr, repo.id, repo.owner, repo.name, repo.displayName)
		.all();

	const byYear = new Map<
		number,
		{
			daily: DailyEntry[];
			months: Map<string, HeatMonthSection>;
		}
	>();

	const ensureYear = (year: number) => {
		const existing = byYear.get(year);
		if (existing) return existing;
		const created = { daily: [], months: new Map<string, HeatMonthSection>() };
		byYear.set(year, created);
		return created;
	};

	for (const row of dailyRows) {
		if (row.commits <= 0) continue;
		const year = Number(row.day.slice(0, 4));
		if (year < minYear) continue;
		const yearBucket = ensureYear(year);
		yearBucket.daily.push({ day: row.day, commits: row.commits });
	}

	for (const row of monthlyRows) {
		if (row.commits <= 0) continue;
		const year = Number(row.month.slice(0, 4));
		if (year < minYear) continue;

		const yearBucket = ensureYear(year);
		const monthBucket = yearBucket.months.get(row.month) ?? {
			month: row.month,
			totalCommits: 0,
			repos: []
		};

		const repoCommits: HeatMonthRepoCommits = {
			repoId: row.repoId,
			owner: row.owner,
			name: row.name,
			displayName: row.displayName,
			commits: row.commits
		};

		monthBucket.totalCommits += row.commits;
		monthBucket.repos.push(repoCommits);
		yearBucket.months.set(row.month, monthBucket);
	}

	const years = Array.from(byYear.keys()).sort((a, b) => b - a);
	if (years.length === 0) {
		years.push(minYear);
	}

	return years.map((year) => {
		const entry = byYear.get(year);
		if (!entry) {
			return { year, daily: [], months: [] };
		}

		const months = Array.from(entry.months.values()).sort((a, b) => b.month.localeCompare(a.month));
		for (const month of months) {
			month.repos.sort(
				(a, b) => b.commits - a.commits || a.owner.localeCompare(b.owner) || a.name.localeCompare(b.name)
			);
		}

		entry.daily.sort((a, b) => a.day.localeCompare(b.day));
		return { year, daily: entry.daily, months };
	});
}

// Get all repos (including inactive) for settings UI
export function getAllRepos(): Array<{
	id: number;
	owner: string;
	name: string;
	displayName: string | null;
	isActive: boolean;
	isFork: boolean;
	lastSyncAt: string | null;
}> {
	const db = getDb();
	return db
		.select({
			id: repo.id,
			owner: repo.owner,
			name: repo.name,
			displayName: repo.displayName,
			isActive: repo.isActive,
			isFork: repo.isFork,
			lastSyncAt: repo.lastSyncAt
		})
		.from(repo)
		.all();
}

// Update repo active status
export function updateRepoActiveStatus(repoId: number, isActive: boolean): void {
	const db = getDb();
	db.update(repo).set({ isActive }).where(eq(repo.id, repoId)).run();
}

// Upsert repo from GitHub sync
export function upsertRepo(owner: string, name: string, ghIsFork = false): number {
	const db = getDb();

	const existing = db
		.select()
		.from(repo)
		.where(and(eq(repo.owner, owner), eq(repo.name, name)))
		.get();

	if (existing) {
		// Trust GitHub when it says the repo IS a fork; never downgrade a manual override
		if (ghIsFork && !existing.isFork) {
			db.update(repo).set({ isFork: true }).where(eq(repo.id, existing.id)).run();
		}
		return existing.id;
	}

	const result = db
		.insert(repo)
		.values({
			owner,
			name,
			isActive: false, // New repos from GitHub are inactive by default
			isFork: ghIsFork,
			createdAt: new Date().toISOString()
		})
		.run();

	return Number(result.lastInsertRowid);
}

// Update fork status for a repo (manual override)
export function updateRepoForkStatus(repoId: number, isFork: boolean): void {
	const db = getDb();
	db.update(repo).set({ isFork }).where(eq(repo.id, repoId)).run();
}

// Clear commit data for a repo (used before full re-sync of forks)
export function clearRepoData(repoId: number): void {
	const db = getDb();
	db.delete(commitStats).where(eq(commitStats.repoId, repoId)).run();
	db.delete(daily).where(eq(daily.repoId, repoId)).run();
}

// Get author emails from metadata (used to filter fork commits)
export function getAuthorEmails(): string[] {
	const value = getMetadata('authorEmails');
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		if (Array.isArray(parsed)) {
			return parsed.filter((e): e is string => typeof e === 'string' && e.trim().length > 0);
		}
	} catch {
		// ignore parse errors
	}
	return [];
}

// Get active repos only (for CLI indexer)
export function getActiveRepos(): Array<{ owner: string; name: string }> {
	const db = getDb();
	return db
		.select({ owner: repo.owner, name: repo.name })
		.from(repo)
		.where(eq(repo.isActive, true))
		.all();
}

// Get metadata value
export function getMetadata(key: string): string | null {
	const db = getDb();
	const result = db
		.select({ value: metadata.value })
		.from(metadata)
		.where(eq(metadata.key, key))
		.get();
	return result?.value ?? null;
}

// Set metadata value (upsert)
export function setMetadata(key: string, value: string): void {
	const db = getDb();
	db.insert(metadata)
		.values({ key, value })
		.onConflictDoUpdate({
			target: metadata.key,
			set: { value }
		})
		.run();
}

// Delete repository and all associated data
export function deleteRepo(repoId: number): void {
	const db = getDb();

	// Delete commit-level stats first
	db.delete(commitStats).where(eq(commitStats.repoId, repoId)).run();

	// Delete daily commit records first (foreign key constraint)
	db.delete(daily).where(eq(daily.repoId, repoId)).run();

	// Delete repo
	db.delete(repo).where(eq(repo.id, repoId)).run();
}

// Update repository display name
export function updateRepoDisplayName(repoId: number, displayName: string | null): void {
	const db = getDb();
	db.update(repo).set({ displayName }).where(eq(repo.id, repoId)).run();
}
