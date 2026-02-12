<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { DailyEntry } from '$lib/domain/types.js';
	import type { DateRange } from '$lib/stores/dateRange';
	import { theme } from '$lib/stores/theme';
	import { getEChartsTheme, getEChartsColors } from '$lib/utils/echarts-themes';

	let { daily, range }: { daily: DailyEntry[]; range: DateRange } = $props();

	let chartDom: HTMLDivElement;
	let chart: any;
	let resizeObserver: ResizeObserver | undefined;

	function parseIsoDay(day: string): Date {
		const [year, month, date] = day.split('-').map(Number);
		return new Date(Date.UTC(year, month - 1, date));
	}

	function toIsoDay(date: Date): string {
		return date.toISOString().slice(0, 10);
	}

	function getRangeBounds(): { start: Date; end: Date } {
		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);

		if (range === 'all') {
			if (daily.length === 0) {
				const start = new Date(today);
				start.setUTCDate(start.getUTCDate() - 89);
				return { start, end: today };
			}

			const sortedDays = daily.map((d) => d.day).sort();
			return {
				start: parseIsoDay(sortedDays[0]),
				end: parseIsoDay(sortedDays[sortedDays.length - 1])
			};
		}

		const start = new Date(today);
		start.setUTCDate(start.getUTCDate() - (range - 1));
		return { start, end: today };
	}

	function buildFullData(): Array<{ day: string; commits: number }> {
		const dataMap = new Map(daily.map((d) => [d.day, d.commits]));
		const { start, end } = getRangeBounds();
		const fullData: Array<{ day: string; commits: number }> = [];

		const cursor = new Date(start);
		while (cursor <= end) {
			const day = toIsoDay(cursor);
			fullData.push({ day, commits: dataMap.get(day) || 0 });
			cursor.setUTCDate(cursor.getUTCDate() + 1);
		}

		return fullData;
	}

	const initChart = (currentTheme: 'light' | 'dark') => {
		import('echarts').then((echarts) => {
			if (chart) {
				chart.dispose();
			}
			if (resizeObserver) {
				resizeObserver.disconnect();
			}

			const colors = getEChartsColors(currentTheme);
			chart = echarts.init(chartDom, getEChartsTheme(currentTheme));

			const fullData = buildFullData();
			const numDays = fullData.length;

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
						interval: numDays <= 30 ? 2 : numDays <= 90 ? 6 : numDays <= 180 ? 14 : 30,
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

			resizeObserver = new ResizeObserver(() => {
				if (chart) chart.resize();
			});
			resizeObserver.observe(chartDom);
		});
	};

	onMount(() => {
		initChart($theme);
	});

	$effect(() => {
		if (!chartDom) return;
		const currentTheme = $theme;
		const _daily = daily;
		const _range = range;
		void _daily;
		void _range;
		initChart(currentTheme);
	});

	onDestroy(() => {
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
		if (chart) {
			chart.dispose();
		}
	});
</script>

<div bind:this={chartDom} class="chart"></div>

<style>
	.chart {
		width: 100%;
		height: 320px;
	}
</style>
