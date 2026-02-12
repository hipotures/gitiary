import { json, error } from '@sveltejs/kit';
import { updateRepoActiveStatus, getRepoById } from '$lib/server/db/queries.js';
import type { RequestHandler } from './$types.js';

export const PATCH: RequestHandler = async ({ params, request }) => {
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
		const { isActive } = body;

		if (typeof isActive !== 'boolean') {
			return error(400, 'isActive must be a boolean');
		}

		updateRepoActiveStatus(repoId, isActive);

		return json({ success: true, id: repoId, isActive });
	} catch (err) {
		console.error('Failed to update repo:', err);
		return error(500, 'Failed to update repository');
	}
};

export const prerender = false;
