<script lang="ts">
	import { onMount } from 'svelte';
	import type { RepoSummary } from '$lib/domain/types.js';

	let { repos }: { repos: RepoSummary[] } = $props();

	let chartDom: HTMLDivElement;

	onMount(async () => {
		const echarts = await import('echarts');
		const chart = echarts.init(chartDom, 'dark');

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
				data: sorted.map((r) => `${r.owner}/${r.name}`),
				axisLabel: {
					color: '#7d8590',
					fontSize: 11,
					rotate: repos.length > 5 ? 30 : 0
				},
				axisLine: { lineStyle: { color: '#30363d' } },
				axisTick: { show: false }
			},
			yAxis: {
				type: 'value',
				axisLabel: { color: '#7d8590', fontSize: 11 },
				splitLine: { lineStyle: { color: '#21262d' } }
			},
			series: [
				{
					name: '7d',
					type: 'bar',
					stack: 'commits',
					data: sorted.map((r) => r.commits7d),
					itemStyle: { color: '#58a6ff' },
					barMaxWidth: 40
				},
				{
					name: '30d',
					type: 'bar',
					stack: 'commits',
					data: sorted.map((r) => r.commits30d - r.commits7d),
					itemStyle: { color: '#388bfd66' },
					barMaxWidth: 40
				},
				{
					name: '90d',
					type: 'bar',
					stack: 'commits',
					data: sorted.map((r) => r.commits90d - r.commits30d),
					itemStyle: { color: '#388bfd33' },
					barMaxWidth: 40
				}
			]
		});

		const resizeObserver = new ResizeObserver(() => chart.resize());
		resizeObserver.observe(chartDom);

		return () => {
			resizeObserver.disconnect();
			chart.dispose();
		};
	});
</script>

<div bind:this={chartDom} class="chart"></div>

<style>
	.chart {
		width: 100%;
		height: 320px;
	}
</style>
