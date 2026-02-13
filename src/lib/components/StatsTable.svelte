<script lang="ts">
	import { sortRepos, type SortField, type SortDirection } from '$lib/domain/rankings.js';
	import type { ComparisonRepo } from '$lib/domain/types.js';
	import { getDisplayName } from '$lib/utils/repoDisplay.js';

	let { repos }: { repos: ComparisonRepo[] } = $props();

	let sortField = $state<SortField>('totalCommits');
	let sortDirection = $state<SortDirection>('desc');

	const sortedRepos = $derived(sortRepos(repos, sortField, sortDirection));

	function handleSort(field: SortField) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = field === 'name' ? 'asc' : 'desc';
		}
	}

	function formatPercent(value: number): string {
		return `${Math.round(value * 100)}%`;
	}
</script>

<div class="table-container">
	<table>
		<thead>
			<tr>
				<th>
					<button class="sort-btn" onclick={() => handleSort('name')}>
						Repository
						{#if sortField === 'name'}
							<span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="numeric">
					<button class="sort-btn" onclick={() => handleSort('firstCommitDate')}>
						First Commit
						{#if sortField === 'firstCommitDate'}
							<span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="numeric">
					<button class="sort-btn" onclick={() => handleSort('totalCommits')}>
						Commits
						{#if sortField === 'totalCommits'}
							<span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="numeric">
					<button class="sort-btn" onclick={() => handleSort('activeDays')}>
						Active Days
						{#if sortField === 'activeDays'}
							<span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="numeric">
					<button class="sort-btn" onclick={() => handleSort('regularity')}>
						Regularity
						{#if sortField === 'regularity'}
							<span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="numeric">
					<button class="sort-btn" onclick={() => handleSort('maxGap')}>
						Max Gap
						{#if sortField === 'maxGap'}
							<span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="numeric">
					<button class="sort-btn" onclick={() => handleSort('currentStreak')}>
						Current Streak
						{#if sortField === 'currentStreak'}
							<span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
				<th class="numeric">
					<button class="sort-btn" onclick={() => handleSort('longestStreak')}>
						Longest Streak
						{#if sortField === 'longestStreak'}
							<span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each sortedRepos as repo (repo.id)}
				<tr>
					<td>
						<a href="/repo/{repo.id}" class="repo-link text-mono">
							{getDisplayName(repo)}
						</a>
					</td>
					<td class="numeric">{repo.firstCommitDate ?? 'N/A'}</td>
					<td class="numeric">{repo.totalCommits}</td>
					<td class="numeric">{repo.activeDays}</td>
					<td class="numeric">{formatPercent(repo.regularity)}</td>
					<td class="numeric">{repo.maxGap}d</td>
					<td class="numeric">{repo.currentStreak}d</td>
					<td class="numeric">{repo.longestStreak}d</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.table-container {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	th {
		padding: var(--space-md);
		text-align: left;
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
	}

	th.numeric {
		text-align: right;
	}

	.sort-btn {
		background: none;
		border: none;
		color: inherit;
		font: inherit;
		padding: 0;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		width: 100%;
		justify-content: flex-start;
	}

	th.numeric .sort-btn {
		justify-content: flex-end;
	}

	.sort-btn:hover {
		color: var(--color-text);
	}

	.sort-indicator {
		font-size: 0.75rem;
		color: var(--color-accent);
	}

	td {
		padding: var(--space-md);
		border-top: 1px solid var(--color-border);
		font-size: 0.875rem;
	}

	td.numeric {
		text-align: right;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}

	tbody tr:hover {
		background: var(--color-surface-hover);
	}

	.repo-link {
		text-decoration: none;
		color: var(--color-text);
	}

	.repo-link:hover {
		color: var(--color-accent);
	}
</style>
