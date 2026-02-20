import type { ComparisonRepo } from './types.js';

export type SortField =
	| 'name'
	| 'firstCommitDate'
	| 'lastCommitDate'
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
		let aVal: number | string | null;
		let bVal: number | string | null;

		if (field === 'name') {
			aVal = `${a.owner}/${a.name}`.toLowerCase();
			bVal = `${b.owner}/${b.name}`.toLowerCase();
		} else if (field === 'firstCommitDate' || field === 'lastCommitDate') {
			aVal = a[field];
			bVal = b[field];

			// Handle nulls - always sort to the end
			if (aVal === null && bVal === null) return 0;
			if (aVal === null) return 1;
			if (bVal === null) return -1;

			// Both non-null, compare as strings
			return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
		} else {
			aVal = a[field];
			bVal = b[field];
		}

		if (typeof aVal === 'string' && typeof bVal === 'string') {
			return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
		}

		// Both must be numbers at this point
		const aNum = aVal as number;
		const bNum = bVal as number;
		return direction === 'asc' ? aNum - bNum : bNum - aNum;
	});

	return sorted;
}
