<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { RepoSummary } from '$lib/domain/types.js';
	import { theme } from '$lib/stores/theme';
	import { getEChartsTheme, getEChartsColors } from '$lib/utils/echarts-themes';

	let { repos }: { repos: RepoSummary[] } = $props();

	let chartDom: HTMLDivElement;
	let chart: any;
	let unsubscribe: (() => void) | undefined;

	const initChart = (currentTheme: 'light' | 'dark') => {
		import('echarts').then((echarts) => {
			// Dispose existing chart if any
			if (chart) {
				chart.dispose();
			}

			const colors = getEChartsColors(currentTheme);
			chart = echarts.init(chartDom, getEChartsTheme(currentTheme));

			const sorted = [...repos].sort((a, b) => b.commits90d - a.commits90d);

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
				data: sorted.map((r) => r.name),
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
					name: '7d',
					type: 'bar',
					stack: 'commits',
					data: sorted.map((r) => r.commits7d),
					itemStyle: { color: colors.accent },
					barMaxWidth: 40
				},
				{
					name: '30d',
					type: 'bar',
					stack: 'commits',
					data: sorted.map((r) => r.commits30d - r.commits7d),
					itemStyle: { color: colors.accentAlpha66 },
					barMaxWidth: 40
				},
				{
					name: '90d',
					type: 'bar',
					stack: 'commits',
					data: sorted.map((r) => r.commits90d - r.commits30d),
					itemStyle: { color: colors.accentAlpha33 },
					barMaxWidth: 40
				}
			]
		});

			const resizeObserver = new ResizeObserver(() => chart.resize());
			resizeObserver.observe(chartDom);
		});
	};

	onMount(() => {
		initChart($theme);
		unsubscribe = theme.subscribe((newTheme) => {
			if (chart) {
				initChart(newTheme);
			}
		});
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
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
