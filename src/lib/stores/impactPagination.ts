import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type ImpactDailyPageSize = 10 | 30 | 50 | 100;

const STORAGE_KEY = 'gitiary-impact-daily-page-size';
const DEFAULT_PAGE_SIZE: ImpactDailyPageSize = 30;

function parsePageSize(raw: string | null): ImpactDailyPageSize | null {
	const parsed = Number(raw);
	if (parsed === 10 || parsed === 30 || parsed === 50 || parsed === 100) {
		return parsed;
	}
	return null;
}

function getInitialPageSize(): ImpactDailyPageSize {
	if (!browser) return DEFAULT_PAGE_SIZE;
	return parsePageSize(localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_PAGE_SIZE;
}

function createImpactDailyPageSizeStore() {
	const { subscribe, set } = writable<ImpactDailyPageSize>(getInitialPageSize());

	return {
		subscribe,
		set: (pageSize: ImpactDailyPageSize) => {
			if (browser) {
				localStorage.setItem(STORAGE_KEY, String(pageSize));
			}
			set(pageSize);
		}
	};
}

export const impactDailyPageSize = createImpactDailyPageSizeStore();
