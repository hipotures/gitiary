import { json } from '@sveltejs/kit';
import { getAllRepos } from '$lib/server/db/queries.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = () => {
	const repos = getAllRepos();
	return json(repos);
};

export const prerender = false;
