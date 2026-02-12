import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface RepoConfig {
	owner: string;
	name: string;
}

export interface Config {
	repos: RepoConfig[];
}

export function loadConfig(path: string = 'repos.json'): Config {
	const fullPath = resolve(path);
	const content = readFileSync(fullPath, 'utf-8');
	const config = JSON.parse(content) as Config;

	if (!config.repos || !Array.isArray(config.repos)) {
		throw new Error('Invalid config: "repos" must be an array');
	}

	for (const repo of config.repos) {
		if (!repo.owner || !repo.name) {
			throw new Error(`Invalid repo config: ${JSON.stringify(repo)}`);
		}
	}

	return config;
}
