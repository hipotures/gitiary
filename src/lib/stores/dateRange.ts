import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type DateRange = 7 | 30 | 90 | 180 | 360 | 'all';

// Initialize from localStorage with default of 90 days
const getInitialRange = (): DateRange => {
	if (!browser) return 90;

	const stored = localStorage.getItem('gitiary-date-range');
	if (stored === 'all') return 'all';
	const parsed = parseInt(stored || '', 10);
	if ([7, 30, 90, 180, 360].includes(parsed)) return parsed as DateRange;

	return 90; // Default
};

function createDateRangeStore() {
	const { subscribe, set } = writable<DateRange>(getInitialRange());

	return {
		subscribe,
		set: (range: DateRange) => {
			if (browser) {
				localStorage.setItem('gitiary-date-range', String(range));
			}
			set(range);
		}
	};
}

export const dateRange = createDateRangeStore();

/**
 * Convert DateRange to number of days (null for 'all')
 */
export function getDaysFromRange(range: DateRange): number | null {
	return range === 'all' ? null : range;
}

/**
 * Filter daily data based on selected date range
 */
export function filterDailyData<T extends { day: string }>(
	data: T[],
	range: DateRange
): T[] {
	if (range === 'all') return data;

	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - range);
	cutoffDate.setHours(0, 0, 0, 0);

	return data.filter((item) => {
		const itemDate = new Date(item.day);
		return itemDate >= cutoffDate;
	});
}

/**
 * Get human-readable label for date range
 */
export function getRangeLabel(range: DateRange): string {
	return range === 'all' ? 'All time' : `${range} days`;
}
