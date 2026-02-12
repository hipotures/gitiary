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

	function getRangeBounds(): { startDate: string; endDate: string; numDays: number } {
		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);

		if (range === 'all') {
			if (daily.length === 0) {
				const start = new Date(today);
				start.setUTCDate(start.getUTCDate() - 89);
				return {
					startDate: toIsoDay(start),
					endDate: toIsoDay(today),
					numDays: 90
				};
			}

			const sortedDays = daily.map((d) => d.day).sort();
			const start = parseIsoDay(sortedDays[0]);
			const end = parseIsoDay(sortedDays[sortedDays.length - 1]);
			const numDays =
				Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

			return {
				startDate: toIsoDay(start),
				endDate: toIsoDay(end),
				numDays
			};
		}

		const start = new Date(today);
		start.setUTCDate(start.getUTCDate() - (range - 1));
		return {
			startDate: toIsoDay(start),
			endDate: toIsoDay(today),
			numDays: range
		};
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

			const { startDate, endDate, numDays } = getRangeBounds();
			const calendarData = daily.map((d) => [d.day, d.commits]);
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
					cellSize: ['auto', numDays <= 90 ? 14 : numDays <= 180 ? 12 : numDays <= 360 ? 10 : 8],
					splitLine: {
						show: true,
						lineStyle: {
							color: colors.split,
							width: 2
						}
					},
					yearLabel: { show: numDays > 180 },
					monthLabel: {
						nameMap: 'en',
						fontSize: 11,
						color: colors.text
					},
					dayLabel: {
						nameMap:
							numDays > 180
								? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
								: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
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
		height: 180px;
	}
</style>
