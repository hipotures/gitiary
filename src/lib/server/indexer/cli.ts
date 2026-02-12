import { parseArgs } from 'util';
import { loadConfig } from './config.js';
import { syncRepo } from './sync.js';

async function main() {
	const { values } = parseArgs({
		options: {
			repo: { type: 'string', short: 'r' },
			verbose: { type: 'boolean', short: 'v', default: false },
			config: { type: 'string', short: 'c', default: 'repos.json' }
		}
	});

	const config = loadConfig(values.config);
	const verbose = values.verbose;

	let reposToSync = config.repos;

	// Filter by --repo flag if provided
	if (values.repo) {
		const [owner, name] = values.repo.split('/');
		if (!owner || !name) {
			console.error('Error: --repo must be in format "owner/name"');
			process.exit(1);
		}
		reposToSync = config.repos.filter((r) => r.owner === owner && r.name === name);
		if (reposToSync.length === 0) {
			console.error(`Error: Repo ${values.repo} not found in config`);
			process.exit(1);
		}
	}

	console.log(`Syncing ${reposToSync.length} repositories...`);

	for (const repo of reposToSync) {
		try {
			await syncRepo(repo, verbose);
		} catch (error) {
			console.error(`Failed to sync ${repo.owner}/${repo.name}:`, error);
		}
	}

	console.log('\n✓ All syncs complete');
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
