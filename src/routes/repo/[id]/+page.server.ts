import { error } from '@sveltejs/kit';
import { getRepoById, getRepoDailyData, getAllRepoIds } from '$lib/server/db/queries.js';
import type { PageServerLoad, EntryGenerator } from './$types.js';

export const load: PageServerLoad = ({ params }) => {
	const id = parseInt(params.id, 10);

	if (isNaN(id)) {
		throw error(400, 'Invalid repo ID');
	}

	const repo = getRepoById(id);

	if (!repo) {
		throw error(404, 'Repository not found');
	}

	const daily = getRepoDailyData(id, null);

	return {
		repo: { id: repo.id, owner: repo.owner, name: repo.name, displayName: repo.displayName, isFork: repo.isFork, hasExtraBranches: repo.branchCount > 1 },
		daily
	};
};

export const entries: EntryGenerator = () => {
	const repos = getAllRepoIds();
	return repos.map((r) => ({ id: String(r.id) }));
};

export const prerender = true;
