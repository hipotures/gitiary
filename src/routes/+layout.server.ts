import { getReposWithStats } from '$lib/server/db/queries.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = () => {
	const repos = getReposWithStats();
	const owner = repos.length > 0 ? repos[0].owner : '';
	return { owner };
};

export const prerender = true;
