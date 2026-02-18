export interface RepoSummary {
	id: number;
	owner: string;
	name: string;
	displayName: string | null;
	isFork: boolean;
	commits7d: number;
	commits30d: number;
	commits90d: number;
	commits180d: number;
	commits360d: number;
	commitsAll: number;
	lastSyncAt: string | null;
	firstCommitDate: string | null;
}

export interface DailyEntry {
	day: string;
	commits: number;
}

export interface DailyImpactEntry extends DailyEntry {
	additions: number;
	deletions: number;
	filesChanged: number;
}

export interface RepoDetail {
	repo: { id: number; owner: string; name: string; displayName: string | null };
	daily: DailyEntry[];
	firstCommitDate: string | null;
}

export interface ComparisonRepo {
	id: number;
	owner: string;
	name: string;
	displayName: string | null;
	totalCommits: number;
	activeDays: number;
	regularity: number;
	maxGap: number;
	currentStreak: number;
	longestStreak: number;
	firstCommitDate: string | null;
}

export interface ComparisonStats {
	repos: ComparisonRepo[];
	period: '7d' | '30d' | '90d' | '180d' | '360d' | 'all';
}

export interface HeatDailyEntry {
	day: string;
	commits: number;
}

export interface HeatMonthRepoCommits {
	repoId: number;
	owner: string;
	name: string;
	displayName: string | null;
	commits: number;
}

export interface HeatMonthSection {
	month: string; // YYYY-MM
	totalCommits: number;
	repos: HeatMonthRepoCommits[];
}

export interface HeatYearData {
	year: number;
	daily: HeatDailyEntry[];
	months: HeatMonthSection[];
}

export interface ImpactRepoRow {
	id: number;
	owner: string;
	name: string;
	displayName: string | null;
	commits: number;
	additions: number;
	deletions: number;
	net: number;
	filesChanged: number;
	avgLinesPerCommit: number;
	avgFilesPerCommit: number;
}

export interface ImpactSummary {
	totalCommits: number;
	firstCommitDate: string | null;
	lastCommitDate: string | null;
	activeDays: number;
	totalDays: number;
	linesAdded: number;
	linesDeleted: number;
	netChange: number;
	filesChanged: number;
	avgLinesPerCommit: number;
	avgFilesPerCommit: number;
}

export interface ImpactDailyRow extends DailyImpactEntry {
	net: number;
	totalChanges: number;
}

export interface ImpactTopDayRow {
	day: string;
	commits: number;
	totalChanges: number;
	filesChanged: number;
}

export interface ImpactLargestCommitRow {
	repoId: number;
	owner: string;
	name: string;
	displayName: string | null;
	sha: string;
	day: string;
	committedAt: string;
	message: string;
	additions: number;
	deletions: number;
	filesChanged: number;
	totalChanges: number;
}

export interface ImpactData {
	daily: DailyImpactEntry[];
	repos: Array<{
		repo: { id: number; owner: string; name: string; displayName: string | null };
		daily: DailyImpactEntry[];
		commits: Array<{
			sha: string;
			day: string;
			committedAt: string;
			message: string;
			additions: number;
			deletions: number;
			filesChanged: number;
		}>;
	}>;
}
