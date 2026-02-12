import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';

export const repo = sqliteTable('repo', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	owner: text('owner').notNull(),
	name: text('name').notNull(),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	lastSyncAt: text('last_sync_at'),
	createdAt: text('created_at').notNull()
});

export const daily = sqliteTable(
	'daily',
	{
		repoId: integer('repo_id')
			.notNull()
			.references(() => repo.id),
		day: text('day').notNull(),
		commits: integer('commits').notNull()
	},
	(table) => [primaryKey({ columns: [table.repoId, table.day] })]
);

export const metadata = sqliteTable('metadata', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});
