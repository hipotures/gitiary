<script lang="ts">
	import { theme } from '$lib/stores/theme';
	import { getEChartsColors } from '$lib/utils/echarts-themes';
	import type { HeatDailyEntry } from '$lib/domain/types.js';

	type Cell = {
		iso: string;
		commits: number;
		inYear: boolean;
		level: number;
	};

	type MonthLabel = {
		name: string;
		column: number;
	};

	let { year, daily }: { year: number; daily: HeatDailyEntry[] } = $props();

	const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	function iso(date: Date): string {
		return date.toISOString().slice(0, 10);
	}

	function mondayIndex(date: Date): number {
		return (date.getUTCDay() + 6) % 7;
	}

	function level(commits: number, maxCommits: number): number {
		if (commits <= 0) return 0;
		if (maxCommits <= 0) return 1;
		return Math.max(1, Math.min(4, Math.ceil((commits / maxCommits) * 4)));
	}

	const palette = $derived(getEChartsColors($theme).heatmap);
	const emptyColor = $derived($theme === 'dark' ? '#273042' : '#ebedf0');
	const gapColor = $derived($theme === 'dark' ? '#161b22' : '#f6f8fa');

	const dataMap = $derived(new Map(daily.map((d) => [d.day, d.commits])));
	const maxCommits = $derived(Math.max(...daily.map((d) => d.commits), 0));

	const grid = $derived.by(() => {
		const jan1 = new Date(Date.UTC(year, 0, 1));
		const dec31 = new Date(Date.UTC(year, 11, 31));
		const start = new Date(jan1);
		start.setUTCDate(start.getUTCDate() - mondayIndex(jan1));

		const weeks: Cell[][] = [];
		const monthColumns = new Map<number, number>();
		let cursor = new Date(start);

		while (cursor <= dec31) {
			const week: Cell[] = [];
			for (let row = 0; row < 7; row++) {
				const day = new Date(cursor);
				const dayIso = iso(day);
				const inYear = day.getUTCFullYear() === year;
				const commits = inYear ? dataMap.get(dayIso) ?? 0 : 0;
				week.push({
					iso: dayIso,
					commits,
					inYear,
					level: inYear ? level(commits, maxCommits) : 0
				});

				if (inYear && day.getUTCDate() === 1) {
					monthColumns.set(day.getUTCMonth(), weeks.length);
				}
				cursor.setUTCDate(cursor.getUTCDate() + 1);
			}
			weeks.push(week);
		}

		const months: MonthLabel[] = [];
		for (let month = 0; month < 12; month++) {
			const column = monthColumns.get(month);
			if (column !== undefined) {
				months.push({ name: monthShort[month], column });
			}
		}

		return { weeks, months };
	});

	const shownWeekdays = $derived(
		weekdayNames.map((name, idx) => ({ name, show: idx === 0 || idx === 2 || idx === 4 }))
	);
	const weekCount = $derived(grid.weeks.length);
</script>

<div class="heatmap-shell">
	<div class="calendar-wrap">
		<div class="month-row">
			<div class="month-spacer"></div>
			<div
				class="months"
				style={`--week-count:${weekCount}; width: calc(var(--week-count) * (var(--cell-size) + var(--cell-gap)) - var(--cell-gap));`}
			>
				{#each grid.months as month (month.name)}
					<span class="month-label" style={`left: calc(${month.column} * (var(--cell-size) + var(--cell-gap)))`}>
						{month.name}
					</span>
				{/each}
			</div>
		</div>

		<div class="matrix-row">
			<div class="day-labels">
				{#each shownWeekdays as day}
					<div class="day-label">{day.show ? day.name : ''}</div>
				{/each}
			</div>

			<div
				class="weeks-area"
				style={`--week-count:${weekCount}; width: calc(var(--week-count) * (var(--cell-size) + var(--cell-gap)) - var(--cell-gap));`}
			>
				{#each grid.weeks as week, weekIndex (`week-${weekIndex}`)}
					<div class="week-col">
						{#each week as cell (`${cell.iso}-${weekIndex}`)}
							<div
								class="cell"
								style={`background:${cell.inYear ? (cell.level === 0 ? emptyColor : palette[cell.level]) : 'transparent'}; border-color:${gapColor};`}
								title={`${cell.iso}: ${cell.commits} commit${cell.commits !== 1 ? 's' : ''}`}
							></div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="legend-row">
		<span></span>
		<div class="legend-scale">
			<span>Less</span>
			<div class="swatches">
				{#each palette as color, idx}
					<span
						class="swatch"
						style={`background:${idx === 0 ? emptyColor : color}; border-color:${gapColor};`}
					></span>
				{/each}
			</div>
			<span>More</span>
		</div>
	</div>
</div>

<style>
	.heatmap-shell {
		--cell-size: 13px;
		--cell-gap: 4px;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.calendar-wrap {
		overflow-x: auto;
		padding-bottom: var(--space-xs);
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.calendar-wrap::-webkit-scrollbar {
		display: none;
	}

	.month-row {
		display: grid;
		grid-template-columns: 48px 1fr;
		align-items: end;
		margin-bottom: var(--space-xs);
	}

	.months {
		position: relative;
		height: 20px;
	}

	.month-label {
		position: absolute;
		font-size: 0.88rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.matrix-row {
		display: grid;
		grid-template-columns: 48px 1fr;
	}

	.day-labels {
		display: grid;
		grid-template-rows: repeat(7, var(--cell-size));
		row-gap: var(--cell-gap);
		align-items: center;
	}

	.day-label {
		font-size: 0.84rem;
		color: var(--color-text-secondary);
		line-height: 1;
	}

	.weeks-area {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: var(--cell-size);
		column-gap: var(--cell-gap);
	}

	.week-col {
		display: grid;
		grid-template-rows: repeat(7, var(--cell-size));
		row-gap: var(--cell-gap);
		width: var(--cell-size);
	}

	.cell {
		width: var(--cell-size);
		height: var(--cell-size);
		border-radius: 3px;
		border: 1px solid transparent;
	}

	.legend-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
		padding: 0 var(--space-sm) var(--space-xs);
	}

	.legend-scale {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	.swatches {
		display: flex;
		gap: 4px;
	}

	.swatch {
		width: 13px;
		height: 13px;
		border-radius: 3px;
		border: 1px solid transparent;
	}

	@media (max-width: 700px) {
		.heatmap-shell {
			--cell-size: 12px;
			--cell-gap: 3px;
		}
	}
</style>
