<script lang="ts">
	import type { RepoSummary } from '$lib/domain/types.js';
	import { getDisplayName } from '$lib/utils/repoDisplay.js';
	import { GitFork, GitBranch } from 'lucide-svelte';
	import { dateRange, type DateRange } from '$lib/stores/dateRange.js';

	let { repo }: { repo: RepoSummary } = $props();

	type Stat = { value: number; label: string };

	const allStats: Stat[] = [
		{ value: repo.commits7d,   label: '7d'  },
		{ value: repo.commits30d,  label: '30d' },
		{ value: repo.commits90d,  label: '90d' },
		{ value: repo.commits180d, label: '180d' },
		{ value: repo.commits360d, label: '360d' },
		{ value: repo.commitsAll,  label: 'All' },
	];

	const rangeOrder: DateRange[] = [7, 30, 90, 180, 360, 'all'];

	function visibleStats(range: DateRange): Stat[] {
		const idx = rangeOrder.indexOf(range);
		return allStats.slice(0, idx + 1);
	}
</script>

<a href="/repo/{repo.id}" class="card repo-card">
	{#if repo.isFork}
		<span class="fork-badge"><GitFork size={12} /></span>
	{/if}
	{#if repo.hasExtraBranches}
		<span class="branch-badge"><GitBranch size={12} /></span>
	{/if}
	<div class="repo-header">
		<span class="repo-name text-mono">{getDisplayName(repo)}</span>
	</div>
	<div class="repo-stats" style="grid-template-columns: repeat({visibleStats($dateRange).length}, 1fr)">
		{#each visibleStats($dateRange) as stat}
			<div class="stat">
				<span class="stat-value">{stat.value}</span>
				<span class="stat-label text-secondary">{stat.label}</span>
			</div>
		{/each}
	</div>
</a>

<style>
	.repo-card {
		display: block;
		position: relative;
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

	.fork-badge {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		display: flex;
		align-items: center;
		color: var(--color-accent);
		opacity: 0.75;
	}

	.branch-badge {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		display: flex;
		align-items: center;
		color: var(--color-accent);
		opacity: 0.75;
	}

	/* when fork badge is also present, shift branch badge left */
	:has(.fork-badge) .branch-badge {
		right: calc(var(--space-sm) + 20px);
	}

	.repo-owner {
		font-size: 0.8125rem;
	}

	.repo-name {
		font-weight: 600;
	}

	.repo-stats {
		display: grid;
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
