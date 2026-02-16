<script lang="ts">
	import StorySection from '$lib/components/StorySection.svelte';
	import { dateRange, filterDailyData, getRangeLabel, getDaysFromRange } from '$lib/stores/dateRange';
	import { generateStorySummary } from '$lib/domain/stats';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	// Generate story based on selected date range
	const story = $derived.by(() => {
		const days = getDaysFromRange($dateRange) || 360;
		const filteredData = data.allData.map((item) => ({
			...item,
			daily: filterDailyData(item.daily, $dateRange)
		}));
		return generateStorySummary(filteredData, days);
	});

	const period = $derived(
		($dateRange === 'all' ? 'all' : `${$dateRange}d`) as
			| '7d'
			| '30d'
			| '90d'
			| '180d'
			| '360d'
			| 'all'
	);
</script>

<section data-shot-section="build-story" data-shot-title="Build Story">
	<h1>Build Story</h1>
	<p class="subtitle">A narrative view of your development activity ({getRangeLabel($dateRange)})</p>

	<StorySection {story} {period} />
</section>

<style>
	.subtitle {
		color: var(--color-text-secondary);
		margin-bottom: var(--space-xl);
	}
</style>
