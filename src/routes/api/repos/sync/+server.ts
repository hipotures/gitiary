import { json, error } from '@sveltejs/kit';
import { fetchAllUserRepos } from '$lib/server/github/client.js';
import { upsertRepo, setMetadata } from '$lib/server/db/queries.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async () => {
	try {
		console.log('Fetching repositories from GitHub...');
		const githubRepos = await fetchAllUserRepos();

		console.log(`Found ${githubRepos.length} repositories`);

		let addedCount = 0;
		let skippedCount = 0;

		for (const ghRepo of githubRepos) {
			const repoId = upsertRepo(ghRepo.owner.login, ghRepo.name, ghRepo.isFork, ghRepo.pushedAt ?? null, ghRepo.refs?.totalCount ?? 0);
			if (repoId) {
				addedCount++;
			} else {
				skippedCount++;
			}
		}

		// Save last GitHub sync timestamp
		setMetadata('lastGithubSync', new Date().toISOString());

		return json({
			success: true,
			total: githubRepos.length,
			added: addedCount,
			skipped: skippedCount
		});
	} catch (err) {
		console.error('Sync failed:', err);
		return error(
			500,
			err instanceof Error ? err.message : 'Failed to sync repositories from GitHub'
		);
	}
};

export const prerender = false;
