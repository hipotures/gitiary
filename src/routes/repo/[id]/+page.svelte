<script lang="ts">
	import TimeSeriesChart from '$lib/components/TimeSeriesChart.svelte';
	import CalendarHeatmap from '$lib/components/CalendarHeatmap.svelte';
	import { dateRange, filterDailyData, getRangeLabel } from '$lib/stores/dateRange';
	import { getDisplayName } from '$lib/utils/repoDisplay.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const filteredDaily = $derived(filterDailyData(data.daily, $dateRange));
</script>

<div class="repo-header">
	<h1 class="text-mono">{getDisplayName(data.repo)}</h1>
	<a href="/" class="back-link">← Back to repos</a>
</div>

<section class="chart-section">
	<h2>Commit Activity ({getRangeLabel($dateRange)})</h2>
	<div class="chart-container">
		<TimeSeriesChart daily={filteredDaily} range={$dateRange} />
	</div>
</section>

<section class="chart-section">
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

	.chart-container {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-lg);
		margin-top: var(--space-md);
	}
</style>
