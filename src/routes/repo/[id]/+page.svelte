<script lang="ts">
	import TimeSeriesChart from '$lib/components/TimeSeriesChart.svelte';
	import CalendarHeatmap from '$lib/components/CalendarHeatmap.svelte';
	import { dateRange, filterDailyData, getRangeLabel } from '$lib/stores/dateRange';
	import { getDisplayName } from '$lib/utils/repoDisplay.js';
	import { GitFork, GitBranch } from 'lucide-svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const filteredDaily = $derived(filterDailyData(data.daily, $dateRange));
</script>

<div class="repo-header">
	<div class="repo-title-group">
		<h1 class="text-mono">{getDisplayName(data.repo)}</h1>
		{#if data.repo.isFork}
			<span class="fork-badge"><GitFork size={12} /></span>
		{/if}
		{#if data.repo.hasExtraBranches}
			<span class="branch-badge"><GitBranch size={12} /></span>
		{/if}
	</div>
	<a href="/" class="back-link">← Back to repos</a>
</div>

<section
	class="chart-section"
	data-shot-section="repo-commit-activity"
	data-shot-title="Commit Activity"
>
	<h2>Commit Activity ({getRangeLabel($dateRange)})</h2>
	<div class="chart-container">
		<TimeSeriesChart daily={filteredDaily} range={$dateRange} />
	</div>
</section>

<section
	class="chart-section"
	data-shot-section="repo-calendar-heatmap"
	data-shot-title="Calendar Heatmap"
>
	<h2>Calendar Heatmap ({getRangeLabel($dateRange)})</h2>
	<div class="chart-container">
		<CalendarHeatmap daily={filteredDaily} range={$dateRange} />
	</div>
</section>

<style>
	.repo-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-xl);
	}

	.repo-title-group {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.repo-title-group h1 {
		margin: 0;
		font-size: 1.75rem;
	}

	.fork-badge,
	.branch-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 3px;
		border: 1px solid var(--color-accent);
		border-radius: 3px;
		color: var(--color-accent);
		opacity: 0.75;
	}


	.back-link {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.back-link:hover {
		color: var(--color-accent);
	}

	.chart-section {
		margin-bottom: var(--space-xl);
	}

	.chart-section h2 {
		font-size: 1rem;
	}

	.chart-container {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-lg);
		margin-top: var(--space-md);
	}
</style>
