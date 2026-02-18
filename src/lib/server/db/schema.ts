import { sqliteTable, integer, text, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const repo = sqliteTable('repo', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	owner: text('owner').notNull(),
	name: text('name').notNull(),
	displayName: text('display_name'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	isFork: integer('is_fork', { mode: 'boolean' }).notNull().default(false),
	lastSyncAt: text('last_sync_at'),
	lastPushedAt: text('last_pushed_at'),
	createdAt: text('created_at').notNull()
});

export const daily = sqliteTable(
	'daily',
	{
		repoId: integer('repo_id')
			.notNull()
			.references(() => repo.id),
		day: text('day').notNull(),
		commits: integer('commits').notNull(),
		additions: integer('additions').notNull().default(0),
		deletions: integer('deletions').notNull().default(0),
		filesChanged: integer('files_changed').notNull().default(0)
	},
	(table) => [primaryKey({ columns: [table.repoId, table.day] })]
);

export const commitStats = sqliteTable(
	'commit_stats',
	{
		repoId: integer('repo_id')
			.notNull()
			.references(() => repo.id),
		sha: text('sha').notNull(),
		committedAt: text('committed_at').notNull(),
		day: text('day').notNull(),
		message: text('message').notNull(),
		additions: integer('additions').notNull().default(0),
		deletions: integer('deletions').notNull().default(0),
		filesChanged: integer('files_changed').notNull().default(0)
	},
	(table) => [
		primaryKey({ columns: [table.repoId, table.sha] }),
		index('commit_stats_day_idx').on(table.day),
		index('commit_stats_repo_day_idx').on(table.repoId, table.day)
	]
);

export const metadata = sqliteTable('metadata', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});
