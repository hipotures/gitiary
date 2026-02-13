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
		const mode = body.mode === 'full' ? 'full' : 'backfill';
		const backfillDays =
			typeof body.backfillDays === 'number' && Number.isFinite(body.backfillDays)
				? Math.max(0, Math.floor(body.backfillDays))
				: 30;

		// Call syncRepo function
		await syncRepo(
			{ owner: repo.owner, name: repo.name },
			{ mode, backfillDays, verbose: false }
		);

		return json({
			success: true,
			owner: repo.owner,
			name: repo.name,
			mode,
			backfillDays
		});
	} catch (err) {
		console.error('Sync failed:', err);
		return error(500, err instanceof Error ? err.message : 'Failed to sync repository');
	}
};

export const prerender = false;
