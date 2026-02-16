<script lang="ts">
	import { page } from '$app/state';
	import YearHeatmap from '$lib/components/YearHeatmap.svelte';
	import HeatTimeline from '$lib/components/HeatTimeline.svelte';
	import type { HeatYearData } from '$lib/domain/types.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const years = $derived(data.yearData.map((entry) => entry.year));
	const requestedYear = $derived.by(() => {
		const raw = page.url.searchParams.get('year');
		if (!raw) return null;
		const parsed = Number(raw);
		return Number.isInteger(parsed) ? parsed : null;
	});
	const isCaptureMode = $derived(page.url.searchParams.get('capture') === '1');
	let selectedYear = $state<number>(2025);
	let initializedYear = $state(false);

	$effect(() => {
		const availableYears = years;
		const requested = requestedYear;
		if (!initializedYear) {
			if (requested && availableYears.includes(requested)) {
				selectedYear = requested;
			} else if (isCaptureMode && availableYears.length > 0) {
				selectedYear = availableYears[availableYears.length - 1] ?? data.minYear;
			} else {
				selectedYear = availableYears[0] ?? data.minYear;
			}
			initializedYear = true;
			return;
		}

		if (requested && availableYears.includes(requested)) {
			selectedYear = requested;
			return;
		}

		if (!availableYears.includes(selectedYear)) {
			selectedYear = availableYears[0] ?? data.minYear;
		}
	});

	const selectedYearData = $derived.by(() => {
		const hit = data.yearData.find((entry) => entry.year === selectedYear);
		const fallback: HeatYearData = { year: selectedYear, daily: [], months: [] };
		return hit ?? fallback;
	});

	const totalCommits = $derived(
		selectedYearData.months.reduce((sum, month) => sum + month.totalCommits, 0)
	);
	const activeDays = $derived(selectedYearData.daily.filter((day) => day.commits > 0).length);

	function chooseYear(year: number) {
		selectedYear = year;
	}
</script>

<section class="heat-layout">
	<div class="main-column">
		<section
			class="heat-overview"
			data-shot-section="heat-overview"
			data-shot-title="Heat Overview"
		>
			<header class="heat-header">
				<h1>Heat</h1>
				<p class="subtitle">{totalCommits} contributions in {selectedYear}</p>
			</header>
			<div class="card heatmap-card">
				<YearHeatmap year={selectedYear} daily={selectedYearData.daily} />
			</div>
		</section>

		<section
			class="timeline-section"
			data-shot-section="activity-timeline"
			data-shot-title="Activity Timeline"
		>
			<div class="timeline-header">
				<h2>Activity Timeline</h2>
				<span class="text-secondary">{activeDays} active days</span>
			</div>
			<HeatTimeline year={selectedYear} months={selectedYearData.months} />
		</section>
	</div>
	<aside class="year-selector" aria-label="Year selector">
		{#each years as year (year)}
			<button
				class="year-btn"
				class:active={year === selectedYear}
				aria-pressed={year === selectedYear}
				onclick={() => chooseYear(year)}
			>
				{year}
			</button>
		{/each}
	</aside>
</section>

<style>
	.heat-header {
		margin-bottom: var(--space-lg);
	}

	.subtitle {
		color: var(--color-text-secondary);
	}

	.heat-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 108px;
		gap: var(--space-md);
		align-items: start;
	}

	.main-column {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
		min-width: 0;
	}

	.heatmap-card {
		padding: var(--space-lg);
	}

	.year-selector {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-xs);
		display: flex;
		flex-direction: column;
		gap: 6px;
		position: sticky;
		top: 88px;
	}

	.year-btn {
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 1.45rem;
		line-height: 1;
		padding: 12px 8px;
		border-radius: var(--radius);
		cursor: pointer;
		text-align: left;
		transition:
			border-color 0.2s ease,
			color 0.2s ease,
			background-color 0.2s ease;
	}

	.year-btn:hover {
		color: var(--color-text);
		border-color: var(--color-border);
	}

	.year-btn.active {
		color: var(--color-text);
		border-color: var(--color-accent);
		background: var(--color-surface-hover);
	}

	.timeline-section {
		min-width: 0;
	}

	.timeline-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	@media (max-width: 900px) {
		.heat-layout {
			grid-template-columns: 1fr;
		}

		.year-selector {
			position: static;
			flex-direction: row;
			overflow-x: auto;
		}

		.year-btn {
			font-size: 1.2rem;
			white-space: nowrap;
		}
	}
</style>
