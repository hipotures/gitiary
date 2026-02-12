<script lang="ts">
	import TimeSeriesChart from '$lib/components/TimeSeriesChart.svelte';
	import CalendarHeatmap from '$lib/components/CalendarHeatmap.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<div class="repo-header">
	<h1 class="text-mono">{data.repo.name}</h1>
	<a href="/" class="back-link">← Back to repos</a>
</div>

<section class="chart-section">
	<h2>Commit Activity (90 days)</h2>
	<div class="chart-container">
		<TimeSeriesChart daily={data.daily} />
	</div>
</section>

<section class="chart-section">
	<h2>Calendar Heatmap</h2>
	<div class="chart-container">
		<CalendarHeatmap daily={data.daily} />
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
