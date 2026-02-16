<script lang="ts">
	import StatsTable from '$lib/components/StatsTable.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import { dateRange, filterDailyData, getRangeLabel, getDaysFromRange } from '$lib/stores/dateRange';
	import {
		calculateCurrentStreak,
		calculateLongestStreak,
		calculateMaxGap,
		calculateRegularity
	} from '$lib/domain/stats';
	import type { PageData } from './$types.js';
	import type { ComparisonStats } from '$lib/domain/types';

	let { data }: { data: PageData } = $props();

	// Recalculate stats based on selected date range
	const filteredStats = $derived.by(() => {
		const today = new Date().toISOString().slice(0, 10);
		const days = getDaysFromRange($dateRange) || 360;

		const stats: ComparisonStats = {
			period: $dateRange === 'all' ? 'all' : `${$dateRange}d`,
			repos: data.allData.map((item) => {
				const filteredDaily = filterDailyData(item.daily, $dateRange);
				const totalCommits = filteredDaily.reduce((sum, d) => sum + d.commits, 0);
				const activeDays = filteredDaily.filter((d) => d.commits > 0).length;

				return {
					id: item.repo.id,
					owner: item.repo.owner,
					name: item.repo.name,
					displayName: item.repo.displayName,
					totalCommits,
					activeDays,
					regularity: calculateRegularity(filteredDaily, days),
					maxGap: calculateMaxGap(filteredDaily),
					currentStreak: calculateCurrentStreak(filteredDaily, today),
					longestStreak: calculateLongestStreak(filteredDaily),
					firstCommitDate: item.firstCommitDate
				};
			})
		};
		return stats;
	});

	const totalCommits = $derived(filteredStats.repos.reduce((sum, r) => sum + r.totalCommits, 0));
	const activeRepos = $derived(filteredStats.repos.filter((r) => r.totalCommits > 0).length);
	const avgCommitsPerRepo = $derived(
		activeRepos > 0 ? Math.round(totalCommits / activeRepos) : 0
	);
	const topStreak = $derived(Math.max(...filteredStats.repos.map((r) => r.longestStreak), 0));
</script>

<section data-shot-section="comparison-overview" data-shot-title="Repository Comparison">
	<div class="header">
		<h1>Repository Comparison ({getRangeLabel($dateRange)})</h1>
	</div>

	<div class="metrics-grid">
		<MetricCard label="Total Commits" value={totalCommits} />
		<MetricCard label="Active Repos" value={activeRepos} />
		<MetricCard label="Avg/Repo" value={avgCommitsPerRepo} />
		<MetricCard label="Top Streak" value={topStreak} suffix="days" />
	</div>
</section>

<section
	class="table-section"
	data-shot-section="statistics-by-repository"
	data-shot-title="Statistics by Repository"
>
	<h2>Statistics by Repository</h2>
	<StatsTable repos={filteredStats.repos} />
</section>

<style>
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-xl);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.table-section {
		margin-top: var(--space-xl);
	}
</style>
