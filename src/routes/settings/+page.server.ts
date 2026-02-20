import pkg from '../../../package.json';
import { getAllRepos, getMetadata, getAuthorEmails, getDefaultBranch } from '$lib/server/db/queries.js';

export function load() {
	const repos = getAllRepos();
	const lastGithubSync = getMetadata('lastGithubSync');
	const authorEmails = getAuthorEmails();
	const defaultBranch = getDefaultBranch();

	// Sort: active first (alphabetically), then inactive (alphabetically)
	const sortedRepos = repos.sort((a, b) => {
		if (a.isActive !== b.isActive) {
			return a.isActive ? -1 : 1;
		}
		const fullNameA = `${a.owner}/${a.name}`;
		const fullNameB = `${b.owner}/${b.name}`;
		return fullNameA.localeCompare(fullNameB);
	});

	return {
		version: pkg.version,
		repos: sortedRepos,
		lastGithubSync,
		authorEmails,
		defaultBranch
	};
}

export const prerender = false;
