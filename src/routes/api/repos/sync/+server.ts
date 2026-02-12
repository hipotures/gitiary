import { json, error } from '@sveltejs/kit';
import { fetchAllUserRepos } from '$lib/server/github/client.js';
import { upsertRepo } from '$lib/server/db/queries.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async () => {
	try {
		console.log('Fetching repositories from GitHub...');
		const githubRepos = await fetchAllUserRepos();

		console.log(`Found ${githubRepos.length} repositories`);

		let addedCount = 0;
		let skippedCount = 0;

		for (const ghRepo of githubRepos) {
			const repoId = upsertRepo(ghRepo.owner.login, ghRepo.name);
			if (repoId) {
				addedCount++;
			} else {
				skippedCount++;
			}
		}

		return json({
			success: true,
			total: githubRepos.length,
			added: addedCount,
			skipped: skippedCount
		});
	} catch (err) {
		console.error('Sync failed:', err);
		return error(500, {
			message: 'Failed to sync repositories from GitHub',
			details: err instanceof Error ? err.message : String(err)
		});
	}
};

export const prerender = false;
