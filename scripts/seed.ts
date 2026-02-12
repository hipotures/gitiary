import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { repo, daily } from '../src/lib/server/db/schema.js';
import { resolve } from 'path';
import { mkdirSync } from 'fs';

const DB_PATH = resolve('data', 'diary.db');
mkdirSync(resolve('data'), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite);

// Clean existing data
sqlite.exec('DELETE FROM daily');
sqlite.exec('DELETE FROM repo');

const now = new Date().toISOString();

// Seed repos
const repos = [
	{ owner: 'exampleuser001', name: 'project-alpha' },
	{ owner: 'exampleuser001', name: 'project-beta' },
	{ owner: 'exampleuser001', name: 'project-gamma' }
];

const repoIds: number[] = [];
for (const r of repos) {
	const result = db.insert(repo).values({ owner: r.owner, name: r.name, createdAt: now }).run();
	repoIds.push(Number(result.lastInsertRowid));
}

// Seed daily commit data for 90 days
function seededRandom(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		return s / 0x7fffffff;
	};
}

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

for (let ri = 0; ri < repoIds.length; ri++) {
	const rand = seededRandom(42 + ri * 1000);
	const repoId = repoIds[ri];

	// Different activity patterns per repo
	const activityRate = [0.7, 0.4, 0.55][ri]; // how often there are commits
	const maxCommits = [12, 6, 8][ri]; // max commits per active day

	for (let d = 0; d < 90; d++) {
		const date = new Date(today);
		date.setUTCDate(date.getUTCDate() - d);
		const dayStr = date.toISOString().slice(0, 10);

		if (rand() < activityRate) {
			const commits = Math.max(1, Math.floor(rand() * maxCommits));
			db.insert(daily).values({ repoId, day: dayStr, commits }).run();
		}
	}
}

console.log(`Seeded ${repos.length} repos with 90 days of fixture data.`);
console.log(`Database: ${DB_PATH}`);
sqlite.close();
