import type { ComparisonRepo } from './types.js';

export type SortField =
	| 'name'
	| 'totalCommits'
	| 'activeDays'
	| 'regularity'
	| 'maxGap'
	| 'currentStreak'
	| 'longestStreak';

export type SortDirection = 'asc' | 'desc';

export function sortRepos(
	repos: ComparisonRepo[],
	field: SortField,
	direction: SortDirection
): ComparisonRepo[] {
	const sorted = [...repos];

	sorted.sort((a, b) => {
		let aVal: number | string;
		let bVal: number | string;

		if (field === 'name') {
			aVal = `${a.owner}/${a.name}`.toLowerCase();
			bVal = `${b.owner}/${b.name}`.toLowerCase();
		} else {
			aVal = a[field];
			bVal = b[field];
		}

		if (typeof aVal === 'string' && typeof bVal === 'string') {
			return direction === 'asc'
				? aVal.localeCompare(bVal)
				: bVal.localeCompare(aVal);
		}

		return direction === 'asc' ? aVal - bVal : bVal - aVal;
	});

	return sorted;
}
