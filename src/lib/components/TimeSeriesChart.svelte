<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { DailyEntry } from '$lib/domain/types.js';
	import { theme } from '$lib/stores/theme';
	import { getEChartsTheme, getEChartsColors } from '$lib/utils/echarts-themes';

	let { daily }: { daily: DailyEntry[] } = $props();

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

		// Fill in missing days with 0 commits
		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);
		const dataMap = new Map(daily.map((d) => [d.day, d.commits]));
		const fullData: Array<{ day: string; commits: number }> = [];

		for (let i = 89; i >= 0; i--) {
			const date = new Date(today);
			date.setUTCDate(date.getUTCDate() - i);
			const day = date.toISOString().slice(0, 10);
			fullData.push({ day, commits: dataMap.get(day) || 0 });
		}

		chart.setOption({
			backgroundColor: 'transparent',
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'line' }
			},
			grid: {
				left: 12,
				right: 24,
				top: 32,
				bottom: 24,
				containLabel: true
			},
			xAxis: {
				type: 'category',
				data: fullData.map((d) => d.day),
				axisLabel: {
					color: colors.text,
					fontSize: 10,
					interval: 'auto',
					formatter: (value: string) => {
						const parts = value.split('-');
						return `${parts[1]}-${parts[2]}`;
					}
				},
				axisLine: { lineStyle: { color: colors.border } },
				axisTick: { show: false }
			},
			yAxis: {
				type: 'value',
				axisLabel: { color: colors.text, fontSize: 11 },
				splitLine: { lineStyle: { color: colors.split } }
			},
			series: [
				{
					name: 'Commits',
					type: 'bar',
					data: fullData.map((d) => d.commits),
					itemStyle: {
						color: colors.accent,
						borderRadius: [2, 2, 0, 0]
					},
					barMaxWidth: 8
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
