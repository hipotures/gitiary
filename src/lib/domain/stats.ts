import type { DailyEntry } from './types.js';

export function calculateCurrentStreak(daily: DailyEntry[], referenceDate: string): number {
	const sorted = [...daily].filter((d) => d.commits > 0).sort((a, b) => b.day.localeCompare(a.day));

	if (sorted.length === 0) return 0;

	let streak = 0;
	const refDate = new Date(referenceDate + 'T00:00:00Z');

	for (let i = 0; ; i++) {
		const checkDate = new Date(refDate);
		checkDate.setUTCDate(checkDate.getUTCDate() - i);
		const dateStr = checkDate.toISOString().slice(0, 10);

		const entry = sorted.find((d) => d.day === dateStr);

		if (entry && entry.commits > 0) {
			streak++;
		} else {
			break;
		}
	}

	return streak;
}

export function calculateLongestStreak(daily: DailyEntry[]): number {
	const activeDays = daily
		.filter((d) => d.commits > 0)
		.map((d) => d.day)
		.sort();

	if (activeDays.length === 0) return 0;

	let maxStreak = 1;
	let currentStreak = 1;

	for (let i = 1; i < activeDays.length; i++) {
		const prev = new Date(activeDays[i - 1] + 'T00:00:00Z');
		const curr = new Date(activeDays[i] + 'T00:00:00Z');
		const daysDiff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

		if (daysDiff === 1) {
			currentStreak++;
			maxStreak = Math.max(maxStreak, currentStreak);
		} else {
			currentStreak = 1;
		}
	}

	return maxStreak;
}

export function calculateMaxGap(daily: DailyEntry[]): number {
	const activeDays = daily
		.filter((d) => d.commits > 0)
		.map((d) => d.day)
		.sort();

	if (activeDays.length < 2) return 0;

	let maxGap = 0;

	for (let i = 1; i < activeDays.length; i++) {
		const prev = new Date(activeDays[i - 1] + 'T00:00:00Z');
		const curr = new Date(activeDays[i] + 'T00:00:00Z');
		const gap = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)) - 1;
		maxGap = Math.max(maxGap, gap);
	}

	return maxGap;
}

export function calculateRegularity(daily: DailyEntry[], periodDays: number): number {
	if (periodDays === 0) return 0;
	const activeDays = daily.filter((d) => d.commits > 0).length;
	return activeDays / periodDays;
}

export interface StorySummary {
	totalCommits: number;
	activeDays: number;
	totalDays: number;
	mostActiveRepo: { owner: string; name: string; displayName: string | null; commits: number } | null;
	mostConsistentRepo: { owner: string; name: string; displayName: string | null; regularity: number } | null;
	longestStreak: number;
	highlights: Array<{ day: string; commits: number; repos: string[] }>;
}

export function generateStorySummary(
	allData: Array<{ repo: { id: number; owner: string; name: string; displayName: string | null }; daily: DailyEntry[] }>,
	periodDays: number
): StorySummary {
	// Total commits across all repos
	const totalCommits = allData.reduce(
		(sum, item) => sum + item.daily.reduce((s, d) => s + d.commits, 0),
		0
	);

	// Collect all unique active days
	const allActiveDays = new Set<string>();
	allData.forEach((item) => {
		item.daily.filter((d) => d.commits > 0).forEach((d) => allActiveDays.add(d.day));
	});

	// Most active repo
	const repoCommits = allData.map((item) => ({
		owner: item.repo.owner,
		name: item.repo.name,
		displayName: item.repo.displayName,
		commits: item.daily.reduce((sum, d) => sum + d.commits, 0)
	}));
	const mostActiveRepo = repoCommits.reduce(
		(max, r) => (r.commits > max.commits ? r : max),
		repoCommits[0] || { owner: '', name: '', displayName: null, commits: 0 }
	);

	// Most consistent repo
	const repoRegularity = allData.map((item) => ({
		owner: item.repo.owner,
		name: item.repo.name,
		displayName: item.repo.displayName,
		regularity: calculateRegularity(item.daily, periodDays)
	}));
	const mostConsistentRepo = repoRegularity.reduce(
		(max, r) => (r.regularity > max.regularity ? r : max),
		repoRegularity[0] || { owner: '', name: '', displayName: null, regularity: 0 }
	);

	// Longest streak across all repos
	const allStreaks = allData.map((item) => calculateLongestStreak(item.daily));
	const longestStreak = Math.max(...allStreaks, 0);

	// Highlights - days with unusual activity (> mean + 1.5 * stddev)
	const dailyTotals = new Map<string, { commits: number; repos: Set<string> }>();
	allData.forEach((item) => {
		item.daily.forEach((d) => {
			if (d.commits > 0) {
				const existing = dailyTotals.get(d.day) || { commits: 0, repos: new Set() };
				existing.commits += d.commits;
				existing.repos.add(item.repo.name);
				dailyTotals.set(d.day, existing);
			}
		});
	});

	const commitCounts = Array.from(dailyTotals.values()).map((d) => d.commits);
	const mean = commitCounts.reduce((sum, c) => sum + c, 0) / commitCounts.length || 0;
	const variance =
		commitCounts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / commitCounts.length || 0;
	const stddev = Math.sqrt(variance);
	const threshold = mean + 1.5 * stddev;

	const highlights = Array.from(dailyTotals.entries())
		.filter(([_, data]) => data.commits > threshold)
		.map(([day, data]) => ({
			day,
			commits: data.commits,
			repos: Array.from(data.repos)
		}))
		.sort((a, b) => b.commits - a.commits)
		.slice(0, 5);

	return {
		totalCommits,
		activeDays: allActiveDays.size,
		totalDays: periodDays,
		mostActiveRepo: mostActiveRepo.commits > 0 ? mostActiveRepo : null,
		mostConsistentRepo: mostConsistentRepo.regularity > 0 ? mostConsistentRepo : null,
		longestStreak,
		highlights
	};
}
