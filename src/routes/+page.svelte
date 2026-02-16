<script lang="ts">
	import RepoCard from '$lib/components/RepoCard.svelte';
	import CommitBarChart from '$lib/components/CommitBarChart.svelte';
	import { dateRange, getRangeLabel } from '$lib/stores/dateRange';
	import { sortRepoSummaries } from '$lib/domain/repoSort';
	import { repoSort } from '$lib/stores/repoSort';
	import type { RepoSortField, SortDirection } from '$lib/domain/repoSort';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	// Local state for temporary in-page sorting (overrides stored preference)
	let localSortField = $state<RepoSortField | null>(null);
	let localSortDirection = $state<SortDirection | null>(null);

	// Effective sort (local override or stored preference)
	const effectiveSortField = $derived(localSortField ?? $repoSort.field);
	const effectiveSortDirection = $derived(localSortDirection ?? $repoSort.direction);

	// Reactive sorted repos
	const sortedRepos = $derived(
		sortRepoSummaries(data.repos, effectiveSortField, effectiveSortDirection)
	);

	function handleSort(field: RepoSortField) {
		if (effectiveSortField === field) {
			// Toggle direction
			localSortDirection = effectiveSortDirection === 'asc' ? 'desc' : 'asc';
			localSortField = field;
		} else {
			// New field with default direction
			localSortField = field;
			localSortDirection = field === 'name' ? 'asc' : 'desc';
		}
	}
</script>

<section data-shot-section="repositories" data-shot-title="Repositories">
	<div class="repos-header">
		<h1>Repositories</h1>
		<div class="sort-controls">
			<button class="sort-btn" onclick={() => handleSort('name')}>
				Name
				{#if effectiveSortField === 'name'}
					<span class="sort-indicator">{effectiveSortDirection === 'asc' ? '↑' : '↓'}</span>
				{/if}
			</button>
			<button class="sort-btn" onclick={() => handleSort('firstCommitDate')}>
				First Commit
				{#if effectiveSortField === 'firstCommitDate'}
					<span class="sort-indicator">{effectiveSortDirection === 'asc' ? '↑' : '↓'}</span>
				{/if}
			</button>
			<button class="sort-btn" onclick={() => handleSort('totalCommits')}>
				Total Commits
				{#if effectiveSortField === 'totalCommits'}
					<span class="sort-indicator">{effectiveSortDirection === 'asc' ? '↑' : '↓'}</span>
				{/if}
			</button>
		</div>
	</div>

	<div class="grid grid-3">
		{#each sortedRepos as repo (repo.id)}
			<RepoCard {repo} />
		{/each}
	</div>
</section>

<section class="chart-section" data-shot-section="commits-overview" data-shot-title="Commits Overview">
	<h2>Commits Overview ({getRangeLabel($dateRange)})</h2>
	<div class="chart-container">
		<CommitBarChart repos={data.repos} />
	</div>
</section>

<style>
	.repos-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.repos-header h1 {
		margin: 0;
	}

	.sort-controls {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.sort-btn {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius);
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		transition: all 0.2s ease;
	}

	.sort-btn:hover {
		color: var(--color-text);
		border-color: var(--color-accent);
	}

	.sort-indicator {
		color: var(--color-accent);
		font-weight: 600;
	}

	.chart-section {
		margin-top: var(--space-xl);
	}

	.chart-container {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-lg);
		margin-top: var(--space-md);
	}
</style>
