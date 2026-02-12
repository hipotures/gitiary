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
