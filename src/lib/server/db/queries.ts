import { eq, sql, and, gte } from 'drizzle-orm';
import { getDb } from './connection.js';
import { repo, daily } from './schema.js';
import type { RepoSummary, DailyEntry } from '$lib/domain/types.js';

function daysAgo(n: number): string {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() - n);
	return d.toISOString().slice(0, 10);
}

export function getReposWithStats(): RepoSummary[] {
	const db = getDb();
	const repos = db.select().from(repo).all();
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

	const repos = db.select().from(repo).all();

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
