import { eq, sql, and, gte } from 'drizzle-orm';
import { getDb } from './connection.js';
import { repo, daily, metadata } from './schema.js';
import type { RepoSummary, DailyEntry } from '$lib/domain/types.js';

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

		return {
			id: r.id,
			owner: r.owner,
			name: r.name,
			commits7d: countSince(day7),
			commits30d: countSince(day30),
			commits90d: countSince(day90),
			commits180d: countSince(day180),
			commits360d: countSince(day360),
			commitsAll: countAll(),
			lastSyncAt: r.lastSyncAt
		};
	});
}

export function getRepoById(id: number) {
	const db = getDb();
	return db.select().from(repo).where(eq(repo.id, id)).get();
}

export function getRepoDailyData(repoId: number, days: number = 90): DailyEntry[] {
	const db = getDb();
	const since = daysAgo(days);

	return db
		.select({ day: daily.day, commits: daily.commits })
		.from(daily)
		.where(and(eq(daily.repoId, repoId), gte(daily.day, since)))
		.orderBy(daily.day)
		.all();
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

		return {
			repo: { id: r.id, owner: r.owner, name: r.name },
			daily: dailyData
		};
	});
}

// Get all repos (including inactive) for settings UI
export function getAllRepos(): Array<{
	id: number;
	owner: string;
	name: string;
	isActive: boolean;
	lastSyncAt: string | null;
}> {
	const db = getDb();
	return db
		.select({
			id: repo.id,
			owner: repo.owner,
			name: repo.name,
			isActive: repo.isActive,
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
export function upsertRepo(owner: string, name: string): number {
	const db = getDb();

	const existing = db
		.select()
		.from(repo)
		.where(and(eq(repo.owner, owner), eq(repo.name, name)))
		.get();

	if (existing) {
		return existing.id;
	}

	const result = db
		.insert(repo)
		.values({
			owner,
			name,
			isActive: false, // New repos from GitHub are inactive by default
			createdAt: new Date().toISOString()
		})
		.run();

	return Number(result.lastInsertRowid);
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

	// Delete daily commit records first (foreign key constraint)
	db.delete(daily).where(eq(daily.repoId, repoId)).run();

	// Delete repo
	db.delete(repo).where(eq(repo.id, repoId)).run();
}
