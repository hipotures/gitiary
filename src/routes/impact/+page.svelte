<script lang="ts">
	import MetricCard from '$lib/components/MetricCard.svelte';
	import ImpactNetFilesChart from '$lib/components/ImpactNetFilesChart.svelte';
	import { buildImpactView } from '$lib/domain/impact';
	import { dateRange, getRangeLabel } from '$lib/stores/dateRange';
	import { impactDailyPageSize } from '$lib/stores/impactPagination';
	import { getDisplayName } from '$lib/utils/repoDisplay.js';
	import type { PageData } from './$types.js';

	type RepoSortField =
		| 'name'
		| 'commits'
		| 'additions'
		| 'deletions'
		| 'net'
		| 'filesChanged'
		| 'avgLinesPerCommit'
		| 'avgFilesPerCommit';

	type SortDirection = 'asc' | 'desc';

	let { data }: { data: PageData } = $props();
	let sortField = $state<RepoSortField>('net');
	let sortDirection = $state<SortDirection>('desc');
	let dailyPage = $state(1);

	const impact = $derived(buildImpactView(data.impactData, $dateRange));
	const dailyPagination = $derived.by(() => {
		const pageSize = $impactDailyPageSize;
		const totalRows = impact.dailyRows.length;
		const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
		const currentPage = Math.min(dailyPage, totalPages);
		const start = (currentPage - 1) * pageSize;
		const end = Math.min(start + pageSize, totalRows);

		return {
			totalRows,
			totalPages,
			currentPage,
			start,
			end,
			rows: impact.dailyRows.slice(start, start + pageSize)
		};
	});

	const sortedRepoRows = $derived.by(() => {
		const rows = [...impact.repoRows];
		rows.sort((a, b) => {
			if (sortField === 'name') {
				const an = `${a.owner}/${getDisplayName(a)}`;
				const bn = `${b.owner}/${getDisplayName(b)}`;
				return sortDirection === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
			}

			const av = a[sortField];
			const bv = b[sortField];
			if (typeof av === 'number' && typeof bv === 'number') {
				return sortDirection === 'asc' ? av - bv : bv - av;
			}
			return 0;
		});
		return rows;
	});

	const maxImpact = $derived(Math.max(...impact.dailyRows.map((row) => row.totalChanges), 0));

	$effect(() => {
		const totalPages = Math.max(1, Math.ceil(impact.dailyRows.length / $impactDailyPageSize));
		dailyPage = Math.min(Math.max(1, dailyPage), totalPages);
	});

	$effect(() => {
		$dateRange;
		dailyPage = 1;
	});

	function handleSort(field: RepoSortField) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = field === 'name' ? 'asc' : 'desc';
		}
	}

	function formatInt(value: number): string {
		return value.toLocaleString('en-US');
	}

	function formatFloat(value: number): string {
		return value.toFixed(1);
	}

	function impactBarWidth(totalChanges: number): string {
		if (maxImpact <= 0) return '0%';
		return `${Math.max(3, Math.round((totalChanges / maxImpact) * 100))}%`;
	}

	function sortIndicator(field: RepoSortField): string {
		if (sortField !== field) return '';
		return sortDirection === 'asc' ? '↑' : '↓';
	}

	function goToPreviousDailyPage() {
		dailyPage = Math.max(1, dailyPage - 1);
	}

	function goToNextDailyPage() {
		dailyPage = Math.min(dailyPagination.totalPages, dailyPage + 1);
	}
</script>

<section data-shot-section="impact-overview" data-shot-title="Impact">
	<header class="header">
		<h1>Impact ({getRangeLabel($dateRange)})</h1>
	</header>

	<section class="metrics-grid">
		<MetricCard label="Total Commits" value={impact.summary.totalCommits} />
		<MetricCard label="First Commit" value={impact.summary.firstCommitDate ?? 'N/A'} />
		<MetricCard label="Last Commit" value={impact.summary.lastCommitDate ?? 'N/A'} />
		<MetricCard label="Active Days" value={`${impact.summary.activeDays} / ${impact.summary.totalDays}`} />
		<MetricCard label="Lines Added" value={`+${formatInt(impact.summary.linesAdded)}`} />
		<MetricCard label="Lines Deleted" value={`-${formatInt(impact.summary.linesDeleted)}`} />
		<MetricCard label="Net Change" value={`${impact.summary.netChange >= 0 ? '+' : ''}${formatInt(impact.summary.netChange)}`} />
		<MetricCard label="Files Changed" value={formatInt(impact.summary.filesChanged)} />
		<MetricCard label="Avg Lines/Commit" value={formatFloat(impact.summary.avgLinesPerCommit)} />
		<MetricCard label="Avg Files/Commit" value={formatFloat(impact.summary.avgFilesPerCommit)} />
	</section>
