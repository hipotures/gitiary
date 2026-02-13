import type {
	ImpactData,
	ImpactDailyRow,
	ImpactLargestCommitRow,
	ImpactRepoRow,
	ImpactSummary,
	ImpactTopDayRow
} from './types.js';

export type ImpactRange = 7 | 30 | 90 | 180 | 360 | 'all';

export interface ImpactView {
	summary: ImpactSummary;
	dailyRows: ImpactDailyRow[];
	topByCommits: ImpactTopDayRow[];
	topByChanges: ImpactTopDayRow[];
	topByFiles: ImpactTopDayRow[];
	largestCommits: ImpactLargestCommitRow[];
	repoRows: ImpactRepoRow[];
}

function startDayForRange(range: ImpactRange, referenceDate: string): string | null {
	if (range === 'all') return null;

	const reference = new Date(`${referenceDate}T00:00:00Z`);
	reference.setUTCDate(reference.getUTCDate() - (range - 1));
	return reference.toISOString().slice(0, 10);
}

function sortTopDays(
	rows: ImpactDailyRow[],
	metric: (row: ImpactDailyRow) => number
): ImpactTopDayRow[] {
	return [...rows]
		.sort((a, b) => metric(b) - metric(a) || a.day.localeCompare(b.day))
		.slice(0, 5)
		.map((row) => ({
			day: row.day,
			commits: row.commits,
			totalChanges: row.totalChanges,
			filesChanged: row.filesChanged
		}));
}

function sortLargestCommits(commits: ImpactLargestCommitRow[]): ImpactLargestCommitRow[] {
	return [...commits]
		.sort((a, b) => b.totalChanges - a.totalChanges || b.committedAt.localeCompare(a.committedAt))
		.slice(0, 10);
}

function calculateTotalDays(firstCommitDate: string | null, lastCommitDate: string | null): number {
	if (!firstCommitDate || !lastCommitDate) return 0;
	const start = new Date(`${firstCommitDate}T00:00:00Z`);
	const end = new Date(`${lastCommitDate}T00:00:00Z`);
	return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

export function buildImpactView(
	data: ImpactData,
	range: ImpactRange,
	referenceDate: string = new Date().toISOString().slice(0, 10)
): ImpactView {
	const startDay = startDayForRange(range, referenceDate);

	const filterByDay = <T extends { day: string }>(rows: T[]): T[] => {
		if (!startDay) return rows;
		return rows.filter((row) => row.day >= startDay);
	};

	const dailyRows: ImpactDailyRow[] = filterByDay(data.daily)
		.map((row) => ({
			...row,
			net: row.additions - row.deletions,
			totalChanges: row.additions + row.deletions
		}))
		.sort((a, b) => a.day.localeCompare(b.day));

	const totalCommits = dailyRows.reduce((sum, row) => sum + row.commits, 0);
	const linesAdded = dailyRows.reduce((sum, row) => sum + row.additions, 0);
	const linesDeleted = dailyRows.reduce((sum, row) => sum + row.deletions, 0);
	const filesChanged = dailyRows.reduce((sum, row) => sum + row.filesChanged, 0);
	const activeDays = dailyRows.filter((row) => row.commits > 0).length;
	const firstCommitDate = dailyRows.length > 0 ? dailyRows[0].day : null;
	const lastCommitDate = dailyRows.length > 0 ? dailyRows[dailyRows.length - 1].day : null;

	const repoRows: ImpactRepoRow[] = data.repos
		.map((item) => {
			const repoDaily = filterByDay(item.daily);
			const commits = repoDaily.reduce((sum, row) => sum + row.commits, 0);
			const additions = repoDaily.reduce((sum, row) => sum + row.additions, 0);
			const deletions = repoDaily.reduce((sum, row) => sum + row.deletions, 0);
			const changedFiles = repoDaily.reduce((sum, row) => sum + row.filesChanged, 0);
			const net = additions - deletions;

			return {
				id: item.repo.id,
				owner: item.repo.owner,
				name: item.repo.name,
				displayName: item.repo.displayName,
				commits,
				additions,
				deletions,
				net,
				filesChanged: changedFiles,
				avgLinesPerCommit: commits > 0 ? (additions + deletions) / commits : 0,
				avgFilesPerCommit: commits > 0 ? changedFiles / commits : 0
			};
		})
		.sort((a, b) => b.net - a.net || a.name.localeCompare(b.name));

	const largestCommitCandidates: ImpactLargestCommitRow[] = data.repos.flatMap((item) => {
		const commits = filterByDay(item.commits);
		return commits.map((commit) => ({
			repoId: item.repo.id,
			owner: item.repo.owner,
			name: item.repo.name,
			displayName: item.repo.displayName,
			sha: commit.sha,
			day: commit.day,
			committedAt: commit.committedAt,
			message: commit.message,
			additions: commit.additions,
			deletions: commit.deletions,
			filesChanged: commit.filesChanged,
			totalChanges: commit.additions + commit.deletions
		}));
	});

	const summary: ImpactSummary = {
		totalCommits,
		firstCommitDate,
		lastCommitDate,
		activeDays,
		totalDays: calculateTotalDays(firstCommitDate, lastCommitDate),
		linesAdded,
		linesDeleted,
		netChange: linesAdded - linesDeleted,
		filesChanged,
		avgLinesPerCommit: totalCommits > 0 ? (linesAdded + linesDeleted) / totalCommits : 0,
		avgFilesPerCommit: totalCommits > 0 ? filesChanged / totalCommits : 0
	};

	return {
		summary,
		dailyRows,
		topByCommits: sortTopDays(dailyRows, (row) => row.commits),
		topByChanges: sortTopDays(dailyRows, (row) => row.totalChanges),
		topByFiles: sortTopDays(dailyRows, (row) => row.filesChanged),
		largestCommits: sortLargestCommits(largestCommitCandidates),
		repoRows
	};
}
