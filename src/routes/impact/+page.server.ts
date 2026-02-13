import { getImpactData } from '$lib/server/db/queries.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = () => {
	const impactData = getImpactData();
	return { impactData };
};

export const prerender = true;
