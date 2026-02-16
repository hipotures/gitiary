<script lang="ts">
	import { getDisplayName } from '$lib/utils/repoDisplay.js';
	import type { HeatMonthSection } from '$lib/domain/types.js';
	import { page } from '$app/state';

	let { year, months }: { year: number; months: HeatMonthSection[] } = $props();
	const isCaptureMode = $derived(page.url.searchParams.get('capture') === '1');

	let visibleMonthCount = $state(3);

	$effect(() => {
		const _year = year;
		void _year;
		visibleMonthCount = isCaptureMode ? months.length : 3;
	});

	const visibleMonths = $derived(months.slice(0, visibleMonthCount));
	const hasMore = $derived(visibleMonthCount < months.length);

	function formatMonth(month: string): string {
		const [y, m] = month.split('-').map(Number);
		const date = new Date(Date.UTC(y, m - 1, 1));
		return date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
	}

	function showMoreActivity() {
		visibleMonthCount = Math.min(months.length, visibleMonthCount + 3);
	}

	function maxCommitsInMonth(month: HeatMonthSection): number {
		return Math.max(...month.repos.map((repo) => repo.commits), 1);
	}

	function barWidth(commits: number, maxCommits: number): string {
		const ratio = Math.max(0.08, commits / maxCommits);
		return `${Math.round(ratio * 100)}%`;
	}

	function barClass(commits: number, maxCommits: number): string {
		const ratio = commits / maxCommits;
		if (ratio >= 0.75) return 'bar-l4';
		if (ratio >= 0.5) return 'bar-l3';
		if (ratio >= 0.25) return 'bar-l2';
		return 'bar-l1';
	}
</script>

<section class="timeline">
	{#if months.length === 0}
		<div class="card empty-state">No commit activity in {year}.</div>
	{:else}
		{#each visibleMonths as month, index (month.month)}
			<article class="month-row">
				<div class="month-marker" aria-hidden="true">
					<span class="dot"></span>
					{#if index < visibleMonths.length - 1}
						<span class="line"></span>
					{/if}
				</div>

				<div class="month-content">
					<h3>{formatMonth(month.month)}</h3>
					<p class="month-summary">
						Created {month.totalCommits} commit{month.totalCommits !== 1 ? 's' : ''} in
						{month.repos.length} repositor{month.repos.length === 1 ? 'y' : 'ies'}
					</p>

					<ul class="repo-list">
						{#each month.repos as repoItem (`${month.month}-${repoItem.repoId}`)}
							<li class="repo-item">
								<div class="repo-meta">
									<a href={`/repo/${repoItem.repoId}`} class="repo-link">
										{repoItem.owner}/{getDisplayName(repoItem)}
									</a>
									<span class="repo-commits text-secondary">
										{repoItem.commits} commit{repoItem.commits !== 1 ? 's' : ''}
									</span>
								</div>
								<div class="repo-bar-wrap" aria-hidden="true">
									<div
										class={`repo-bar ${barClass(repoItem.commits, maxCommitsInMonth(month))}`}
										style={`width:${barWidth(repoItem.commits, maxCommitsInMonth(month))};`}
									></div>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			</article>
		{/each}

		{#if hasMore}
			<div class="show-more-wrap">
				<button class="show-more-btn" onclick={showMoreActivity}>Show more activity</button>
			</div>
		{/if}
	{/if}
</section>

<style>
	.timeline {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.empty-state {
		color: var(--color-text-secondary);
	}

	.month-row {
		display: grid;
		grid-template-columns: 28px 1fr;
		gap: var(--space-md);
	}

	.month-marker {
		position: relative;
		display: flex;
		justify-content: center;
	}

	.dot {
		margin-top: 7px;
		width: 10px;
		height: 10px;
		border-radius: 999px;
		background: var(--color-accent);
		border: 2px solid var(--color-surface);
	}

	.line {
		position: absolute;
		top: 21px;
		bottom: -16px;
		width: 1px;
		background: var(--color-border);
	}

	.month-content {
		border-bottom: 1px solid var(--color-border);
		padding-bottom: var(--space-lg);
	}

	h3 {
		margin: 0;
		font-size: 1.75rem;
		line-height: 1;
		font-weight: 700;
	}

	.month-summary {
		margin-top: var(--space-sm);
		color: var(--color-text-secondary);
	}

	.repo-list {
		margin-top: var(--space-md);
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.repo-item {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 190px;
		gap: var(--space-md);
		align-items: center;
	}

	.repo-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.repo-link {
		display: inline-flex;
		align-items: center;
		padding: 3px 10px;
		font-size: 1rem;
		font-family: var(--font-mono);
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		text-decoration: none;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease,
			color 0.2s ease;
	}

	.repo-link:visited {
		color: var(--color-text);
	}

	.repo-link:hover {
		text-decoration: none;
		border-color: var(--color-accent);
		background: var(--color-surface-hover);
	}

	.repo-commits {
		font-size: 1.125rem;
	}

	.repo-bar-wrap {
		height: 12px;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	.repo-bar {
		height: 12px;
		border-radius: 999px;
		min-width: 8px;
	}

	.bar-l1 {
		background: #9be9a8;
	}

	.bar-l2 {
		background: #40c463;
	}

	.bar-l3 {
		background: #2ea043;
	}

	.bar-l4 {
		background: #238636;
	}

	.show-more-wrap {
		display: flex;
		justify-content: center;
	}

	.show-more-btn {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius);
		cursor: pointer;
		font-size: 0.95rem;
		transition: border-color 0.2s ease;
	}

	.show-more-btn:hover {
		border-color: var(--color-accent);
	}

	@media (max-width: 768px) {
		h3 {
			font-size: 1.4rem;
		}

		.repo-link,
		.repo-commits {
			font-size: 1rem;
		}

		.repo-item {
			grid-template-columns: 1fr;
			gap: var(--space-sm);
		}

		.repo-bar-wrap {
			width: 100%;
			max-width: 220px;
		}
	}
</style>
