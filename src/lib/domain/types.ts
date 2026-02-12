export interface RepoSummary {
	id: number;
	owner: string;
	name: string;
	displayName: string | null;
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
