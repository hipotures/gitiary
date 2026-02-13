<script lang="ts">
import MetricCard from './MetricCard.svelte';
import type { StorySummary } from '$lib/domain/stats.js';
import { getDisplayName } from '$lib/utils/repoDisplay.js';

	let { story, period }: { story: StorySummary; period: '7d' | '30d' | '90d' | '180d' | '360d' | 'all' } = $props();

	const periodLabel = $derived.by(() => {
		if (period === 'all') return 'All Time';
		return `Last ${period.replace('d', '')} Days`;
	});
	const activityRate = $derived(
		story.totalDays > 0 ? Math.round((story.activeDays / story.totalDays) * 100) : 0
	);
</script>

<section class="story-section">
	<h2>{periodLabel}</h2>

	<div class="metrics-grid">
		<MetricCard label="Total Commits" value={story.totalCommits} />
		<MetricCard label="Active Days" value={story.activeDays} />
		<MetricCard label="Activity Rate" value={activityRate} suffix="%" />
		<MetricCard label="Longest Streak" value={story.longestStreak} suffix="days" />
	</div>

	{#if story.mostActiveRepo}
		<div class="card highlight-card">
			<h3>Most Active Repository</h3>
			<p class="repo-name text-mono">
				{getDisplayName(story.mostActiveRepo)}
			</p>
			<p class="metric">
				<span class="value">{story.mostActiveRepo.commits}</span>
				<span class="text-secondary">commits</span>
			</p>
		</div>
	{/if}

	{#if story.mostConsistentRepo && story.mostConsistentRepo.regularity > 0}
		<div class="card highlight-card">
			<h3>Most Consistent Repository</h3>
			<p class="repo-name text-mono">
				{getDisplayName(story.mostConsistentRepo)}
			</p>
			<p class="metric">
				<span class="value">{Math.round(story.mostConsistentRepo.regularity * 100)}%</span>
				<span class="text-secondary">regularity</span>
			</p>
		</div>
	{/if}

	{#if story.highlights.length > 0}
		<div class="card highlights-card">
			<h3>Notable Days</h3>
			<p class="text-secondary highlights-subtitle">
				Days with exceptional activity (above average + 1.5σ)
			</p>
			<div class="highlights-list">
				{#each story.highlights as highlight}
					<div class="highlight-item">
						<div class="highlight-date">{highlight.day}</div>
						<div class="highlight-commits">
							<span class="value">{highlight.commits}</span> commits
						</div>
						<div class="highlight-repos">
							{#each highlight.repos as repo, i}
								<span class="badge">{repo}</span>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>

<style>
	.story-section {
		margin-bottom: calc(var(--space-xl) * 2);
		padding-bottom: calc(var(--space-xl) * 2);
		border-bottom: 1px solid var(--color-border);
	}

	.story-section:last-child {
		border-bottom: none;
	}

	h2 {
		margin-bottom: var(--space-lg);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.highlight-card {
		margin-bottom: var(--space-md);
	}

	h3 {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: var(--space-sm);
	}

	.repo-name {
		font-size: 1.125rem;
		margin-bottom: var(--space-xs);
	}

	.metric {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
	}

	.metric .value {
		font-size: 1.5rem;
		font-weight: 700;
		font-family: var(--font-mono);
		color: var(--color-accent);
	}

	.highlights-card {
		margin-top: var(--space-lg);
	}

	.highlights-subtitle {
		font-size: 0.8125rem;
		margin-bottom: var(--space-md);
	}

	.highlights-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.highlight-item {
		padding: var(--space-md);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
	}

	.highlight-date {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: var(--space-xs);
	}

	.highlight-commits {
		font-size: 1rem;
		margin-bottom: var(--space-sm);
	}

	.highlight-commits .value {
		font-weight: 700;
		font-family: var(--font-mono);
		color: var(--color-accent);
	}

	.highlight-repos {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}
</style>
