<script lang="ts">
	import RepoCard from '$lib/components/RepoCard.svelte';
	import CommitBarChart from '$lib/components/CommitBarChart.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<h1>Repositories</h1>

<div class="grid grid-3">
	{#each data.repos as repo (repo.id)}
		<RepoCard {repo} />
	{/each}
</div>

<section class="chart-section">
	<h2>Commits Overview (90 days)</h2>
	<div class="chart-container">
		<CommitBarChart repos={data.repos} />
	</div>
</section>

<style>
	.chart-section {
		margin-top: var(--space-xl);
	}

	.chart-container {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-lg);
		margin-top: var(--space-md);
	}
</style>