</section>

<section
	class="section"
	data-shot-section="loc-and-files-activity"
	data-shot-title="LOC and Files Activity"
>
	<h2>LOC and Files Activity ({getRangeLabel($dateRange)})</h2>
	<div class="chart-container">
		<ImpactNetFilesChart daily={impact.dailyRows} range={$dateRange} />
	</div>
</section>

<section
	class="section"
	data-shot-section="repository-loc-summary"
	data-shot-title="Repository LOC Summary"
>
	<div class="section-header">
		<h2>Repository LOC Summary</h2>
		<span class="text-secondary">Total Net LOC: {formatInt(impact.summary.netChange)}</span>
	</div>
	<div class="table-container">
		<table>
			<thead>
				<tr>
					<th>
						<button class="sort-btn" onclick={() => handleSort('name')}>
							Repository {sortIndicator('name')}
						</button>
					</th>
					<th class="numeric">
						<button class="sort-btn" onclick={() => handleSort('commits')}>
							Commits {sortIndicator('commits')}
						</button>
					</th>
					<th class="numeric">
						<button class="sort-btn" onclick={() => handleSort('additions')}>
							Lines + {sortIndicator('additions')}
						</button>
					</th>
					<th class="numeric">
						<button class="sort-btn" onclick={() => handleSort('deletions')}>
							Lines - {sortIndicator('deletions')}
						</button>
					</th>
					<th class="numeric">
						<button class="sort-btn" onclick={() => handleSort('net')}>
							Net LOC {sortIndicator('net')}
						</button>
					</th>
					<th class="numeric">
						<button class="sort-btn" onclick={() => handleSort('filesChanged')}>
							Files {sortIndicator('filesChanged')}
						</button>
					</th>
					<th class="numeric">
						<button class="sort-btn" onclick={() => handleSort('avgLinesPerCommit')}>
							Avg Lines {sortIndicator('avgLinesPerCommit')}
						</button>
					</th>
					<th class="numeric">
						<button class="sort-btn" onclick={() => handleSort('avgFilesPerCommit')}>
							Avg Files {sortIndicator('avgFilesPerCommit')}
						</button>
					</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedRepoRows as row (row.id)}
					<tr>
						<td>
							<a href={`/repo/${row.id}`} class="repo-link text-mono">{row.owner}/{getDisplayName(row)}</a>
						</td>
						<td class="numeric">{formatInt(row.commits)}</td>
						<td class="numeric success">+{formatInt(row.additions)}</td>
						<td class="numeric danger">-{formatInt(row.deletions)}</td>
						<td class="numeric">{row.net >= 0 ? '+' : ''}{formatInt(row.net)}</td>
						<td class="numeric">{formatInt(row.filesChanged)}</td>
						<td class="numeric">{formatFloat(row.avgLinesPerCommit)}</td>
						<td class="numeric">{formatFloat(row.avgFilesPerCommit)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<section
	class="section"
	data-shot-section="daily-commit-activity-with-changes"
	data-shot-title="Daily Commit Activity with Changes"
>
	<h2>Daily Commit Activity with Changes</h2>
	<div class="table-container">
		<table>
			<thead>
				<tr>
					<th>Date</th>
					<th class="numeric">Commits</th>
					<th class="numeric">Lines +</th>
					<th class="numeric">Lines -</th>
					<th class="numeric">Net</th>
					<th class="numeric">Files</th>
					<th>Impact</th>
				</tr>
			</thead>
			<tbody>
				{#each dailyPagination.rows as row (row.day)}
					<tr>
						<td class="text-mono">{row.day}</td>
						<td class="numeric">{formatInt(row.commits)}</td>
						<td class="numeric success">+{formatInt(row.additions)}</td>
						<td class="numeric danger">-{formatInt(row.deletions)}</td>
						<td class="numeric">{row.net >= 0 ? '+' : ''}{formatInt(row.net)}</td>
						<td class="numeric">{formatInt(row.filesChanged)}</td>
						<td>
							<div class="impact-bar-wrap">
								<div class="impact-bar" style={`width:${impactBarWidth(row.totalChanges)};`}></div>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if dailyPagination.totalRows > 0}
		<div class="table-pagination">
			<span class="text-secondary">
				Showing {dailyPagination.start + 1}-{dailyPagination.end} of {dailyPagination.totalRows}
			</span>
			<div class="pagination-controls">
				<button
					class="pagination-btn"
					onclick={goToPreviousDailyPage}
					disabled={dailyPagination.currentPage === 1}
				>
					Previous
				</button>
				<span class="text-mono pagination-status">
					Page {dailyPagination.currentPage} / {dailyPagination.totalPages}
				</span>
				<button
					class="pagination-btn"
					onclick={goToNextDailyPage}
					disabled={dailyPagination.currentPage === dailyPagination.totalPages}
				>
					Next
				</button>
			</div>
		</div>
	{/if}
</section>

<section
	class="section top-grid"
	data-shot-section="top-impact-days"
	data-shot-title="Top Impact Days"
>
	<h2>Top Impact Days</h2>
	<div class="card top-card">
		<h3>Most Commits</h3>
		<ol>
			{#each impact.topByCommits as row}
				<li><span>{row.day}</span><span>{formatInt(row.commits)} commits</span></li>
			{/each}
		</ol>
	</div>
	<div class="card top-card">
		<h3>Most Lines Changed</h3>
		<ol>
			{#each impact.topByChanges as row}
				<li><span>{row.day}</span><span>{formatInt(row.totalChanges)} lines</span></li>
			{/each}
		</ol>
	</div>
	<div class="card top-card">
		<h3>Most Files Changed</h3>
		<ol>
			{#each impact.topByFiles as row}
				<li><span>{row.day}</span><span>{formatInt(row.filesChanged)} files</span></li>
			{/each}
		</ol>
	</div>
</section>

<section
	class="section"
	data-shot-section="top-10-largest-commits"
	data-shot-title="Top 10 Largest Commits"
>
	<h2>Top 10 Largest Commits</h2>
	<div class="table-container">
		<table>
			<thead>
				<tr>
					<th>SHA</th>
					<th>Date</th>
					<th>Repo</th>
					<th class="numeric">Changes</th>
					<th class="numeric">Files</th>
					<th>Message</th>
				</tr>
			</thead>
			<tbody>
				{#each impact.largestCommits as commit (`${commit.repoId}-${commit.sha}`)}
					<tr>
						<td class="text-mono">{commit.sha.slice(0, 7)}</td>
						<td class="text-mono">{commit.day}</td>
						<td class="text-mono">{commit.owner}/{getDisplayName(commit)}</td>
						<td class="numeric">{formatInt(commit.totalChanges)}</td>
						<td class="numeric">{formatInt(commit.filesChanged)}</td>
						<td class="message">{commit.message}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<style>
	.header {
		margin-bottom: var(--space-lg);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.metrics-grid :global(.metric-card) {
		padding: var(--space-md);
	}

	.metrics-grid :global(.metric-value) {
		font-size: 1.8rem;
		line-height: 1.1;
		white-space: nowrap;
	}

	.section {
		margin-top: var(--space-xl);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.table-container {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		overflow-x: auto;
	}

	.chart-container {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-lg);
		margin-top: var(--space-md);
	}

	.table-pagination {
		margin-top: var(--space-sm);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.pagination-status {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.pagination-btn {
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		border-radius: var(--radius);
		padding: 0.325rem 0.625rem;
		font-size: 0.8125rem;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.pagination-btn:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.pagination-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	th,
	td {
		padding: var(--space-sm) var(--space-md);
		font-size: 0.875rem;
	}

	th {
		text-align: left;
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
	}

	td {
		border-top: 1px solid var(--color-border);
	}

	.numeric {
		text-align: right;
		font-family: var(--font-mono);
	}

	.success {
		color: var(--color-success);
	}

	.danger {
		color: var(--color-danger);
	}

	.sort-btn {
		background: none;
		border: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 0;
	}

	.sort-btn:hover {
		color: var(--color-text);
	}

	.repo-link {
		color: var(--color-text);
		text-decoration: none;
	}

	.repo-link:hover {
		color: var(--color-accent);
	}

	.impact-bar-wrap {
		height: 12px;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		overflow: hidden;
	}

	.impact-bar {
		height: 100%;
		background: linear-gradient(90deg, #f66a5a, #f85149);
	}

	.top-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
	}

	.top-grid > h2 {
		grid-column: 1 / -1;
		margin-bottom: 0;
	}

	.top-card h3 {
		margin-bottom: var(--space-sm);
	}

	.top-card ol {
		list-style: decimal;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.top-card li {
		display: flex;
		justify-content: space-between;
		gap: var(--space-md);
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}

	.message {
		max-width: 520px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
