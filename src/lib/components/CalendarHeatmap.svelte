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

		// Calculate date range (90 days)
		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);
		const start = new Date(today);
		start.setUTCDate(start.getUTCDate() - 89);

		const startDate = start.toISOString().slice(0, 10);
		const endDate = today.toISOString().slice(0, 10);

		// Prepare data for calendar
		const calendarData = daily.map((d) => [d.day, d.commits]);

		// Find max commits for color scale
		const maxCommits = Math.max(...daily.map((d) => d.commits), 1);

		chart.setOption({
			backgroundColor: 'transparent',
			tooltip: {
				position: 'top',
				formatter: (params: any) => {
					const date = params.data[0];
					const commits = params.data[1];
					return `${date}<br/>${commits} commit${commits !== 1 ? 's' : ''}`;
				}
			},
			visualMap: {
				show: false,
				min: 0,
				max: maxCommits,
				inRange: {
					color: colors.heatmap
				}
			},
			calendar: {
				range: [startDate, endDate],
				cellSize: ['auto', 14],
				splitLine: {
					show: true,
					lineStyle: {
						color: colors.split,
						width: 2
					}
				},
				yearLabel: { show: false },
				monthLabel: {
					nameMap: 'en',
					fontSize: 11,
					color: colors.text
				},
				dayLabel: {
					nameMap: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
					fontSize: 10,
					color: colors.text
				},
				itemStyle: {
					borderWidth: 2,
					borderColor: colors.bg
				}
			},
			series: [
				{
					type: 'heatmap',
					coordinateSystem: 'calendar',
					data: calendarData
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
		height: 180px;
	}
</style>
