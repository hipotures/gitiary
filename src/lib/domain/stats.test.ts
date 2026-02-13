import { describe, it, expect } from 'vitest';
import {
	calculateCurrentStreak,
	calculateLongestStreak,
	calculateMaxGap,
	calculateRegularity,
	generateStorySummary
} from './stats.js';
import type { DailyEntry } from './types.js';

describe('calculateCurrentStreak', () => {
	it('should return 0 for empty data', () => {
		expect(calculateCurrentStreak([], '2026-02-12')).toBe(0);
	});

	it('should calculate streak ending today', () => {
		const daily: DailyEntry[] = [
			{ day: '2026-02-12', commits: 5 },
			{ day: '2026-02-11', commits: 3 },
			{ day: '2026-02-10', commits: 2 }
		];
		expect(calculateCurrentStreak(daily, '2026-02-12')).toBe(3);
	});

	it('should return 0 if no commits today', () => {
		const daily: DailyEntry[] = [
			{ day: '2026-02-10', commits: 5 },
			{ day: '2026-02-09', commits: 3 }
		];
		expect(calculateCurrentStreak(daily, '2026-02-12')).toBe(0);
	});

	it('should stop streak at first gap', () => {
		const daily: DailyEntry[] = [
			{ day: '2026-02-12', commits: 5 },
			{ day: '2026-02-11', commits: 3 },
			// gap on 2026-02-10
			{ day: '2026-02-09', commits: 2 }
		];
		expect(calculateCurrentStreak(daily, '2026-02-12')).toBe(2);
	});
});

describe('calculateLongestStreak', () => {
	it('should return 0 for empty data', () => {
		expect(calculateLongestStreak([])).toBe(0);
	});

	it('should return 1 for single day', () => {
		const daily: DailyEntry[] = [{ day: '2026-02-12', commits: 5 }];
		expect(calculateLongestStreak(daily)).toBe(1);
	});

	it('should find longest consecutive streak', () => {
		const daily: DailyEntry[] = [
			{ day: '2026-02-12', commits: 1 },
			{ day: '2026-02-11', commits: 1 },
			// gap
			{ day: '2026-02-09', commits: 1 },
			{ day: '2026-02-08', commits: 1 },
			{ day: '2026-02-07', commits: 1 },
			{ day: '2026-02-06', commits: 1 }
		];
		expect(calculateLongestStreak(daily)).toBe(4); // 06-09
	});
});

describe('calculateMaxGap', () => {
	it('should return 0 for less than 2 days', () => {
		expect(calculateMaxGap([])).toBe(0);
		expect(calculateMaxGap([{ day: '2026-02-12', commits: 1 }])).toBe(0);
	});

	it('should calculate gap between consecutive days as 0', () => {
		const daily: DailyEntry[] = [
			{ day: '2026-02-12', commits: 1 },
			{ day: '2026-02-11', commits: 1 }
		];
		expect(calculateMaxGap(daily)).toBe(0);
	});

	it('should find largest gap', () => {
		const daily: DailyEntry[] = [
			{ day: '2026-02-12', commits: 1 },
			{ day: '2026-02-10', commits: 1 }, // 1 day gap
			{ day: '2026-02-05', commits: 1 } // 4 day gap
		];
		expect(calculateMaxGap(daily)).toBe(4);
	});
});

describe('calculateRegularity', () => {
	it('should return 0 for 0 period', () => {
		expect(calculateRegularity([], 0)).toBe(0);
	});

	it('should calculate active days / total days', () => {
		const daily: DailyEntry[] = [
			{ day: '2026-02-12', commits: 5 },
			{ day: '2026-02-11', commits: 3 },
			{ day: '2026-02-10', commits: 0 },
			{ day: '2026-02-09', commits: 2 }
		];
		expect(calculateRegularity(daily, 10)).toBe(0.3); // 3 active days / 10 total
	});
});

describe('generateStorySummary', () => {
	it('should generate summary for single repo', () => {
		const data = [
			{
				repo: { id: 1, owner: 'test', name: 'repo1', displayName: null },
				daily: [
					{ day: '2026-02-12', commits: 10 },
					{ day: '2026-02-11', commits: 5 },
					{ day: '2026-02-10', commits: 3 }
				]
			}
		];

		const summary = generateStorySummary(data, 30);

		expect(summary.totalCommits).toBe(18);
		expect(summary.activeDays).toBe(3);
		expect(summary.totalDays).toBe(30);
		expect(summary.mostActiveRepo?.name).toBe('repo1');
		expect(summary.mostActiveRepo?.commits).toBe(18);
	});

	it('should identify most active repo', () => {
		const data = [
			{
				repo: { id: 1, owner: 'test', name: 'repo1', displayName: null },
				daily: [{ day: '2026-02-12', commits: 5 }]
			},
			{
				repo: { id: 2, owner: 'test', name: 'repo2', displayName: null },
				daily: [{ day: '2026-02-12', commits: 20 }]
			}
		];

		const summary = generateStorySummary(data, 30);

		expect(summary.mostActiveRepo?.name).toBe('repo2');
		expect(summary.mostActiveRepo?.commits).toBe(20);
	});

	it('should detect highlights (exceptional days)', () => {
		const data = [
			{
				repo: { id: 1, owner: 'test', name: 'repo1', displayName: null },
				daily: [
					{ day: '2026-02-12', commits: 100 }, // outlier
					{ day: '2026-02-11', commits: 5 },
					{ day: '2026-02-10', commits: 5 },
					{ day: '2026-02-09', commits: 5 },
					{ day: '2026-02-08', commits: 5 }
				]
			}
		];

		const summary = generateStorySummary(data, 30);

		expect(summary.highlights.length).toBeGreaterThan(0);
		expect(summary.highlights[0].day).toBe('2026-02-12');
		expect(summary.highlights[0].commits).toBe(100);
	});
});
