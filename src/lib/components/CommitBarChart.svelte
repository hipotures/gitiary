<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { RepoSummary } from '$lib/domain/types.js';
	import { theme } from '$lib/stores/theme';
	import { dateRange, type DateRange } from '$lib/stores/dateRange';
	import { getEChartsTheme, getEChartsColors } from '$lib/utils/echarts-themes';
	import { getDisplayName } from '$lib/utils/repoDisplay.js';

	let { repos }: { repos: RepoSummary[] } = $props();

	let chartDom: HTMLDivElement;
	let chart: any;
	let unsubscribeTheme: (() => void) | undefined;
	let unsubscribeDateRange: (() => void) | undefined;

	// Get commit count for selected date range
	function getCommitCount(repo: RepoSummary, range: DateRange): number {
		switch (range) {
			case 7: return repo.commits7d;
			case 30: return repo.commits30d;
			case 90: return repo.commits90d;
			case 180: return repo.commits180d;
			case 360: return repo.commits360d;
			case 'all': return repo.commitsAll;
		}
	}

	const initChart = (currentTheme: 'light' | 'dark', currentRange: DateRange) => {
		import('echarts').then((echarts) => {
			// Dispose existing chart if any
			if (chart) {
				chart.dispose();
			}

			const colors = getEChartsColors(currentTheme);
			chart = echarts.init(chartDom, getEChartsTheme(currentTheme));

			const sorted = [...repos].sort((a, b) => getCommitCount(b, currentRange) - getCommitCount(a, currentRange));

			chart.setOption({
			backgroundColor: 'transparent',
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' }
			},
			grid: {
				left: 12,
				right: 24,
				top: 12,
				bottom: 0,
				containLabel: true
			},
			xAxis: {
				type: 'category',
				data: sorted.map((r) => getDisplayName(r)),
				axisLabel: {
					color: colors.text,
					fontSize: 11,
					rotate: repos.length > 5 ? 30 : 0
				},
				axisLine: { lineStyle: { color: colors.border } },
				axisTick: { show: false }
			},
			yAxis: {
				type: 'value',
				axisLabel: { color: '#7d8590', fontSize: 11 },
				splitLine: { lineStyle: { color: colors.split } }
			},
			series: [
				{
					name: 'Commits',
					type: 'bar',
					data: sorted.map((r) => getCommitCount(r, currentRange)),
					itemStyle: {
						color: colors.accent,
						borderRadius: [2, 2, 0, 0]
					},
					barMaxWidth: 40
				}
			]
		});

			const resizeObserver = new ResizeObserver(() => chart.resize());
			resizeObserver.observe(chartDom);
		});
	};

	onMount(() => {
		initChart($theme, $dateRange);
		unsubscribeTheme = theme.subscribe((newTheme) => {
			if (chart) {
				initChart(newTheme, $dateRange);
			}
		});
		unsubscribeDateRange = dateRange.subscribe((newRange) => {
			if (chart) {
				initChart($theme, newRange);
			}
		});
	});

	onDestroy(() => {
		if (unsubscribeTheme) unsubscribeTheme();
		if (unsubscribeDateRange) unsubscribeDateRange();
		if (chart) chart.dispose();
	});
</script>

<div bind:this={chartDom} class="chart"></div>

<style>
	.chart {
		width: 100%;
		height: 320px;
	}
</style>
