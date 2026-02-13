import { parseArgs } from 'util';
import { loadConfig } from './config.js';
import { syncRepo } from './sync.js';

async function main() {
	const { values } = parseArgs({
		options: {
			repo: { type: 'string', short: 'r' },
			verbose: { type: 'boolean', short: 'v', default: false },
			'backfill-days': { type: 'string', default: '30' },
			'full-history': { type: 'boolean', default: false }
		}
	});

	const config = loadConfig();
	const verbose = values.verbose;
	const backfillDays = parseInt(values['backfill-days'] || '30', 10);
	const fullHistory = values['full-history'];

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
			console.error(`Error: Repo ${values.repo} not found or not active`);
			process.exit(1);
		}
	}

	console.log(`Syncing ${reposToSync.length} active repositories...`);

	let successCount = 0;
	let failCount = 0;

	for (const repo of reposToSync) {
		try {
			await syncRepo(repo, {
				verbose,
				backfillDays,
				mode: fullHistory ? 'full' : 'backfill'
			});
			successCount++;
		} catch (error) {
			failCount++;
			console.error(`[ERROR] Failed to sync ${repo.owner}/${repo.name}:`, error);
		}
	}

	console.log(`\n✓ Sync complete: ${successCount} succeeded, ${failCount} failed`);

	if (failCount > 0) {
		process.exit(1);
	}
}

main().catch((error) => {
	console.error('[FATAL]', error);
	process.exit(1);
});
