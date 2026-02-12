import { json, error } from '@sveltejs/kit';
import {
	updateRepoActiveStatus,
	getRepoById,
	deleteRepo,
	updateRepoDisplayName
} from '$lib/server/db/queries.js';
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
		const { isActive, displayName } = body;

		// Handle isActive update
		if (typeof isActive === 'boolean') {
			updateRepoActiveStatus(repoId, isActive);
		}

		// Handle displayName update
		if ('displayName' in body) {
			if (displayName !== null && typeof displayName !== 'string') {
				return error(400, 'displayName must be a string or null');
			}
			// Trim and convert empty strings to null
			const trimmed = displayName?.trim();
			const finalValue = trimmed && trimmed.length > 0 ? trimmed : null;
			updateRepoDisplayName(repoId, finalValue);
		}

		return json({
			success: true,
			id: repoId,
			isActive: repo.isActive,
			displayName: body.displayName
		});
	} catch (err) {
		console.error('Failed to update repo:', err);
		return error(500, 'Failed to update repository');
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const repoId = parseInt(params.id, 10);

	if (isNaN(repoId)) {
		return error(400, 'Invalid repository ID');
	}

	const repo = getRepoById(repoId);
	if (!repo) {
		return error(404, 'Repository not found');
	}

	try {
		deleteRepo(repoId);

		return json({
			success: true,
			id: repoId,
			owner: repo.owner,
			name: repo.name
		});
	} catch (err) {
		console.error('Delete failed:', err);
		return error(500, {
			message: 'Failed to delete repository',
			details: err instanceof Error ? err.message : String(err)
		});
	}
};

export const prerender = false;
