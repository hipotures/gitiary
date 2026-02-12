import { json } from '@sveltejs/kit';
import { getReposWithStats } from '$lib/server/db/queries.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = () => {
	const repos = getReposWithStats();
	return json(repos);
};
