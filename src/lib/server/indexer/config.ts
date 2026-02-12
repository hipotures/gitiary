import { getActiveRepos } from '../db/queries.js';

export interface RepoConfig {
	owner: string;
	name: string;
}

export interface Config {
	repos: RepoConfig[];
}

export function loadConfig(): Config {
	// Load active repos from database
	const activeRepos = getActiveRepos();

	if (activeRepos.length === 0) {
		console.warn('No active repositories found in database');
	}

	return { repos: activeRepos };
}
