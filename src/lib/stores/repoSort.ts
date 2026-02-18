import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { RepoSortField, SortDirection } from '$lib/domain/repoSort.js';

export interface RepoSortPreference {
	field: RepoSortField;
	direction: SortDirection;
}

const STORAGE_KEY = 'gitiary-repo-sort';
const DEFAULT_PREFERENCE: RepoSortPreference = {
	field: 'name',
	direction: 'asc'
};

// Initialize from localStorage or default
const getInitialPreference = (): RepoSortPreference => {
	if (!browser) return DEFAULT_PREFERENCE;

	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return DEFAULT_PREFERENCE;

	try {
		const parsed = JSON.parse(stored);
		// Validate stored value
		if (
			parsed &&
			typeof parsed === 'object' &&
			['name', 'firstCommitDate', 'totalCommits'].includes(parsed.field) &&
			['asc', 'desc'].includes(parsed.direction)
		) {
			return parsed as RepoSortPreference;
		}
	} catch {
		// Invalid JSON, fall through to default
	}

	return DEFAULT_PREFERENCE;
};

function createRepoSortStore() {
	const { subscribe, set, update } = writable<RepoSortPreference>(getInitialPreference());

	return {
		subscribe,
		set: (preference: RepoSortPreference) => {
			if (browser) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
			}
			set(preference);
		},
		setField: (field: RepoSortField) => {
			update((current) => {
				const next = { ...current, field };
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				}
				return next;
			});
		},
		toggleDirection: () => {
			update((current) => {
				const next = {
					...current,
					direction: current.direction === 'asc' ? ('desc' as const) : ('asc' as const)
				};
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				}
				return next;
			});
		}
	};
}

export const repoSort = createRepoSortStore();
