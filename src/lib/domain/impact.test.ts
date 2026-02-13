import { describe, expect, it } from 'vitest';
import { buildImpactView } from './impact.js';
import type { ImpactData } from './types.js';

const sampleData: ImpactData = {
	daily: [
		{ day: '2026-01-01', commits: 3, additions: 30, deletions: 10, filesChanged: 6 },
		{ day: '2026-01-02', commits: 1, additions: 5, deletions: 2, filesChanged: 2 },
		{ day: '2026-01-10', commits: 2, additions: 10, deletions: 8, filesChanged: 4 }
	],
	repos: [
		{
			repo: { id: 1, owner: 'alice', name: 'repo-a', displayName: null },
			daily: [
				{ day: '2026-01-01', commits: 2, additions: 20, deletions: 5, filesChanged: 4 },
				{ day: '2026-01-10', commits: 2, additions: 10, deletions: 8, filesChanged: 4 }
			],
			commits: [
				{
					sha: 'a1',
					day: '2026-01-01',
					committedAt: '2026-01-01T09:00:00Z',
					message: 'feat: initial',
					additions: 12,
					deletions: 3,
					filesChanged: 2
				},
				{
					sha: 'a2',
					day: '2026-01-10',
					committedAt: '2026-01-10T12:00:00Z',
					message: 'refactor',
					additions: 10,
					deletions: 8,
					filesChanged: 4
				}
			]
		},
		{
			repo: { id: 2, owner: 'alice', name: 'repo-b', displayName: 'Repo B' },
			daily: [
				{ day: '2026-01-01', commits: 1, additions: 10, deletions: 5, filesChanged: 2 },
				{ day: '2026-01-02', commits: 1, additions: 5, deletions: 2, filesChanged: 2 }
			],
			commits: [
				{
					sha: 'b1',
					day: '2026-01-02',
					committedAt: '2026-01-02T10:00:00Z',
					message: 'chore',
					additions: 5,
					deletions: 2,
					filesChanged: 2
				}
			]
		}
	]
};

describe('buildImpactView', () => {
	it('calculates all-time summary and rankings', () => {
		const view = buildImpactView(sampleData, 'all', '2026-01-10');

		expect(view.summary.totalCommits).toBe(6);
		expect(view.summary.linesAdded).toBe(45);
		expect(view.summary.linesDeleted).toBe(20);
		expect(view.summary.netChange).toBe(25);
		expect(view.summary.filesChanged).toBe(12);
		expect(view.summary.firstCommitDate).toBe('2026-01-01');
		expect(view.summary.lastCommitDate).toBe('2026-01-10');
		expect(view.summary.activeDays).toBe(3);
		expect(view.summary.totalDays).toBe(10);
		expect(view.topByCommits[0].day).toBe('2026-01-01');
		expect(view.topByChanges[0].totalChanges).toBe(40);
		expect(view.largestCommits[0].sha).toBe('a2');
		expect(view.repoRows[0].name).toBe('repo-a');
	});

	it('filters by selected range and keeps zeroed repos', () => {
		const view = buildImpactView(sampleData, 7, '2026-01-10');

		expect(view.summary.totalCommits).toBe(2);
		expect(view.summary.linesAdded).toBe(10);
		expect(view.summary.linesDeleted).toBe(8);
		expect(view.dailyRows).toHaveLength(1);
		expect(view.dailyRows[0].day).toBe('2026-01-10');
		expect(view.repoRows.find((r) => r.name === 'repo-b')?.commits).toBe(0);
		expect(view.largestCommits).toHaveLength(1);
		expect(view.largestCommits[0].sha).toBe('a2');
	});
});
