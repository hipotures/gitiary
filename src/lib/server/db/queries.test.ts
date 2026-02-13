import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { repo, daily, commitStats } from './schema.js';

function createTestDb() {
	const sqlite = new Database(':memory:');
	const db = drizzle(sqlite, { schema: { repo, daily, commitStats } });

	// Create tables manually (simpler than migrations for tests)
	sqlite.exec(`
		CREATE TABLE repo (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner TEXT NOT NULL,
			name TEXT NOT NULL,
			display_name TEXT,
			is_active INTEGER NOT NULL DEFAULT 1,
			last_sync_at TEXT,
			created_at TEXT NOT NULL
		);

		CREATE TABLE daily (
			repo_id INTEGER NOT NULL REFERENCES repo(id),
			day TEXT NOT NULL,
			commits INTEGER NOT NULL,
			additions INTEGER NOT NULL DEFAULT 0,
			deletions INTEGER NOT NULL DEFAULT 0,
			files_changed INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (repo_id, day)
		);

		CREATE TABLE commit_stats (
			repo_id INTEGER NOT NULL REFERENCES repo(id),
			sha TEXT NOT NULL,
			committed_at TEXT NOT NULL,
			day TEXT NOT NULL,
			message TEXT NOT NULL,
			additions INTEGER NOT NULL DEFAULT 0,
			deletions INTEGER NOT NULL DEFAULT 0,
			files_changed INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (repo_id, sha)
		);
	`);

	return { db, sqlite };
}

describe('Database queries', () => {
	let db: ReturnType<typeof drizzle>;
	let sqlite: Database.Database;

	beforeEach(() => {
		const testDb = createTestDb();
		db = testDb.db;
		sqlite = testDb.sqlite;
	});

	it('should insert and retrieve repo', () => {
		const result = db
			.insert(repo)
			.values({ owner: 'test', name: 'repo1', createdAt: '2026-02-12T00:00:00Z' })
			.run();

		const repoId = Number(result.lastInsertRowid);
		expect(repoId).toBeGreaterThan(0);

		const repos = db.select().from(repo).all();
		expect(repos).toHaveLength(1);
		expect(repos[0].owner).toBe('test');
		expect(repos[0].name).toBe('repo1');
	});

	it('should insert and retrieve daily data', () => {
		const result = db
			.insert(repo)
			.values({ owner: 'test', name: 'repo1', createdAt: '2026-02-12T00:00:00Z' })
			.run();

		const repoId = Number(result.lastInsertRowid);

		db.insert(daily)
			.values([
				{ repoId, day: '2026-02-12', commits: 10 },
				{ repoId, day: '2026-02-11', commits: 5 }
			])
			.run();

		const dailyData = db.select().from(daily).all();
		expect(dailyData).toHaveLength(2);
		expect(dailyData[0].commits).toBe(10);
	});

	it('should enforce composite primary key on daily', () => {
		const result = db
			.insert(repo)
			.values({ owner: 'test', name: 'repo1', createdAt: '2026-02-12T00:00:00Z' })
			.run();

		const repoId = Number(result.lastInsertRowid);

		db.insert(daily).values({ repoId, day: '2026-02-12', commits: 10 }).run();

		// Attempting to insert duplicate should fail
		expect(() => {
			db.insert(daily).values({ repoId, day: '2026-02-12', commits: 20 }).run();
		}).toThrow();
	});

	it('should upsert daily data', () => {
		const result = db
			.insert(repo)
			.values({ owner: 'test', name: 'repo1', createdAt: '2026-02-12T00:00:00Z' })
			.run();

		const repoId = Number(result.lastInsertRowid);

		db.insert(daily).values({ repoId, day: '2026-02-12', commits: 10 }).run();

		// Upsert with higher value
		db.insert(daily)
			.values({ repoId, day: '2026-02-12', commits: 20 })
			.onConflictDoUpdate({
				target: [daily.repoId, daily.day],
				set: { commits: 20 }
			})
			.run();

		const dailyData = db.select().from(daily).all();
		expect(dailyData).toHaveLength(1);
		expect(dailyData[0].commits).toBe(20);
	});

	it('should upsert commit stats', () => {
		const result = db
			.insert(repo)
			.values({ owner: 'test', name: 'repo1', createdAt: '2026-02-12T00:00:00Z' })
			.run();

		const repoId = Number(result.lastInsertRowid);

		db.insert(commitStats)
			.values({
				repoId,
				sha: 'abc123',
				committedAt: '2026-02-12T10:00:00Z',
				day: '2026-02-12',
				message: 'feat: add something',
				additions: 10,
				deletions: 2,
				filesChanged: 3
			})
			.run();

		db.insert(commitStats)
			.values({
				repoId,
				sha: 'abc123',
				committedAt: '2026-02-12T10:00:00Z',
				day: '2026-02-12',
				message: 'feat: add something updated',
				additions: 12,
				deletions: 4,
				filesChanged: 5
			})
			.onConflictDoUpdate({
				target: [commitStats.repoId, commitStats.sha],
				set: { additions: 12, deletions: 4, filesChanged: 5 }
			})
			.run();

		const rows = db.select().from(commitStats).all();
		expect(rows).toHaveLength(1);
		expect(rows[0].additions).toBe(12);
		expect(rows[0].filesChanged).toBe(5);
	});
});
