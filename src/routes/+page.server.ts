import { getReposWithStats } from '$lib/server/db/queries.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	const repos = getReposWithStats();
	return { repos };
};
