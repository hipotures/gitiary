<script lang="ts">
	import type { RepoSummary } from '$lib/domain/types.js';

	let { repo }: { repo: RepoSummary } = $props();

	// Calculate days since first commit for "All" label
	const allDaysLabel = $derived(() => {
		if (repo.commitsAll === 0) return 'All';
		// This is approximate - actual calculation would need first commit date from DB
		// For now just show "All"
		return 'All';
	});
</script>

<a href="/repo/{repo.id}" class="card repo-card">
	<div class="repo-header">
		<span class="repo-owner text-secondary text-mono">{repo.owner}/</span>
		<span class="repo-name text-mono">{repo.name}</span>
	</div>
	<div class="repo-stats">
		<div class="stat">
			<span class="stat-value">{repo.commits7d}</span>
			<span class="stat-label text-secondary">7d</span>
		</div>
		<div class="stat">
			<span class="stat-value">{repo.commits30d}</span>
			<span class="stat-label text-secondary">30d</span>
		</div>
		<div class="stat">
			<span class="stat-value">{repo.commits90d}</span>
			<span class="stat-label text-secondary">90d</span>
		</div>
		<div class="stat">
			<span class="stat-value">{repo.commits180d}</span>
			<span class="stat-label text-secondary">180d</span>
		</div>
		<div class="stat">
			<span class="stat-value">{repo.commits360d}</span>
			<span class="stat-label text-secondary">360d</span>
		</div>
		<div class="stat">
			<span class="stat-value">{repo.commitsAll}</span>
			<span class="stat-label text-secondary">{allDaysLabel()}</span>
		</div>
	</div>
</a>

<style>
	.repo-card {
		display: block;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s;
	}

	.repo-card:hover {
		text-decoration: none;
	}

	.repo-header {
		margin-bottom: var(--space-md);
	}

	.repo-owner {
		font-size: 0.8125rem;
	}

	.repo-name {
		font-weight: 600;
	}

	.repo-stats {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: var(--space-sm);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		font-family: var(--font-mono);
		line-height: 1;
	}

	.stat-label {
		font-size: 0.7rem;
		margin-top: var(--space-xs);
	}
</style>
