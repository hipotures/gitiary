import { json, error } from '@sveltejs/kit';
import { getRepoById } from '$lib/server/db/queries.js';
import { syncRepo } from '$lib/server/indexer/sync.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ params, request }) => {
	const repoId = parseInt(params.id, 10);

	if (isNaN(repoId)) {
		return error(400, 'Invalid repository ID');
	}

	const repo = getRepoById(repoId);
	if (!repo) {
		return error(404, 'Repository not found');
	}

	try {
		const body = await request.json();
		const backfillDays = body.backfillDays || 30;

		// Call syncRepo function
		await syncRepo({ owner: repo.owner, name: repo.name }, false, backfillDays);

		return json({
			success: true,
			owner: repo.owner,
			name: repo.name,
			backfillDays
		});
	} catch (err) {
		console.error('Sync failed:', err);
		return error(500, {
			message: 'Failed to sync repository',
			details: err instanceof Error ? err.message : String(err)
		});
	}
};

export const prerender = false;
